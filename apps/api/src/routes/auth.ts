import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/client";
import { users, workspaces, teams, agents } from "../db/schema";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { signToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/authMiddleware";
import { success, failure } from "../lib/response";

export const authRouter = Router();

// ── POST /auth/signup ─────────────────────────────────────────────────────────
// Creates: user → workspace → team → agents (all in one transaction).
// Returns: JWT token + user profile + teamId so the client can redirect to /setup.

authRouter.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = signupSchema.parse(req.body);

    // Check for duplicate email.
    const { eq } = await import("drizzle-orm");
    const existing = await db.select().from(users).where(eq(users.email, input.email));
    if (existing.length > 0) {
      res.status(409).json(failure("A user with this email already exists"));
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await db.transaction(async (tx) => {
      // 1. Create user.
      const [user] = await tx
        .insert(users)
        .values({ name: input.name, email: input.email, passwordHash })
        .returning();

      // 2. Create workspace.
      await tx.insert(workspaces).values({
        userId: user.id,
        name: input.workspaceName,
        waysOfWorking: input.waysOfWorking,
      });

      // 3. Create the team — use workspace name as team name if no specific name given.
      const teamName = input.teamName ?? input.workspaceName;
      const [team] = await tx
        .insert(teams)
        .values({
          name: teamName,
          mission: input.mission ?? `${teamName}'s engineering team`,
          waysOfWorking: input.waysOfWorking,
        })
        .returning();

      // 4. Create agents — always include the fixed Forge PM (project_manager) first.
      // The caller may pass additional agents; if none, only the PM is created.
      const agentInputs =
        input.agents && input.agents.length > 0
          ? input.agents.map((a) => ({ teamId: team.id, name: a.name, type: a.type }))
          : [{ teamId: team.id, name: "Forge PM", type: "project_manager" as const }];

      const createdAgents = await tx.insert(agents).values(agentInputs).returning();

      return { user, team, agents: createdAgents };
    });

    const token = signToken({ userId: result.user.id, email: result.user.email });

    res.status(201).json(
      success({
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        teamId: result.team.id,
      })
    );
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────────────

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);

    const { eq } = await import("drizzle-orm");
    const [user] = await db.select().from(users).where(eq(users.email, input.email));

    if (!user) {
      res.status(401).json(failure("Invalid email or password"));
      return;
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      res.status(401).json(failure("Invalid email or password"));
      return;
    }

    // Fetch the user's team (most recently created).
    const { desc } = await import("drizzle-orm");
    const [latestTeam] = await db
      .select({ id: teams.id })
      .from(teams)
      .orderBy(desc(teams.createdAt))
      .limit(1);

    const token = signToken({ userId: user.id, email: user.email });

    res.json(
      success({
        token,
        user: { id: user.id, name: user.name, email: user.email },
        teamId: latestTeam?.id ?? null,
      })
    );
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

authRouter.get("/me", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eq } = await import("drizzle-orm");
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, req.user!.userId));

    if (!user) {
      res.status(404).json(failure("User not found"));
      return;
    }

    res.json(success(user));
  } catch (err) {
    next(err);
  }
});
