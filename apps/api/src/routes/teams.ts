import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { teams, agents } from "../db/schema";
import { createTeamSchema, updateTeamSchema } from "../schemas/team.schema";
import { success, failure } from "../lib/response";

export const teamsRouter = Router();

// ── POST /teams ───────────────────────────────────────────────────────────────
// Creates a team and automatically creates an associated project_manager agent.

teamsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTeamSchema.parse(req.body);

    // Use a transaction so team + agents are created atomically.
    const result = await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({
          name: input.name,
          mission: input.mission,
          waysOfWorking: input.waysOfWorking,
        })
        .returning();

      // Create agents provided by the caller, or fall back to a default PM.
      const agentInputs =
        input.agents && input.agents.length > 0
          ? input.agents.map((a) => ({ teamId: team.id, name: a.name, type: a.type, icon: a.icon }))
          : [{ teamId: team.id, name: "Forge PM", type: "project_manager" as const }];

      const createdAgents = await tx.insert(agents).values(agentInputs).returning();

      return { team, agents: createdAgents };
    });

    res.status(201).json(success(result));
  } catch (err) {
    next(err);
  }
});

// ── GET /teams ────────────────────────────────────────────────────────────────

teamsRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db.select().from(teams).orderBy(teams.createdAt);
    res.json(success(rows));
  } catch (err) {
    next(err);
  }
});

// ── GET /teams/:id ────────────────────────────────────────────────────────────

teamsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [team] = await db.select().from(teams).where(eq(teams.id, String(req.params.id)));

    if (!team) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    res.json(success(team));
  } catch (err) {
    next(err);
  }
});

// ── PUT /teams/:id ────────────────────────────────────────────────────────────

teamsRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateTeamSchema.parse(req.body);

    const [updated] = await db
      .update(teams)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(teams.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /teams/:id ─────────────────────────────────────────────────────────

teamsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [deleted] = await db
      .delete(teams)
      .where(eq(teams.id, String(req.params.id)))
      .returning();

    if (!deleted) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    res.status(200).json(success({ deleted: true, id: deleted.id }));
  } catch (err) {
    next(err);
  }
});
