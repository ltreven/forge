import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/client";
import { users, workspaces, teams, agents } from "../db/schema";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { signToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/authMiddleware";
import { success, failure } from "../lib/response";
import {
  workspaceNamespace,
  ensureNamespace,
  applyCredentialsSecret,
  applyForgeAgentCR,
} from "../k8s/provisioner";

export const authRouter = Router();

// ── POST /auth/signup ─────────────────────────────────────────────────────────
// Creates: user → workspace → team → agents (all in one transaction).
// After commit, provisions K8s namespace + ForgeAgent CRs (non-blocking).

authRouter.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = signupSchema.parse(req.body);

    // Check for duplicate email.
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
      const [workspace] = await tx.insert(workspaces).values({
        userId: user.id,
        name: input.workspaceName,
        waysOfWorking: input.waysOfWorking,
      }).returning();

      // 3. Create the first team, linked to the workspace.
      const teamName = input.teamName ?? input.workspaceName;
      const [team] = await tx
        .insert(teams)
        .values({
          workspaceId: workspace.id,
          name: teamName,
          mission: input.mission ?? undefined,
          waysOfWorking: input.waysOfWorking,
          template: input.template ?? "starter",
        })
        .returning();

      // 4. Create agents — always include the Forge Team Lead.
      // The caller may pass additional agents; if none, only the team lead is created.
      const agentInputs =
        input.agents && input.agents.length > 0
          ? input.agents.map((a) => ({
              teamId: team.id,
              name: a.name,
              type: a.type,
              k8sStatus: "pending" as const,
            }))
          : [{ teamId: team.id, name: "Forge Team Lead", type: "team_lead" as const, k8sStatus: "pending" as const }];

      const createdAgents = await tx.insert(agents).values(agentInputs).returning();

      return { user, workspace, team, agents: createdAgents };
    });

    // ── K8s provisioning (after transaction commits — non-blocking) ────────────
    // Provision namespace + Secret + ForgeAgent CR for each agent.
    // Failures log an error but don't fail the signup response.
    const namespace = workspaceNamespace(result.workspace.id);
    try {
      await ensureNamespace(namespace);

      // Persist namespace on workspace so future requests don't re-derive it
      await db
        .update(workspaces)
        .set({ k8sNamespace: namespace })
        .where(eq(workspaces.id, result.workspace.id));

      for (const agent of result.agents) {
        await applyCredentialsSecret(namespace, agent);
        await applyForgeAgentCR(namespace, agent, result.workspace.id);
        await db
          .update(agents)
          .set({ k8sStatus: "provisioning", k8sResourceName: agent.id })
          .where(eq(agents.id, agent.id));
      }

      console.log(`[signup] K8s provisioned namespace=${namespace} agents=${result.agents.length}`);
    } catch (k8sErr) {
      console.error("[signup] K8s provisioning failed — agents remain pending:", k8sErr);
    }

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

    // Fetch the user's workspace, then their teams.
    const [userWorkspace] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.userId, user.id))
      .limit(1);

    const userTeams = userWorkspace
      ? await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.workspaceId, userWorkspace.id))
          .orderBy(desc(teams.createdAt))
      : [];

    const latestTeam = userTeams[0] ?? null;

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
