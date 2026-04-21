import "dotenv/config";
import express from "express";
import cors from "cors";
import { teamsRouter } from "./routes/teams";
import { agentsRouter } from "./routes/agents";
import { authRouter } from "./routes/auth";
import { integrationsRouter } from "./routes/integrations";
import { conversationsRouter } from "./routes/conversations";
import { internalRouter } from "./routes/internal";
import { errorHandler } from "./middleware/errorHandler";
import { projectManagementRouter } from "./routes/project-management";
import { teamManagementRouter } from "./routes/team-management";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/auth", authRouter);
app.use("/teams", teamsRouter);
app.use("/agents", agentsRouter);
app.use("/conversations", conversationsRouter);

/**
 * Project management — authenticated by agent gatewayToken.
 * All routes are scoped to the authenticated agent's team automatically.
 *
 * Key endpoints:
 *   POST   /project-management/projects
 *   GET    /project-management/projects
 *   GET    /project-management/projects/:id
 *   PUT    /project-management/projects/:id
 *   DELETE /project-management/projects/:id
 *   POST   /project-management/projects/:id/updates
 *   GET    /project-management/projects/:id/updates
 *   PUT    /project-management/updates/:id
 *   DELETE /project-management/updates/:id
 *   POST   /project-management/projects/:id/issues
 *   GET    /project-management/projects/:id/issues
 *   GET    /project-management/issues/:id
 *   PUT    /project-management/issues/:id
 *   DELETE /project-management/issues/:id
 *   POST   /project-management/tasks
 *   GET    /project-management/tasks
 *   GET    /project-management/tasks/:id
 *   PUT    /project-management/tasks/:id
 *   DELETE /project-management/tasks/:id
 *   GET    /project-management/activities
 */
app.use("/project-management", projectManagementRouter);

/**
 * Team management — authenticated by agent gatewayToken.
 * This is used by agents to inspect their team and provision new agents.
 * All routes are scoped to the authenticated agent's team automatically.
 *
 * Key endpoints:
 *   GET    /team-management/teams/mine
 *   GET    /team-management/teams/mine/agents
 *   POST   /team-management/teams/mine/agents
 */
app.use("/team-management", teamManagementRouter);
app.use("/team-api", teamManagementRouter);

// Nested: /teams/:id/integrations
app.use("/teams/:id/integrations", integrationsRouter);

// Internal routes — not exposed via Ingress; protected by NetworkPolicy.
// Only reachable by the Agent Controller pod within the cluster.
app.use("/internal", internalRouter);

// ── Global error handler ──────────────────────────────────────────────────────

app.use(errorHandler);

// ── Listen ────────────────────────────────────────────────────────────────────

// Bind to loopback by default per security policy (GEMINI.md: "Bind to loopback only").
// In Kubernetes, liveness/readiness probes use exec (curl on loopback) — not httpGet —
// so the kubelet never needs to reach the pod IP directly.
// Override with HOST=0.0.0.0 only if an explicit network exposure is required.
const HOST = process.env.HOST ?? "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Forge API running on http://${HOST}:${PORT}`);

  // ── Startup: RabbitMQ tenant safety net ──────────────────────────────────
  // Re-provisions RabbitMQ vhosts/users/secrets for all existing workspaces.
  // Runs after a short delay to give RabbitMQ time to become ready after
  // cluster restarts (e.g. tilt down && tilt up) before provisioning starts.
  // Idempotent — safe to run on every startup, even if tenants already exist.
  if (process.env.DISABLE_RABBIT_STARTUP_REPROVISION !== "true") {
    const delayMs = Number(process.env.RABBIT_STARTUP_DELAY_MS ?? 30_000);
    setTimeout(async () => {
      try {
        const { provisionTenant, checkManagementApiReady } = await import("./lib/rabbitmq");
        const { applyRabbitMQCredentialsSecret, rolloutRestartDeployment } = await import("./k8s/provisioner");
        const { db }                          = await import("./db/client");
        const { workspaces, agents, teams }   = await import("./db/schema");
        const { eq }                          = await import("drizzle-orm");

        let apiReady = false;
        let attempt = 1;
        while (!apiReady) {
          apiReady = await checkManagementApiReady();
          if (apiReady) break;
          console.warn(`[startup] RabbitMQ Management API not ready. Retrying in 10s... (Attempt ${attempt})`);
          attempt++;
          await new Promise(r => setTimeout(r, 10_000));
        }

        console.log(`[startup] RabbitMQ Management API is ready after ${attempt} attempts. Starting reprovision...`);

        const allWorkspaces = await db.select().from(workspaces);
        let provisioned = 0;
        let failed = 0;

        for (const ws of allWorkspaces) {
          if (!ws.k8sNamespace) continue;
          try {
            const creds = await provisionTenant(ws.id);
            await applyRabbitMQCredentialsSecret(ws.k8sNamespace, creds);

            // Restart any agents whose consumer has been retrying (no connection yet)
            const wsAgents = await db
              .select({ id: agents.id })
              .from(agents)
              .innerJoin(teams, eq(teams.id, agents.teamId))
              .where(eq(teams.workspaceId, ws.id));

            for (const agent of wsAgents) {
              try {
                await rolloutRestartDeployment(ws.k8sNamespace, agent.id);
              } catch {
                // Pod may not exist yet — non-fatal
              }
            }
            provisioned++;
            console.log(`[startup] RabbitMQ re-provisioned for workspace ${ws.id}`);
          } catch (err) {
            failed++;
            console.warn(`[startup] RabbitMQ reprovision failed for workspace ${ws.id}:`, err instanceof Error ? err.message : err);
          }
        }

        console.log(`[startup] RabbitMQ reprovision complete — ok: ${provisioned}, failed: ${failed}`);
      } catch (err) {
        console.error("[startup] RabbitMQ reprovision hook crashed:", err);
      }
    }, delayMs);
  }
});


export default app;

