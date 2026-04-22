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

// All team-management routes require agent authentication via gatewayToken.
teamManagementRouter.use(agentAuthMiddleware);

// Mandatory Agent Guard
teamManagementRouter.use((req, res, next) => {
  if (!req.agent) {
    res.status(401).json(failure("Agent gateway token required for this route"));
    return;
  }
  next();
});

/**
 * GET / (when mounted at /team)
 * Returns metadata for the agent's own team.
 */
teamManagementRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * GET /members
 * Returns the list of agents in the same team.
 */
teamManagementRouter.get("/members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.agent!.teamId;

    const rows = await db
      .select()
      .from(agents)
      .where(eq(agents.teamId, teamId))
      .orderBy(agents.createdAt);

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

/**
 * POST /members
 * Allows an agent to provision a new agent into their own team.
 */
teamManagementRouter.post("/members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.agent!.teamId;
    const input = createAgentSchema.parse({ ...req.body, teamId });

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

    const namespace = workspace.k8sNamespace ?? workspaceNamespace(workspace.id);
    const gatewayToken = randomBytes(32).toString("base64url");

    const [newAgent] = await db
      .insert(agents)
      .values({
        ...input,
        teamId,
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

    const { gatewayToken: _gt, ...safeAgent } = newAgent as any;
    res.status(201).json(success(safeAgent));
  } catch (err) {
    next(err);
  }
});
