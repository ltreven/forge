import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { projects, projectIssues, teams, workspaces, teamTasks } from "../db/schema";
import { 
  updateProjectSchema, 
  createIssueSchema, 
  updateIssueSchema,
  createTaskSchema,
  updateTaskSchema
} from "../schemas/project-management.schema";
import { success, failure } from "../lib/response";
import { authMiddleware } from "../middleware/authMiddleware";

export const projectsRouter = Router();

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
    const projectId = String(req.params.id);
    const userId = req.user!.userId;

    const [row] = await db
      .select()
      .from(projects)
      .innerJoin(teams, eq(projects.teamId, teams.id))
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(projects.id, projectId)));

    if (!row) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    res.json(success(row.projects));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /projects/:id
 */
projectsRouter.put("/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
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
    const projectId = String(req.params.id);
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
    const projectId = String(req.params.id);
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
        projectId: String(input.projectId),
        parentIssueId: input.parentIssueId ? String(input.parentIssueId) : null,
        title: String(input.title),
        shortSummary: input.shortSummary ? String(input.shortSummary) : null,
        descriptionMarkdown: input.descriptionMarkdown ? String(input.descriptionMarkdown) : null,
        descriptionRichText: input.descriptionRichText ?? null,
        status: Number(input.status ?? 0),
        priority: Number(input.priority ?? 0),
        assignedToId: input.assignedToId ? String(input.assignedToId) : null,
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
    const issueId = String(req.params.id);
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

/**
 * GET /issues/:id
 */
projectsRouter.get("/issues/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const userId = req.user!.userId;

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

    res.json(success(row.issue));
  } catch (err) {
    next(err);
  }
});

// ── Team Task Operations (Human) ─────────────────────────────────────────────

/**
 * GET /tasks/:id
 */
projectsRouter.get("/tasks/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const userId = req.user!.userId;

    const [row] = await db
      .select({ task: teamTasks })
      .from(teamTasks)
      .innerJoin(teams, eq(teamTasks.teamId, teams.id))
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(teamTasks.id, taskId)));

    if (!row) {
      res.status(404).json(failure("Task not found or access denied"));
      return;
    }

    res.json(success(row.task));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /tasks/:id
 */
projectsRouter.put("/tasks/:id", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const userId = req.user!.userId;

    const [row] = await db
      .select({ id: teamTasks.id })
      .from(teamTasks)
      .innerJoin(teams, eq(teamTasks.teamId, teams.id))
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(teamTasks.id, taskId)));

    if (!row) {
      res.status(404).json(failure("Task not found or access denied"));
      return;
    }

    const input = updateTaskSchema.parse(req.body);

    const [updated] = await db
      .update(teamTasks)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(teamTasks.id, taskId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks
 */
projectsRouter.post("/tasks", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const input = createTaskSchema.parse(req.body);

    const hasAccess = await db
      .select({ id: teams.id })
      .from(teams)
      .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
      .where(and(eq(workspaces.userId, userId), eq(teams.id, input.teamId)))
      .limit(1);

    if (hasAccess.length === 0) {
      res.status(403).json(failure("Access denied to this team"));
      return;
    }

    const [task] = await db
      .insert(teamTasks)
      .values({
        teamId: input.teamId,
        parentTaskId: input.parentTaskId ? String(input.parentTaskId) : null,
        title: String(input.title),
        shortSummary: input.shortSummary ? String(input.shortSummary) : null,
        descriptionMarkdown: input.descriptionMarkdown ? String(input.descriptionMarkdown) : null,
        descriptionRichText: input.descriptionRichText ?? null,
        status: Number(input.status ?? 0),
        priority: Number(input.priority ?? 0),
        assignedToId: input.assignedToId ? String(input.assignedToId) : null,
      })
      .returning();

    res.status(201).json(success(task));
  } catch (err) {
    next(err);
  }
});
