import "dotenv/config";
import express from "express";
import { teamsRouter } from "./routes/teams";
import { agentsRouter } from "./routes/agents";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/teams", teamsRouter);
app.use("/agents", agentsRouter);

// ── Global error handler ──────────────────────────────────────────────────────

app.use(errorHandler);

// ── Listen ────────────────────────────────────────────────────────────────────

app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Forge API running on http://127.0.0.1:${PORT}`);
});

export default app;
