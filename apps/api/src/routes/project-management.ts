import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  teams,
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
import { authMiddleware } from "../middleware/authMiddleware";

export const projectManagementRouter = Router();
projectManagementRouter.use(authMiddleware);

type ActivityEntityType = "project" | "issue" | "update";
type ActivityAction = "created" | "updated" | "deleted";

async function trackActivity(params: {
  teamId: string;
  projectId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  payload?: Record<string, unknown>;
}) {
  await db.insert(projectActivities).values({
    teamId: params.teamId,
    projectId: params.projectId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    payload: params.payload ?? null,
  });
}

projectManagementRouter.post("/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createProjectSchema.parse(req.body);

    const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId));
    if (!team) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    const [project] = await db
      .insert(projects)
      .values({
        teamId: input.teamId,
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
      teamId: input.teamId,
      projectId: project.id,
      entityType: "project",
      entityId: project.id,
      action: "created",
      payload: { title: project.title },
    });

    res.status(201).json(success(project));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.get("/teams/:teamId/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, String(req.params.teamId)))
      .orderBy(desc(projects.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.get("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, String(req.params.id)));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    res.json(success(project));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.put("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProjectSchema.parse(req.body);
    const [existing] = await db.select().from(projects).where(eq(projects.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const { startAt, endAt, ...rest } = input;
    const [project] = await db
      .update(projects)
      .set({
        ...rest,
        startDateKind: startAt?.kind,
        startDateValue: startAt?.value,
        endDateKind: endAt?.kind,
        endDateValue: endAt?.value,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id))
      .returning();

    await trackActivity({
      teamId: existing.teamId,
      projectId: existing.id,
      entityType: "project",
      entityId: existing.id,
      action: "updated",
      payload: { updatedFields: Object.keys(input) },
    });

    res.json(success(project));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.delete("/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db.delete(projects).where(eq(projects.id, String(req.params.id))).returning();

    if (!deleted) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    await trackActivity({
      teamId: deleted.teamId,
      projectId: deleted.id,
      entityType: "project",
      entityId: deleted.id,
      action: "deleted",
    });

    res.json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.post("/projects/:id/updates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createProjectUpdateSchema.parse({ ...req.body, projectId: req.params.id });

    const [project] = await db.select().from(projects).where(eq(projects.id, body.projectId));
    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    const [update] = await db.transaction(async (tx) => {
      const [newUpdate] = await tx
        .insert(projectUpdates)
        .values({
          projectId: body.projectId,
          happenedAt: body.happenedAt ?? new Date(),
          oldHealth: project.health,
          newHealth: body.newHealth,
          reason: body.reason,
        })
        .returning();

      await tx
        .update(projects)
        .set({ health: body.newHealth as ProjectHealth, updatedAt: new Date() })
        .where(eq(projects.id, project.id));

      return [newUpdate];
    });

    await trackActivity({
      teamId: project.teamId,
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

projectManagementRouter.get("/projects/:id/updates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projectUpdates)
      .where(eq(projectUpdates.projectId, String(req.params.id)))
      .orderBy(desc(projectUpdates.happenedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.put("/updates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProjectUpdateSchema.parse(req.body);
    const [existing] = await db.select().from(projectUpdates).where(eq(projectUpdates.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json(failure("Update not found"));
      return;
    }

    const [updated] = await db.transaction(async (tx) => {
      const [res] = await tx
        .update(projectUpdates)
        .set({
          happenedAt: input.happenedAt ?? existing.happenedAt,
          newHealth: input.newHealth ?? existing.newHealth,
          reason: input.reason ?? existing.reason,
        })
        .where(eq(projectUpdates.id, existing.id))
        .returning();

      if (input.newHealth) {
        await tx
          .update(projects)
          .set({ health: input.newHealth as ProjectHealth, updatedAt: new Date() })
          .where(eq(projects.id, existing.projectId));
      }

      return [res];
    });

    const [project] = await db.select().from(projects).where(eq(projects.id, existing.projectId));
    if (project) {
      await trackActivity({
        teamId: project.teamId,
        projectId: project.id,
        entityType: "update",
        entityId: updated.id,
        action: "updated",
      });
    }

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.delete("/updates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db.delete(projectUpdates).where(eq(projectUpdates.id, String(req.params.id))).returning();

    if (!deleted) {
      res.status(404).json(failure("Update not found"));
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, deleted.projectId));
    if (project) {
      await trackActivity({
        teamId: project.teamId,
        projectId: project.id,
        entityType: "update",
        entityId: deleted.id,
        action: "deleted",
      });
    }

    res.json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.post("/projects/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createIssueSchema.parse({ ...req.body, projectId: req.params.id });
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));

    if (!project) {
      res.status(404).json(failure("Project not found"));
      return;
    }

    if (input.parentIssueId) {
      const [parentIssue] = await db
        .select()
        .from(projectIssues)
        .where(and(eq(projectIssues.id, input.parentIssueId), eq(projectIssues.projectId, input.projectId)));

      if (!parentIssue) {
        res.status(400).json(failure("Parent issue must belong to the same project"));
        return;
      }
    }

    const [issue] = await db
      .insert(projectIssues)
      .values({
        projectId: input.projectId,
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
      teamId: project.teamId,
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

projectManagementRouter.get("/projects/:id/issues", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projectIssues)
      .where(eq(projectIssues.projectId, String(req.params.id)))
      .orderBy(desc(projectIssues.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.put("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateIssueSchema.parse(req.body);
    const [existing] = await db.select().from(projectIssues).where(eq(projectIssues.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    if (input.parentIssueId) {
      if (input.parentIssueId === existing.id) {
        res.status(400).json(failure("Issue cannot be parent of itself"));
        return;
      }

      const [parentIssue] = await db
        .select()
        .from(projectIssues)
        .where(and(eq(projectIssues.id, input.parentIssueId), eq(projectIssues.projectId, existing.projectId)));
      if (!parentIssue) {
        res.status(400).json(failure("Parent issue must belong to the same project"));
        return;
      }
    }

    const [issue] = await db
      .update(projectIssues)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projectIssues.id, existing.id))
      .returning();

    const [project] = await db.select().from(projects).where(eq(projects.id, issue.projectId));
    if (project) {
      await trackActivity({
        teamId: project.teamId,
        projectId: project.id,
        entityType: "issue",
        entityId: issue.id,
        action: "updated",
        payload: { updatedFields: Object.keys(input) },
      });
    }

    res.json(success(issue));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.delete("/issues/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db.delete(projectIssues).where(eq(projectIssues.id, String(req.params.id))).returning();

    if (!deleted) {
      res.status(404).json(failure("Issue not found"));
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, deleted.projectId));
    if (project) {
      await trackActivity({
        teamId: project.teamId,
        projectId: project.id,
        entityType: "issue",
        entityId: deleted.id,
        action: "deleted",
      });
    }

    res.json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.post("/teams/:teamId/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTaskSchema.parse({ ...req.body, teamId: req.params.teamId });
    const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId));

    if (!team) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    if (input.parentTaskId) {
      const [parentTask] = await db
        .select()
        .from(teamTasks)
        .where(and(eq(teamTasks.id, input.parentTaskId), eq(teamTasks.teamId, input.teamId)));
      if (!parentTask) {
        res.status(400).json(failure("Parent task must belong to the same team"));
        return;
      }
    }

    const [task] = await db
      .insert(teamTasks)
      .values({
        teamId: input.teamId,
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

projectManagementRouter.get("/teams/:teamId/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(teamTasks)
      .where(eq(teamTasks.teamId, String(req.params.teamId)))
      .orderBy(desc(teamTasks.updatedAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.get("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [task] = await db.select().from(teamTasks).where(eq(teamTasks.id, String(req.params.id)));
    if (!task) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    res.json(success(task));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.put("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateTaskSchema.parse(req.body);
    const [existing] = await db.select().from(teamTasks).where(eq(teamTasks.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    if (input.parentTaskId) {
      if (input.parentTaskId === existing.id) {
        res.status(400).json(failure("Task cannot be parent of itself"));
        return;
      }

      const [parentTask] = await db
        .select()
        .from(teamTasks)
        .where(and(eq(teamTasks.id, input.parentTaskId), eq(teamTasks.teamId, existing.teamId)));
      if (!parentTask) {
        res.status(400).json(failure("Parent task must belong to the same team"));
        return;
      }
    }

    const [task] = await db
      .update(teamTasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(teamTasks.id, existing.id))
      .returning();

    res.json(success(task));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.delete("/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db.delete(teamTasks).where(eq(teamTasks.id, String(req.params.id))).returning();
    if (!deleted) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    res.json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});

projectManagementRouter.get("/teams/:teamId/activities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.teamId, String(req.params.teamId)))
      .orderBy(desc(projectActivities.createdAt));

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});
