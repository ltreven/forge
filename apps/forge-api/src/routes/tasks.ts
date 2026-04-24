import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import { tasks, taskTypes, labels, taskLabels, comments, workspaces, teams, teamActivities } from "../db/schema";
import { success, failure } from "../lib/response";
import { authMiddleware } from "../middleware/authMiddleware";
import { createTaskSchema, updateTaskSchema, createCommentSchema, updateCommentSchema } from "../schemas/task-management.schema";
import { z } from "zod";

export const tasksRouter = Router();

// Helper to determine if a string is a UUID
const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

// ── GET /tasks/by-team/:teamId ───────────────────────────────────────────────

tasksRouter.get("/by-team/:teamId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.teamId, String(req.params.teamId)))
      .orderBy(desc(tasks.createdAt));
    
    // We might want to include labels and types, let's keep it simple for now or fetch them.
    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

export async function createTaskInternal(input: any, actor: { id: string, type: "human" | "agent" }) {
  return await db.transaction(async (tx) => {
    // Get the team to find the identifier prefix
    const [team] = await tx.select({ identifierPrefix: teams.identifierPrefix }).from(teams).where(eq(teams.id, input.teamId));
    if (!team) {
      throw new Error("Team not found");
    }

    // If no taskTypeId is provided, find the default one for the team
    let taskTypeId = input.taskTypeId;
    if (!taskTypeId) {
      const [defaultType] = await tx.select().from(taskTypes).where(and(eq(taskTypes.teamId, input.teamId), eq(taskTypes.isDefault, true))).limit(1);
      if (defaultType) {
        taskTypeId = defaultType.id;
      } else {
        // fallback to any
        const [anyType] = await tx.select().from(taskTypes).where(eq(taskTypes.teamId, input.teamId)).limit(1);
        if (anyType) taskTypeId = anyType.id;
      }
    }

    // Generate the next number for this team
    // To prevent race conditions, we can use a query that locks the max or inserts and returns
    const nextNumResult = await tx.execute(sql`
      SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM ${tasks} WHERE team_id = ${input.teamId}
    `);
    const nextNumber = Number((nextNumResult.rows[0] as any).next_number);
    const identifier = `${team.identifierPrefix}-${nextNumber}`;

    const [task] = await tx
      .insert(tasks)
      .values({
        teamId: input.teamId,
        parentTaskId: input.parentTaskId,
        taskTypeId,
        number: nextNumber,
        identifier,
        title: input.title,
        shortSummary: input.shortSummary,
        descriptionMarkdown: input.descriptionMarkdown,
        descriptionRichText: input.descriptionRichText,
        status: input.status,
        priority: input.priority,
        assignedToId: input.assignedToId,
      })
      .returning();

    // Insert labels if provided
    if (input.labels && input.labels.length > 0) {
      const labelInserts = input.labels.map((labelId: string) => ({
        taskId: task.id,
        labelId
      }));
      await tx.insert(taskLabels).values(labelInserts);
    }

    // Log activity
    await tx.insert(teamActivities).values({
      teamId: input.teamId,
      actorId: actor.id,
      actorType: actor.type,
      type: "task_created",
      entityType: "task",
      entityId: task.id,
      payload: { identifier: task.identifier, title: task.title },
    });

    return task;
  });
}

// ── POST /tasks ───────────────────────────────────────────────────────────────

tasksRouter.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTaskSchema.parse(req.body);
    const result = await createTaskInternal(input, req.actor!);

    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
});

// ── GET /tasks/:idOrIdentifier ────────────────────────────────────────────────

tasksRouter.get("/:idOrIdentifier", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const [task] = await db.select().from(tasks).where(condition);

    if (!task) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    res.json(success(task));
  } catch (err) {
    next(err);
  }
});

// ── GET /tasks/:idOrIdentifier/subtasks ───────────────────────────────────────

