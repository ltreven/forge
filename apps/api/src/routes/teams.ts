import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { teams, agents, workspaces } from "../db/schema";
import { createTeamSchema, updateTeamSchema } from "../schemas/team.schema";
import { success, failure } from "../lib/response";
import { authMiddleware } from "../middleware/authMiddleware";

export const teamsRouter = Router();

// ── GET /teams/mine ──────────────────────────────────────────────────────────
// Returns all teams (with agents) for the authenticated user's workspace.

teamsRouter.get("/mine", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Find the user's workspace.
    const [workspace] = await db
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.userId, req.user!.userId))
      .limit(1);

    if (!workspace) {
      res.json(success([]));
      return;
    }

    // 2. Get all teams for that workspace.
    const userTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.workspaceId, workspace.id))
      .orderBy(teams.createdAt);

    // 3. For each team, load its agents.
    const result = await Promise.all(
      userTeams.map(async (team) => {
        const teamAgents = await db
          .select()
          .from(agents)
          .where(eq(agents.teamId, team.id))
          .orderBy(agents.createdAt);
        return { ...team, agents: teamAgents, workspace };
      })
    );

    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

// ── POST /teams ───────────────────────────────────────────────────────────────
// Creates a team and automatically creates an associated team_lead agent.

teamsRouter.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTeamSchema.parse(req.body);

    // Resolve workspaceId from the authenticated user when not explicitly provided.
    let workspaceId = input.workspaceId;
    if (!workspaceId) {
      const [workspace] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.userId, req.user!.userId))
        .limit(1);
      if (!workspace) {
        res.status(400).json(failure("No workspace found for this user."));
        return;
      }
      workspaceId = workspace.id;
    }

    // Use a transaction so team + agents are created atomically.
    const result = await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({
          workspaceId,
          name: input.name,
          mission: input.mission,
          waysOfWorking: input.waysOfWorking,
          template: input.template,
        })
        .returning();

      // Create agents provided by the caller, or fall back to a default team lead.
      const agentInputs =
        input.agents && input.agents.length > 0
          ? input.agents.map((a) => ({ teamId: team.id, name: a.name, type: a.type, icon: a.icon }))
          : [{ teamId: team.id, name: "Forge Team Lead", type: "team_lead" as const }];

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
