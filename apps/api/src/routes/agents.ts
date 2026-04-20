import { randomBytes } from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, teams, workspaces } from "../db/schema";
import { createAgentSchema, updateAgentSchema } from "../schemas/agent.schema";
import { success, failure } from "../lib/response";
import {
  workspaceNamespace,
  ensureNamespace,
  applyCredentialsSecret,
  applyForgeAgentCR,
  deleteForgeAgentCR,
  deleteCredentialsSecret,
  getForgeAgentStatus,
} from "../k8s/provisioner";

export const agentsRouter = Router();

// ── POST /agents ──────────────────────────────────────────────────────────────
// 1. Validates input and inserts agent into postgres (k8sStatus = "pending").
// 2. Resolves the workspace namespace (creates it if needed).
// 3. Applies the credentials Secret and the ForgeAgent CR (desired state).
// The Agent Controller reconciles the actual K8s runtime resources.

agentsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createAgentSchema.parse(req.body);

    // ── 1. Resolve workspace via team ────────────────────────────────────────
    const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId));
    if (!team) {
      res.status(400).json(failure("Team not found"));
      return;
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, team.workspaceId));
    if (!workspace) {
      res.status(400).json(failure("Workspace not found"));
      return;
    }

    // ── 2. Derive/persist namespace if missing ────────────────────────────────
    const namespace = workspace.k8sNamespace ?? workspaceNamespace(workspace.id);

    if (!workspace.k8sNamespace) {
      await db
        .update(workspaces)
        .set({ k8sNamespace: namespace })
        .where(eq(workspaces.id, workspace.id));
    }

    // ── 3. Insert agent with gateway token + pending k8s status ──────────────
    // gatewayToken is generated once here and never changed — the same token
    // persists across pod restarts since openclaw stores its state on the PVC.
    const gatewayToken = randomBytes(32).toString("base64url");

    const [agent] = await db
      .insert(agents)
      .values({
        ...input,
        gatewayToken,
        k8sStatus: "pending",
      })
      .returning();

    // ── 4. Provision K8s desired state (non-blocking on errors — agent exists) ─
    try {
      await ensureNamespace(namespace);
      await applyCredentialsSecret(namespace, agent);
      await applyForgeAgentCR(namespace, agent, workspace.id);

      // Store CR name (= agent UUID) on the DB record
      await db
        .update(agents)
        .set({ k8sStatus: "provisioning", k8sResourceName: agent.id })
        .where(eq(agents.id, agent.id));

      agent.k8sStatus      = "provisioning";
      agent.k8sResourceName = agent.id;
    } catch (k8sErr) {
      console.error("[agents] K8s provisioning failed — agent created but not scheduled:", k8sErr);
      await db.update(agents).set({ k8sStatus: "failed" }).where(eq(agents.id, agent.id));
      agent.k8sStatus = "failed";
    }

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
// Enriches the DB record with the live cr.status from the cluster.

agentsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, String(req.params.id)));

    if (!agent) {
      res.status(404).json(failure("Agent not found"));
      return;
    }

    // Enrich with live cluster status if agent has been provisioned
    let liveStatus: unknown = null;
    if (agent.k8sResourceName) {
      try {
        const [team] = await db.select().from(teams).where(eq(teams.id, agent.teamId));
        const [workspace] = team
          ? await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId))
          : [];

        if (workspace?.k8sNamespace) {
          liveStatus = await getForgeAgentStatus(workspace.k8sNamespace, agent.id);
        }
      } catch {
        // Non-fatal: cluster may be unreachable
      }
    }

    // Strip server-side secrets before sending to the client
    const { gatewayToken: _gt, metadata: _meta, ...safeAgent } = agent as any;
    res.json(success({ ...safeAgent, k8sLiveStatus: liveStatus }));
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
// 1. Deletes the ForgeAgent CR — K8s GC automatically removes Deployment, PVC, ConfigMap.
// 2. Deletes the credentials Secret.
// 3. Removes the agent from postgres.

agentsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, String(req.params.id)));

    if (!agent) {
      res.status(404).json(failure("Agent not found"));
      return;
    }

    // ── Resolve namespace ─────────────────────────────────────────────────────
    const [team]      = await db.select().from(teams).where(eq(teams.id, agent.teamId));
    const [workspace] = team
      ? await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId))
      : [];

    if (workspace?.k8sNamespace) {
      try {
        await deleteForgeAgentCR(workspace.k8sNamespace, agent.id);
        await deleteCredentialsSecret(workspace.k8sNamespace, agent.id);
      } catch (k8sErr) {
        console.error("[agents] K8s deprovision error (proceeding with DB delete):", k8sErr);
      }
    }

    await db.update(agents).set({ k8sStatus: "terminated" }).where(eq(agents.id, agent.id));
    await db.delete(agents).where(eq(agents.id, agent.id));

    res.status(200).json(success({ deleted: true, id: agent.id }));
  } catch (err) {
    next(err);
  }
});
