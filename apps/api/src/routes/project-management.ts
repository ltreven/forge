import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  agents,
  projects,
  projectUpdates,
  projectIssues,
  projectActivities,
  teamTasks,
  type ProjectHealth,
} from "../db/schema";
import {
  createIssueSchema,
  createProjectSchema,
  createProjectUpdateSchema,
  updateIssueSchema,
  updateProjectSchema,
  updateProjectUpdateSchema,
  createTaskSchema,
  updateTaskSchema,
} from "../schemas/project-management.schema";
import { failure, success } from "../lib/response";
import { agentAuthMiddleware } from "../middleware/agentAuthMiddleware";

export const projectManagementRouter = Router();

// All project-management routes require agent authentication.
// req.agent.teamId is the authoritative scope — callers cannot override it.
projectManagementRouter.use(agentAuthMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

type ActivityEntityType = "project" | "issue" | "update";
type ActivityAction = "created" | "updated" | "deleted";

async function trackActivity(params: {
  teamId: string;
  projectId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(projectActivities).values({
    teamId: params.teamId,
    projectId: params.projectId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    payload: params.payload ?? null,
  });
}

/**
 * Validates that an agent UUID belongs to the authenticated agent's team.
 * Used for lead_id and assigned_to_id fields to prevent cross-team references.
 */
async function assertAgentBelongsToTeam(
  agentId: string,
  teamId: string,
  res: Response,
  fieldName: string,
): Promise<boolean> {
  const [member] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.teamId, teamId)))
    .limit(1);

  if (!member) {
    res.status(400).json(failure(`${fieldName} must be an agent belonging to your team`));
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /project-management/projects
 * Creates a project scoped to the authenticated agent's team.
 * The teamId from the token is used — any teamId in the request body is ignored.
 */
projectManagementRouter.post("/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Inject teamId from token so the schema validation passes
    const input = createProjectSchema.parse({ ...req.body, teamId: req.agent!.teamId });

    // Validate leadId belongs to the same team
    if (input.leadId) {
      const ok = await assertAgentBelongsToTeam(input.leadId, req.agent!.teamId, res, "leadId");
      if (!ok) return;
    }

    const [project] = await db
      .insert(projects)
      .values({
        teamId: req.agent!.teamId,
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

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      action: "created",
    });

    res.status(201).json(success(project));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/projects
 * Lists all projects for the authenticated agent's team.
 */
projectManagementRouter.get("/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, req.agent!.teamId))
      .orderBy(desc(projects.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/projects/:id
 * Returns a project, enforcing team ownership.
 */
projectManagementRouter.get("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    res.json(success(project));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /project-management/projects/:id
 */
projectManagementRouter.put("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!existing) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const input = updateProjectSchema.parse(req.body);

    if (input.leadId) {
      const ok = await assertAgentBelongsToTeam(input.leadId, req.agent!.teamId, res, "leadId");
      if (!ok) return;
    }

    const [project] = await db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, existing.id))
      .returning();

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      action: "updated",
      payload: { updatedFields: Object.keys(input) },
    });

    res.json(success(project));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /project-management/projects/:id
 */
projectManagementRouter.delete("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!existing) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    // Activity is cascade-deleted with the project; record before deletion for audit.
    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: existing.id,
      entityType: "project",
      entityId: existing.id,
      action: "deleted",
    });

    await db.delete(projects).where(eq(projects.id, existing.id));

    res.json(success({ deleted: true, id: existing.id }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Updates (health updates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /project-management/projects/:id/updates
 */
projectManagementRouter.post("/projects/:id/updates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const input = createProjectUpdateSchema.parse({ ...req.body, projectId: project.id });

    const [update] = await db
      .insert(projectUpdates)
      .values({
        projectId: project.id,
        happenedAt: input.happenedAt ?? new Date(),
        oldHealth: project.health as ProjectHealth,
        newHealth: input.newHealth as ProjectHealth,
        reason: input.reason,
      })
      .returning();

    // Reflect the new health on the project itself
    await db
      .update(projects)
      .set({ health: input.newHealth as ProjectHealth, updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: project.id,
      entityType: "update",
      entityId: update.id,
      action: "created",
      payload: { oldHealth: update.oldHealth, newHealth: update.newHealth },
    });

    res.status(201).json(success(update));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/projects/:id/updates
 */
projectManagementRouter.get("/projects/:id/updates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify team ownership before returning updates
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const rows = await db
      .select()
      .from(projectUpdates)
      .where(eq(projectUpdates.projectId, project.id))
      .orderBy(desc(projectUpdates.happenedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /project-management/updates/:id
 */
projectManagementRouter.put("/updates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Join with project to enforce team ownership
    const [existing] = await db
      .select({ u: projectUpdates, teamId: projects.teamId })
      .from(projectUpdates)
      .innerJoin(projects, eq(projects.id, projectUpdates.projectId))
      .where(eq(projectUpdates.id, String(req.params.id)));

    if (!existing || existing.teamId !== req.agent!.teamId) {
      res.status(404).json(failure("Project update not found"));
      return;
    }

    const input = updateProjectUpdateSchema.parse(req.body);

    const [updated] = await db
      .update(projectUpdates)
      .set({ ...input })
      .where(eq(projectUpdates.id, existing.u.id))
      .returning();

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: existing.u.projectId,
      entityType: "update",
      entityId: updated.id,
      action: "updated",
      payload: { updatedFields: Object.keys(input) },
    });

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /project-management/updates/:id
 */
projectManagementRouter.delete("/updates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db
      .select({ u: projectUpdates, teamId: projects.teamId })
      .from(projectUpdates)
      .innerJoin(projects, eq(projects.id, projectUpdates.projectId))
      .where(eq(projectUpdates.id, String(req.params.id)));

    if (!existing || existing.teamId !== req.agent!.teamId) {
      res.status(404).json(failure("Project update not found"));
      return;
    }

    await db.delete(projectUpdates).where(eq(projectUpdates.id, existing.u.id));

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: existing.u.projectId,
      entityType: "update",
      entityId: existing.u.id,
      action: "deleted",
    });

    res.json(success({ deleted: true, id: existing.u.id }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Issues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /project-management/projects/:id/issues
 */
projectManagementRouter.post("/projects/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const input = createIssueSchema.parse({ ...req.body, projectId: project.id });

    if (input.parentIssueId) {
      const [parentIssue] = await db
        .select()
        .from(projectIssues)
        .where(and(eq(projectIssues.id, input.parentIssueId), eq(projectIssues.projectId, project.id)));

      if (!parentIssue) {
        res.status(400).json(failure("Parent issue must belong to the same project"));
        return;
      }
    }

    if (input.assignedToId) {
      const ok = await assertAgentBelongsToTeam(input.assignedToId, req.agent!.teamId, res, "assignedToId");
      if (!ok) return;
    }

    const [issue] = await db
      .insert(projectIssues)
      .values({
        projectId: project.id,
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

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: project.id,
      entityType: "issue",
      entityId: issue.id,
      action: "created",
      payload: { parentIssueId: issue.parentIssueId },
    });

    res.status(201).json(success(issue));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/projects/:id/issues
 */
projectManagementRouter.get("/projects/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, String(req.params.id)), eq(projects.teamId, req.agent!.teamId)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const rows = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.projectId, project.id))
      .orderBy(desc(projectIssues.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/issues/:id
 * Returns a single project issue, enforcing team ownership via the parent project.
 */
projectManagementRouter.get("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [row] = await db
      .select({ issue: projectIssues, teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projects.id, projectIssues.projectId))
      .where(eq(projectIssues.id, String(req.params.id)));

    if (!row || row.teamId !== req.agent!.teamId) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    res.json(success(row.issue));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /project-management/issues/:id
 */
projectManagementRouter.put("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [row] = await db
      .select({ issue: projectIssues, teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projects.id, projectIssues.projectId))
      .where(eq(projectIssues.id, String(req.params.id)));

    if (!row || row.teamId !== req.agent!.teamId) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const input = updateIssueSchema.parse(req.body);

    if (input.parentIssueId) {
      if (input.parentIssueId === row.issue.id) {
        res.status(400).json(failure("Issue cannot be parent of itself"));
        return;
      }
      const [parentIssue] = await db
        .select()
        .from(projectIssues)
        .where(and(eq(projectIssues.id, input.parentIssueId), eq(projectIssues.projectId, row.issue.projectId)));

      if (!parentIssue) {
        res.status(400).json(failure("Parent issue must belong to the same project"));
        return;
      }
    }

    if (input.assignedToId) {
      const ok = await assertAgentBelongsToTeam(input.assignedToId, req.agent!.teamId, res, "assignedToId");
      if (!ok) return;
    }

    const [issue] = await db
      .update(projectIssues)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projectIssues.id, row.issue.id))
      .returning();

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: row.issue.projectId,
      entityType: "issue",
      entityId: issue.id,
      action: "updated",
      payload: { updatedFields: Object.keys(input) },
    });

    res.json(success(issue));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /project-management/issues/:id
 */
projectManagementRouter.delete("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [row] = await db
      .select({ issue: projectIssues, teamId: projects.teamId })
      .from(projectIssues)
      .innerJoin(projects, eq(projects.id, projectIssues.projectId))
      .where(eq(projectIssues.id, String(req.params.id)));

    if (!row || row.teamId !== req.agent!.teamId) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    await trackActivity({
      teamId: req.agent!.teamId,
      projectId: row.issue.projectId,
      entityType: "issue",
      entityId: row.issue.id,
      action: "deleted",
    });

    await db.delete(projectIssues).where(eq(projectIssues.id, row.issue.id));

    res.json(success({ deleted: true, id: row.issue.id }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Team Tasks (standalone kanban, not linked to projects)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /project-management/tasks
 * Creates a kanban task scoped to the authenticated agent's team.
 */
projectManagementRouter.post("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTaskSchema.parse({ ...req.body, teamId: req.agent!.teamId });

    if (input.parentTaskId) {
      const [parentTask] = await db
        .select()
        .from(teamTasks)
        .where(and(eq(teamTasks.id, input.parentTaskId), eq(teamTasks.teamId, req.agent!.teamId)));

      if (!parentTask) {
        res.status(400).json(failure("Parent task must belong to your team"));
        return;
      }
    }

    if (input.assignedToId) {
      const ok = await assertAgentBelongsToTeam(input.assignedToId, req.agent!.teamId, res, "assignedToId");
      if (!ok) return;
    }

    const [task] = await db
      .insert(teamTasks)
      .values({
        teamId: req.agent!.teamId,
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

    res.status(201).json(success(task));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/tasks
 * Lists all team tasks for the authenticated agent's team.
 */
projectManagementRouter.get("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.teamId, req.agent!.teamId))
      .orderBy(desc(teamTasks.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /project-management/tasks/:id
 */
projectManagementRouter.get("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [task] = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, String(req.params.id)), eq(teamTasks.teamId, req.agent!.teamId)));

    if (!task) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    res.json(success(task));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /project-management/tasks/:id
 */
projectManagementRouter.put("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, String(req.params.id)), eq(teamTasks.teamId, req.agent!.teamId)));

    if (!existing) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const input = updateTaskSchema.parse(req.body);

    if (input.parentTaskId) {
      if (input.parentTaskId === existing.id) {
        res.status(400).json(failure("Task cannot be its own parent"));
        return;
      }
      const [parentTask] = await db
        .select()
        .from(teamTasks)
        .where(and(eq(teamTasks.id, input.parentTaskId), eq(teamTasks.teamId, req.agent!.teamId)));

      if (!parentTask) {
        res.status(400).json(failure("Parent task must belong to your team"));
        return;
      }
    }

    if (input.assignedToId) {
      const ok = await assertAgentBelongsToTeam(input.assignedToId, req.agent!.teamId, res, "assignedToId");
      if (!ok) return;
    }

    const [task] = await db
      .update(teamTasks)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(teamTasks.id, existing.id))
      .returning();

    res.json(success(task));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /project-management/tasks/:id
 */
projectManagementRouter.delete("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing] = await db
      .select()
      .from(teamTasks)
      .where(and(eq(teamTasks.id, String(req.params.id)), eq(teamTasks.teamId, req.agent!.teamId)));

    if (!existing) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    await db.delete(teamTasks).where(eq(teamTasks.id, existing.id));

    res.json(success({ deleted: true, id: existing.id }));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Feed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /project-management/activities
 * Returns the project activity feed for the authenticated agent's team.
 */
projectManagementRouter.get("/activities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.teamId, req.agent!.teamId))
      .orderBy(desc(projectActivities.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});
