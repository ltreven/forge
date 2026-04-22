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
import { projectsRouter } from "./routes/projects";
import { teamManagementRouter } from "./routes/team-management";
import { mcpRouter } from "./routes/mcp";

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
app.use((req, res, next) => {
  // Bypass express.json() for MCP messages route because the SDK needs the raw HTTP stream
  if (req.originalUrl.startsWith('/mcp/messages') || req.path === '/mcp/messages') {
    return next();
  }
  express.json()(req, res, next);
});

// Enforce Content-Type for mutations to help agents/users debug missing headers
app.use((req, res, next) => {
  // Bypass this enforcement for MCP messages
  if (req.originalUrl.startsWith('/mcp/messages') || req.path === '/mcp/messages') {
    return next();
  }
  if ((req.method === "POST" || req.method === "PUT") && !req.is("application/json")) {
    res.status(415).json({
      success: false,
      error: "Unsupported Media Type. You MUST send 'Content-Type: application/json' header.",
    });
    return;
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Internal routes — system level, no auth required (protected by NetworkPolicy)
app.use("/internal", internalRouter);

// Unified Actors Endpoints (Agentes e Humanos usam os mesmos caminhos)
app.use("/team", teamManagementRouter);
app.use("/", projectsRouter);

// Legacy/Core routers (predominantly for humans or specific lifecycle)
app.use("/auth", authRouter);
app.use("/teams", teamsRouter); // Legacy team listing for humans
app.use("/agents", agentsRouter); // Lifecycle management (creation/deletion)
app.use("/conversations", conversationsRouter);
app.use("/teams/:id/integrations", integrationsRouter);
app.use("/mcp", mcpRouter);

// ── Global error handler ──────────────────────────────────────────────────────

app.use(errorHandler);

// ── Listen ────────────────────────────────────────────────────────────────────

const HOST = process.env.HOST ?? "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Forge API running on http://${HOST}:${PORT}`);

  // Startup: RabbitMQ reprovisioning safety net
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

            const wsAgents = await db
              .select({ id: agents.id })
              .from(agents)
              .innerJoin(teams, eq(teams.id, agents.teamId))
              .where(eq(teams.workspaceId, ws.id));

            for (const agent of wsAgents) {
              try {
                await rolloutRestartDeployment(ws.k8sNamespace, agent.id);
              } catch { }
            }
            provisioned++;
            console.log(`[startup] RabbitMQ re-provisioned for workspace ${ws.id}`);
          } catch (err) {
            failed++;
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
