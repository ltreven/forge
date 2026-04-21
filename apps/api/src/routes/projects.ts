import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { projects, projectIssues, teams, workspaces } from "../db/schema";
import { 
  updateProjectSchema, 
  createIssueSchema, 
  updateIssueSchema 
} from "../schemas/project-management.schema";
import { success, failure } from "../lib/response";
import { authMiddleware } from "../middleware/authMiddleware";

export const projectsRouter = Router();

/**
 * Validates that the authenticated user has access to a team.
 */
async function assertUserHasTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
    .where(and(eq(workspaces.userId, userId), eq(teams.id, teamId)))
    .limit(1);
  return !!row;
}

/**
 * Validates that the authenticated user has access to a project via its team/workspace.
 */
async function assertUserHasProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(teams, eq(projects.teamId, teams.id))
    .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
    .where(and(eq(workspaces.userId, userId), eq(projects.id, projectId)))
    .limit(1);
  return !!row;
}

// ── Projects ─────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id
 */
projectsRouter.get("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.userId;

    const [project] = await db
      .select()
      .from(projects)
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(projects.id, projectId)));

    if (!project) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    res.json(success(project.projects));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /projects/:id
 */
projectsRouter.put("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.userId;

    const hasAccess = await assertUserHasProjectAccess(userId, projectId);
    if (!hasAccess) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const input = updateProjectSchema.parse(req.body);

    const [updated] = await db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

// ── Project Issues ───────────────────────────────────────────────────────────

/**
 * GET /projects/:id/issues
 */
projectsRouter.get("/:id/issues", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.userId;

    const hasAccess = await assertUserHasProjectAccess(userId, projectId);
    if (!hasAccess) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const rows = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.projectId, projectId))
      .orderBy(desc(projectIssues.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/:id/issues
 */
projectsRouter.post("/:id/issues", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = req.user!.userId;

    const hasAccess = await assertUserHasProjectAccess(userId, projectId);
    if (!hasAccess) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const input = createIssueSchema.parse({ ...req.body, projectId });

    const [issue] = await db
      .insert(projectIssues)
      .values({
        projectId,
        parentIssueId: input.parentIssueId,
        title: input.title,
        shortSummary: input.shortSummary,
        descriptionMarkdown: input.descriptionMarkdown,
        descriptionRichText: input.descriptionRichText,
        status: input.status,
        priority: input.priority,
        assignedToId: input.assignedToId,
      })
      .returning();

    res.status(201).json(success(issue));
  } catch (err) {
    next(err);
  }
});

// ── Global Issue Operations ──────────────────────────────────────────────────

/**
 * PUT /issues/:id
 */
projectsRouter.put("/issues/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = req.params.id;
    const userId = req.user!.userId;

    // Join to verify ownership
    const [row] = await db
      .select({ issue: projectIssues })
      .from(projectIssues)
      .innerJoin(projects, eq(projectIssues.projectId, projects.id))
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(projectIssues.id, issueId)));

    if (!row) {
      res.status(404).json(failure("Issue not found or access denied"));
      return;
    }

    const input = updateIssueSchema.parse(req.body);

    const [updated] = await db
      .update(projectIssues)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projectIssues.id, issueId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});
