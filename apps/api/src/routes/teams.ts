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

    // Use a transaction so team + PM agent are created atomically.
    const result = await db.transaction(async (tx) => {
      const [team] = await tx.insert(teams).values(input).returning();

      const [pmAgent] = await tx
        .insert(agents)
        .values({
          teamId: team.id,
          name: "Forge PM",
          type: "project_manager",
        })
        .returning();

      return { team, pmAgent };
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
