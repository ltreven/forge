import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents } from "../db/schema";
import { createAgentSchema, updateAgentSchema } from "../schemas/agent.schema";
import { success, failure } from "../lib/response";

export const agentsRouter = Router();

// ── POST /agents ──────────────────────────────────────────────────────────────

agentsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createAgentSchema.parse(req.body);

    const [agent] = await db.insert(agents).values(input).returning();

    res.status(201).json(success(agent));
  } catch (err) {
    next(err);
  }
});

// ── GET /agents ───────────────────────────────────────────────────────────────
// Supports optional ?teamId= filter.

agentsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.query;

    const rows = teamId
      ? await db
          .select()
          .from(agents)
          .where(eq(agents.teamId, String(teamId)))
          .orderBy(agents.createdAt)
      : await db.select().from(agents).orderBy(agents.createdAt);

    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

// ── GET /agents/:id ───────────────────────────────────────────────────────────

agentsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, String(req.params.id)));

    if (!agent) {
      res.status(404).json(failure("Agent not found"));
      return;
    }

    res.json(success(agent));
  } catch (err) {
    next(err);
  }
});

// ── PUT /agents/:id ───────────────────────────────────────────────────────────

agentsRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateAgentSchema.parse(req.body);

    const [updated] = await db
      .update(agents)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(agents.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json(failure("Agent not found"));
      return;
    }

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /agents/:id ────────────────────────────────────────────────────────

agentsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db
      .delete(agents)
      .where(eq(agents.id, String(req.params.id)))
      .returning();

    if (!deleted) {
      res.status(404).json(failure("Agent not found"));
      return;
    }

    res.status(200).json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});
