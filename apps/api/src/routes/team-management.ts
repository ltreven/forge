import { randomBytes } from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, teams, workspaces } from "../db/schema";
import { createAgentSchema } from "../schemas/agent.schema";
import { success, failure } from "../lib/response";
import { agentAuthMiddleware } from "../middleware/agentAuthMiddleware";
import {
  applyCredentialsSecret,
  applyForgeAgentCR,
  applyRabbitMQCredentialsSecret,
  ensureNamespace,
  workspaceNamespace,
} from "../k8s/provisioner";
import { provisionTenant } from "../lib/rabbitmq";

export const teamManagementRouter = Router();

// All team-management routes require agent authentication.
// req.agent.teamId is the authoritative scope — callers cannot override it.
teamManagementRouter.use(agentAuthMiddleware);

// ── GET /teams/mine OR /mine OR /info OR /details ──────────────────────────
// Returns metadata for the agent's own team.

teamManagementRouter.get(["/teams/mine", "/mine", "/info", "/details"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.agent!.teamId;

    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    res.json(success(team));
  } catch (err) {
    next(err);
  }
});

// ── GET /teams/mine/agents OR /agents ──────────────────────────────────
// Returns the list of agents in the same team (roster).

teamManagementRouter.get(["/teams/mine/agents", "/agents", "/members", "/roster"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.agent!.teamId;

    const rows = await db
      .select()
      .from(agents)
      .where(eq(agents.teamId, teamId))
      .orderBy(agents.createdAt);

    // Sanitize: remove gatewayToken and sensitive metadata
    const sanitized = rows.map((a: any) => {
      const { gatewayToken: _gt, ...safeAgent } = a;
      if (safeAgent.metadata) {
        const { telegramBotToken: _tok, ...safeMeta } = safeAgent.metadata;
        safeAgent.metadata = { ...safeMeta, hasTelegramToken: Boolean(_tok) };
      }
      return safeAgent;
    });

    res.json(success(sanitized));
  } catch (err) {
    next(err);
  }
});

// ── POST /teams/mine/agents OR /agents ─────────────────────────────────
// Allows an agent to provision a new agent into their own team.

teamManagementRouter.post(["/teams/mine/agents", "/agents", "/members", "/roster"], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.agent!.teamId;
    const input = createAgentSchema.parse({ ...req.body, teamId });

    // ── 1. Resolve workspace ────────────────────────────────────────────────
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) {
      res.status(404).json(failure("Team not found"));
      return;
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, team.workspaceId));
    if (!workspace) {
      res.status(404).json(failure("Workspace not found"));
      return;
    }

    // ── 2. Provisioning Logic (Mirroring agentsRouter.post) ──────────────────
    const namespace = workspace.k8sNamespace ?? workspaceNamespace(workspace.id);
    const gatewayToken = randomBytes(32).toString("base64url");

    const [newAgent] = await db
      .insert(agents)
      .values({
        ...input,
        teamId, // Enforced
        gatewayToken,
        k8sStatus: "pending",
      })
      .returning();

    try {
      await ensureNamespace(namespace);
      await applyCredentialsSecret(namespace, newAgent);
      await applyForgeAgentCR(namespace, newAgent, workspace.id, team.name);

      try {
        const rabbitCreds = await provisionTenant(workspace.id);
        await applyRabbitMQCredentialsSecret(namespace, rabbitCreds);
      } catch (rabbitErr) {
        console.error("[team-management] RabbitMQ provisioning failed:", rabbitErr);
      }

      await db
        .update(agents)
        .set({ k8sStatus: "provisioning", k8sResourceName: newAgent.id })
        .where(eq(agents.id, newAgent.id));

      newAgent.k8sStatus = "provisioning";
      newAgent.k8sResourceName = newAgent.id;
    } catch (k8sErr) {
      console.error("[team-management] K8s provisioning failed:", k8sErr);
      await db.update(agents).set({ k8sStatus: "failed" }).where(eq(agents.id, newAgent.id));
      newAgent.k8sStatus = "failed";
    }

    // Remove sensitive token from response
    const { gatewayToken: _gt, ...safeAgent } = newAgent as any;
    res.status(201).json(success(safeAgent));
  } catch (err) {
    next(err);
  }
});
