import { Router, type Request, type Response, type NextFunction } from "express";
import { and, eq, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { 
  projects, 
  projectIssues, 
  teams, 
  workspaces, 
  teamTasks, 
  comments,
  projectActivities,
  projectUpdates,
  type ProjectHealth
} from "../db/schema";
import { 
  createProjectSchema,
  updateProjectSchema, 
  createIssueSchema, 
  updateIssueSchema,
  createTaskSchema,
  updateTaskSchema,
  createCommentSchema,
  updateCommentSchema,
  createProjectUpdateSchema,
  updateProjectUpdateSchema
} from "../schemas/project-management.schema";
import { success, failure } from "../lib/response";
import { authMiddleware } from "../middleware/authMiddleware";
import { logActivity } from "../lib/activity-logger";

export const projectsRouter = Router();

// ── Unified Auth Guard ────────────────────────────────────────────────────────
projectsRouter.use(authMiddleware);

/**
 * Helper to normalize payload for projects/issues/tasks.
 * Humans and agents might send 'name' instead of 'title' or 'description' instead of 'descriptionMarkdown'.
 */
function normalizePayload(body: any) {
  const payload = { ...body };
  if (!payload.title && payload.name) payload.title = payload.name;
  if (!payload.descriptionMarkdown && payload.description) payload.descriptionMarkdown = payload.description;
  return payload;
}

/**
 * Validates that the authenticated actor has access to a team.
 */
async function assertHasTeamAccess(req: Request, teamId: string, res: Response): Promise<boolean> {
  const actor = req.actor!;
  
  if (actor.type === "agent") {
    if (actor.teamId !== teamId) {
      res.status(403).json(failure("Agents can only access their own team's data"));
      return false;
    }
    return true;
  }

  // Human: Check workspace ownership
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
    .where(and(eq(workspaces.userId, actor.id), eq(teams.id, teamId)))
    .limit(1);
    
  if (!row) {
    res.status(403).json(failure("Access denied to this team"));
    return false;
  }
  return true;
}

/**
 * Resolves the teamId for a given project, ensuring the actor has access.
 */
async function getProjectTeamId(req: Request, projectId: string): Promise<string | null> {
  const actor = req.actor!;
  
  if (actor.type === "agent") {
    const [row] = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.teamId, actor.teamId!)))
      .limit(1);
    return row?.teamId ?? null;
  }

  // Human: check via workspace
  const [row] = await db
    .select({ teamId: projects.teamId })
    .from(projects)
    .innerJoin(teams, eq(projects.teamId, teams.id))
    .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
    .where(and(eq(workspaces.userId, actor.id), eq(projects.id, projectId)))
    .limit(1);

  return row?.teamId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /projects
 */
projectsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = normalizePayload(req.body);
    const actor = req.actor!;
    
    // For agents, we force the teamId from their token.
    const effectiveTeamId = actor.type === "agent" ? actor.teamId! : String(payload.teamId || "");
    
    if (!effectiveTeamId) {
      res.status(400).json(failure("teamId is required"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, effectiveTeamId, res);
    if (!hasAccess) return;

    const input = createProjectSchema.parse({ ...payload, teamId: effectiveTeamId });

    const [project] = await db
      .insert(projects)
      .values({
        teamId: effectiveTeamId,
        title: input.title,
        shortSummary: input.shortSummary,
        descriptionMarkdown: input.descriptionMarkdown,
        descriptionRichText: input.descriptionRichText,
        startDateKind: input.startAt?.kind,
        startDateValue: input.startAt?.value,
        endDateKind: input.endAt?.kind,
        endDateValue: input.endAt?.value,
        status: input.status,
        priority: input.priority,
        leadId: input.leadId,
        health: input.health,
      })
      .returning();

    await logActivity(
      effectiveTeamId,
      actor.id,
      actor.type,
      "project_created",
      "project",
      project.id,
      { title: project.title }
    );

    res.status(201).json(success(project));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects
 */
projectsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = req.actor!;
    let teamId = String(req.query.teamId || "");

    if (actor.type === "agent") {
      teamId = actor.teamId!;
    }

    if (!teamId) {
      res.status(400).json(failure("teamId query parameter is required for humans"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId))
      .orderBy(desc(projects.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/:id
 */
projectsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const actor = req.actor!;

    let row;
    if (actor.type === "human") {
      [row] = await db
        .select({ project: projects })
        .from(projects)
        .innerJoin(teams, eq(projects.teamId, teams.id))
        .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
        .where(and(eq(workspaces.userId, actor.id), eq(projects.id, projectId)))
        .limit(1);
    } else {
      [row] = await db
        .select({ project: projects })
        .from(projects)
        .where(and(eq(projects.teamId, actor.teamId!), eq(projects.id, projectId)))
        .limit(1);
    }

    if (!row) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    res.json(success(row.project));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /projects/:id
 */
projectsRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const payload = normalizePayload(req.body);
    const input = updateProjectSchema.parse(payload);

    const [updated] = await db
      .update(projects)
      .set({
        title: input.title ? String(input.title) : undefined,
        shortSummary: input.shortSummary !== undefined ? (input.shortSummary ? String(input.shortSummary) : null) : undefined,
        descriptionMarkdown: input.descriptionMarkdown !== undefined ? (input.descriptionMarkdown ? String(input.descriptionMarkdown) : null) : undefined,
        descriptionRichText: input.descriptionRichText !== undefined ? (input.descriptionRichText ?? null) : undefined,
        startDateKind: input.startAt?.kind,
        startDateValue: input.startAt?.value,
        endDateKind: input.endAt?.kind,
        endDateValue: input.endAt?.value,
        status: input.status !== undefined ? Number(input.status) : undefined,
        priority: input.priority !== undefined ? Number(input.priority) : undefined,
        leadId: input.leadId !== undefined ? (input.leadId ? String(input.leadId) : null) : undefined,
        health: input.health,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    await logActivity(
      teamId,
      req.actor!.id,
      req.actor!.type,
      "project_updated",
      "project",
      projectId,
      { title: updated.title, updatedFields: Object.keys(input) }
    );

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /projects/:id
 */
projectsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const [deleted] = await db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning();

    res.json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Issues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /projects/:id/issues
 */
projectsRouter.post("/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const payload = normalizePayload(req.body);
    const input = createIssueSchema.parse({ ...payload, projectId });

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

    await logActivity(
      teamId,
      req.actor!.id,
      req.actor!.type,
      "project_issue_created",
      "project_issue",
      issue.id,
      { title: issue.title }
    );

    res.status(201).json(success(issue));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /projects/:id/issues
 */
projectsRouter.get("/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
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
 * GET /issues/:id
 */
projectsRouter.get("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const actor = req.actor!;

    let row;
    if (actor.type === "human") {
      [row] = await db
        .select({ issue: projectIssues, teamId: projects.teamId })
        .from(projectIssues)
        .innerJoin(projects, eq(projectIssues.projectId, projects.id))
        .innerJoin(teams, eq(projects.teamId, teams.id))
        .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
        .where(and(eq(workspaces.userId, actor.id), eq(projectIssues.id, issueId)))
        .limit(1);
    } else {
      [row] = await db
        .select({ issue: projectIssues, teamId: projects.teamId })
        .from(projectIssues)
        .innerJoin(projects, eq(projectIssues.projectId, projects.id))
        .where(and(eq(projects.teamId, actor.teamId!), eq(projectIssues.id, issueId)))
        .limit(1);
    }

    if (!row) {
      res.status(404).json(failure("Issue not found or access denied"));
      return;
    }

    res.json(success(row.issue));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /issues/:id
 */
projectsRouter.put("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const actor = req.actor!;

    const [row] = await db
      .select({ issue: projectIssues, teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projectIssues.projectId, projects.id))
      .where(eq(projectIssues.id, issueId));

    if (!row) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, row.teamId, res);
    if (!hasAccess) return;

    const payload = normalizePayload(req.body);
    const input = updateIssueSchema.parse(payload);

    const [updated] = await db
      .update(projectIssues)
      .set({
        title: input.title ? String(input.title) : undefined,
        shortSummary: input.shortSummary !== undefined ? (input.shortSummary ? String(input.shortSummary) : null) : undefined,
        descriptionMarkdown: input.descriptionMarkdown !== undefined ? (input.descriptionMarkdown ? String(input.descriptionMarkdown) : null) : undefined,
        descriptionRichText: input.descriptionRichText !== undefined ? (input.descriptionRichText ?? null) : undefined,
        status: input.status !== undefined ? Number(input.status) : undefined,
        priority: input.priority !== undefined ? Number(input.priority) : undefined,
        assignedToId: input.assignedToId !== undefined ? (input.assignedToId ? String(input.assignedToId) : null) : undefined,
        parentIssueId: input.parentIssueId !== undefined ? (input.parentIssueId ? String(input.parentIssueId) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(projectIssues.id, issueId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /issues/:id
 */
projectsRouter.delete("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const [row] = await db
      .select({ teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projectIssues.projectId, projects.id))
      .where(eq(projectIssues.id, issueId));

    if (!row) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, row.teamId, res);
    if (!hasAccess) return;

    await db.delete(projectIssues).where(eq(projectIssues.id, issueId));
    res.json(success({ deleted: true, id: issueId }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Team Tasks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /teams/:id/tasks
 */
projectsRouter.get("/teams/:id/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = String(req.params.id);
    const hasAccess = await assertHasTeamAccess(req, teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.teamId, teamId))
      .orderBy(desc(teamTasks.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks
 */
projectsRouter.post("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = normalizePayload(req.body);
    const actor = req.actor!;
    const effectiveTeamId = actor.type === "agent" ? actor.teamId! : String(payload.teamId || "");

    if (!effectiveTeamId) {
      res.status(400).json(failure("teamId is required"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, effectiveTeamId, res);
    if (!hasAccess) return;

    const input = createTaskSchema.parse({ ...payload, teamId: effectiveTeamId });

    const [task] = await db
      .insert(teamTasks)
      .values({
        teamId: effectiveTeamId,
        parentTaskId: input.parentTaskId,
        title: input.title,
        shortSummary: input.shortSummary,
        descriptionMarkdown: input.descriptionMarkdown,
        descriptionRichText: input.descriptionRichText,
        status: input.status,
        priority: input.priority,
        assignedToId: input.assignedToId,
      })
      .returning();

    await logActivity(
      effectiveTeamId,
      actor.id,
      actor.type,
      "task_created",
      "task",
      task.id,
      { title: task.title }
    );

    res.status(201).json(success(task));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tasks
 */
projectsRouter.get("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = req.actor!;
    let teamId = String(req.query.teamId || "");
    if (actor.type === "agent") teamId = actor.teamId!;

    if (!teamId) {
      res.status(400).json(failure("teamId is required"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.teamId, teamId))
      .orderBy(desc(teamTasks.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tasks/:id
 */
projectsRouter.get("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const actor = req.actor!;

    let row;
    if (actor.type === "human") {
      [row] = await db
        .select({ task: teamTasks })
        .from(teamTasks)
        .innerJoin(teams, eq(teamTasks.teamId, teams.id))
        .innerJoin(workspaces, eq(teams.workspaceId, workspaces.id))
        .where(and(eq(workspaces.userId, actor.id), eq(teamTasks.id, taskId)))
        .limit(1);
    } else {
      [row] = await db
        .select({ task: teamTasks })
        .from(teamTasks)
        .where(and(eq(teamTasks.teamId, actor.teamId!), eq(teamTasks.id, taskId)))
        .limit(1);
    }

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
projectsRouter.put("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const actor = req.actor!;

    const [existing] = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.id, taskId));

    if (!existing) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, existing.teamId, res);
    if (!hasAccess) return;

    const payload = normalizePayload(req.body);
    const input = updateTaskSchema.parse(payload);

    const [updated] = await db
      .update(teamTasks)
      .set({
        title: input.title ? String(input.title) : undefined,
        shortSummary: input.shortSummary !== undefined ? (input.shortSummary ? String(input.shortSummary) : null) : undefined,
        descriptionMarkdown: input.descriptionMarkdown !== undefined ? (input.descriptionMarkdown ? String(input.descriptionMarkdown) : null) : undefined,
        descriptionRichText: input.descriptionRichText !== undefined ? (input.descriptionRichText ?? null) : undefined,
        status: input.status !== undefined ? Number(input.status) : undefined,
        priority: input.priority !== undefined ? Number(input.priority) : undefined,
        assignedToId: input.assignedToId !== undefined ? (input.assignedToId ? String(input.assignedToId) : null) : undefined,
        parentTaskId: input.parentTaskId !== undefined ? (input.parentTaskId ? String(input.parentTaskId) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(teamTasks.id, taskId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/:id
 */
projectsRouter.delete("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const [existing] = await db.select().from(teamTasks).where(eq(teamTasks.id, taskId)).limit(1);
    if (!existing) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, existing.teamId, res);
    if (!hasAccess) return;

    await db.delete(teamTasks).where(eq(teamTasks.id, taskId));
    res.json(success({ deleted: true, id: taskId }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Feed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /activities
 */
projectsRouter.get("/activities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = req.actor!;
    let teamId = String(req.query.teamId || "");
    if (actor.type === "agent") teamId = actor.teamId!;

    if (!teamId) {
      res.status(400).json(failure("teamId is required"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.teamId, teamId))
      .orderBy(desc(projectActivities.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/comments
 */
projectsRouter.get("/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.projectId, projectId))
      .orderBy(comments.createdAt);

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /projects/:id/comments
 */
projectsRouter.post("/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const teamId = await getProjectTeamId(req, projectId);
    if (!teamId) {
      res.status(404).json(failure("Project not found or access denied"));
      return;
    }

    const input = createCommentSchema.parse(req.body);

    const [comment] = await db
      .insert(comments)
      .values({
        teamId,
        projectId,
        actorId: req.actor!.id,
        actorType: req.actor!.type,
        content: input.content,
      })
      .returning();

    res.status(201).json(success(comment));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /issues/:id/comments
 */
projectsRouter.get("/issues/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const [row] = await db
      .select({ teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projectIssues.projectId, projects.id))
      .where(eq(projectIssues.id, issueId));

    if (!row) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, row.teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.projectIssueId, issueId))
      .orderBy(comments.createdAt);

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /issues/:id/comments
 */
projectsRouter.post("/issues/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueId = String(req.params.id);
    const [row] = await db
      .select({ teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projectIssues.projectId, projects.id))
      .where(eq(projectIssues.id, issueId));

    if (!row) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, row.teamId, res);
    if (!hasAccess) return;

    const input = createCommentSchema.parse(req.body);

    const [comment] = await db
      .insert(comments)
      .values({
        teamId: row.teamId,
        projectIssueId: issueId,
        actorId: req.actor!.id,
        actorType: req.actor!.type,
        content: input.content,
      })
      .returning();

    res.status(201).json(success(comment));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tasks/:id/comments
 */
projectsRouter.get("/tasks/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const [task] = await db.select().from(teamTasks).where(eq(teamTasks.id, taskId));

    if (!task) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, task.teamId, res);
    if (!hasAccess) return;

    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.teamTaskId, taskId))
      .orderBy(comments.createdAt);

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks/:id/comments
 */
projectsRouter.post("/tasks/:id/comments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = String(req.params.id);
    const [task] = await db.select().from(teamTasks).where(eq(teamTasks.id, taskId));

    if (!task) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, task.teamId, res);
    if (!hasAccess) return;

    const input = createCommentSchema.parse(req.body);

    const [comment] = await db
      .insert(comments)
      .values({
        teamId: task.teamId,
        teamTaskId: taskId,
        actorId: req.actor!.id,
        actorType: req.actor!.type,
        content: input.content,
      })
      .returning();

    res.status(201).json(success(comment));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /comments/:id
 */
projectsRouter.put("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = String(req.params.id);
    const actor = req.actor!;

    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.actorId, actor.id), eq(comments.actorType, actor.type)));

    if (!existing) {
      res.status(404).json(failure("Comment not found or access denied"));
      return;
    }

    const input = updateCommentSchema.parse(req.body);

    const [updated] = await db
      .update(comments)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /comments/:id
 */
projectsRouter.delete("/comments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = String(req.params.id);
    const actor = req.actor!;

    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.actorId, actor.id), eq(comments.actorType, actor.type)));

    if (!existing) {
      res.status(404).json(failure("Comment not found or access denied"));
      return;
    }

    await db.delete(comments).where(eq(comments.id, commentId));
    res.json(success({ deleted: true, id: commentId }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Health Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /projects/:id/updates
 */
projectsRouter.post("/:id/updates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.params.id);
    const actor = req.actor!;
    
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const hasAccess = await assertHasTeamAccess(req, project.teamId, res);
    if (!hasAccess) return;

    const input = createProjectUpdateSchema.parse({ ...req.body, projectId });

    const [update] = await db
      .insert(projectUpdates)
      .values({
        projectId,
        happenedAt: input.happenedAt ?? new Date(),
        oldHealth: project.health as ProjectHealth,
        newHealth: input.newHealth as ProjectHealth,
        reason: input.reason,
      })
      .returning();

    await db.update(projects).set({ health: input.newHealth as ProjectHealth, updatedAt: new Date() }).where(eq(projects.id, projectId));

    await logActivity(
      project.teamId,
      actor.id,
      actor.type,
      "project_updated",
      "update",
      update.id,
      { oldHealth: update.oldHealth, newHealth: update.newHealth }
    );

    res.status(201).json(success(update));
  } catch (err) {
    next(err);
  }
});