tasksRouter.get("/:idOrIdentifier/subtasks", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const [parentTask] = await db.select({ id: tasks.id }).from(tasks).where(condition);
    if (!parentTask) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTask.id))
      .orderBy(tasks.createdAt);
      
    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

// ── PUT /tasks/:idOrIdentifier ────────────────────────────────────────────────

tasksRouter.put("/:idOrIdentifier", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const input = updateTaskSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // Find the task ID first if an identifier was provided
      const [existingTask] = await tx.select({ id: tasks.id, teamId: tasks.teamId, title: tasks.title, identifier: tasks.identifier }).from(tasks).where(condition);
      if (!existingTask) throw new Error("Task not found");

      const [updated] = await tx
        .update(tasks)
        .set({
          ...input,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, existingTask.id))
        .returning();

      if (input.labels) {
        // Sync labels: delete existing, insert new
        await tx.delete(taskLabels).where(eq(taskLabels.taskId, existingTask.id));
        if (input.labels.length > 0) {
           const labelInserts = input.labels.map(labelId => ({
            taskId: existingTask.id,
            labelId
          }));
          await tx.insert(taskLabels).values(labelInserts);
        }
      }

      // Log activity
      await tx.insert(teamActivities).values({
        teamId: existingTask.teamId,
        actorId: req.actor!.id,
        actorType: req.actor!.type,
        type: "task_updated",
        entityType: "task",
        entityId: existingTask.id,
        payload: { identifier: existingTask.identifier, title: updated.title || existingTask.title },
      });

      return updated;
    });

    res.json(success(result));
  } catch (err: any) {
    if (err.message === "Task not found") {
      res.status(404).json(failure("Task not found"));
    } else {
      next(err);
    }
  }
});

// ── DELETE /tasks/:idOrIdentifier ─────────────────────────────────────────────

tasksRouter.delete("/:idOrIdentifier", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const result = await db.transaction(async (tx) => {
      const [deleted] = await tx.delete(tasks).where(condition).returning();
      
      if (!deleted) {
        return null;
      }

      // Log activity
      await tx.insert(teamActivities).values({
        teamId: deleted.teamId,
        actorId: req.actor!.id,
        actorType: req.actor!.type,
        type: "task_deleted",
        entityType: "task",
        entityId: deleted.id,
        payload: { identifier: deleted.identifier },
      });

      return deleted;
    });

    if (!result) {
      res.status(404).json(failure("Task not found"));
      return;
    }

    res.status(200).json(success({ deleted: true, id: result.id }));
  } catch (err) {
    next(err);
  }
});

// ── GET /tasks/:idOrIdentifier/comments ───────────────────────────────────────

tasksRouter.get("/:idOrIdentifier/comments", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const [task] = await db.select({ id: tasks.id }).from(tasks).where(condition);
    if (!task) {
       res.status(404).json(failure("Task not found"));
       return;
    }

    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.taskId, task.id))
      .orderBy(desc(comments.createdAt));
    
    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

// ── POST /tasks/:idOrIdentifier/comments ──────────────────────────────────────

tasksRouter.post("/:idOrIdentifier/comments", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idParam = String(req.params.idOrIdentifier);
    const condition = isUuid(idParam) ? eq(tasks.id, idParam) : eq(tasks.identifier, idParam);

    const [task] = await db.select({ id: tasks.id, teamId: tasks.teamId }).from(tasks).where(condition);
    if (!task) {
       res.status(404).json(failure("Task not found"));
       return;
    }

    const input = createCommentSchema.parse({ ...req.body, taskId: task.id });

    const [comment] = await db
      .insert(comments)
      .values({
        teamId: task.teamId,
        taskId: task.id,
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

// ── DELETE /tasks/comments/:commentId ─────────────────────────────────────────

tasksRouter.delete("/comments/:commentId", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db
      .delete(comments)
      .where(eq(comments.id, String(req.params.commentId)))
      .returning();

    if (!deleted) {
      res.status(404).json(failure("Comment not found"));
      return;
    }

    res.status(200).json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});
