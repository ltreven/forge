import "dotenv/config";
import express from "express";
import cors from "cors";
import { teamsRouter } from "./routes/teams";
import { agentsRouter } from "./routes/agents";
import { authRouter } from "./routes/auth";
import { integrationsRouter } from "./routes/integrations";
import { conversationsRouter } from "./routes/conversations";
import { errorHandler } from "./middleware/errorHandler";

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

// Nested: /teams/:id/integrations
app.use("/teams/:id/integrations", integrationsRouter);

// ── Global error handler ──────────────────────────────────────────────────────

app.use(errorHandler);

// ── Listen ────────────────────────────────────────────────────────────────────

app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Forge API running on http://127.0.0.1:${PORT}`);
});

export default app;
