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
});


export default app;
