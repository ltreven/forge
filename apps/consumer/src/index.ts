#!/usr/bin/env node
/**
 * forge-consumer — RabbitMQ↔openclaw gateway bridge
 *
 * This sidecar container runs alongside the openclaw agent container ("forge")
 * inside each agent pod. It has two responsibilities:
 *
 *  A. INBOUND (RabbitMQ → openclaw):
 *     Consumes messages from `agent.<AGENT_ID>` on the workspace exchange,
 *     forwards them to the openclaw gateway via HTTP POST, then publishes
 *     the response back to `reply.<sessionKey>`.
 *
 *  B. OUTBOUND (openclaw → RabbitMQ, agent-to-agent):
 *     Exposes a local HTTP API on 127.0.0.1:18780 so openclaw can ask the sidecar
 *     to send a message to any other agent in the workspace.
 *
 * Configuration (env vars, all from the `rabbitmq-credentials` Secret):
 *   RABBITMQ_HOST         — AMQP broker hostname
 *   RABBITMQ_AMQP_PORT    — default 5672
 *   RABBITMQ_VHOST        — /tenant-<workspaceId>
 *   RABBITMQ_USERNAME     — tenant-<workspaceId>-user
 *   RABBITMQ_PASSWORD     — generated at tenant provisioning time
 *   RABBITMQ_EXCHANGE     — tenant-<workspaceId>-exchange
 *   AGENT_ID              — the agent's UUID (set by the controller as an env var)
 *   OPENCLAW_GATEWAY_URL  — default http://127.0.0.1:18789
 *   OPENCLAW_GATEWAY_TOKEN — bearer token for openclaw auth
 *   SEND_API_PORT         — local send API port, default 18780
 */

import * as amqp from "amqplib";
import * as http from "http";

// ── Config ────────────────────────────────────────────────────────────────────

const RABBITMQ_HOST     = process.env.RABBITMQ_HOST      ?? "localhost";
const RABBITMQ_PORT     = Number(process.env.RABBITMQ_AMQP_PORT ?? "5672");
const RABBITMQ_VHOST    = process.env.RABBITMQ_VHOST     ?? "/";
const RABBITMQ_USER     = process.env.RABBITMQ_USERNAME  ?? "guest";
const RABBITMQ_PASS     = process.env.RABBITMQ_PASSWORD  ?? "guest";
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE  ?? "forge-exchange";
const AGENT_ID          = process.env.AGENT_ID           ?? "";
const GATEWAY_URL       = process.env.OPENCLAW_GATEWAY_URL   ?? "http://127.0.0.1:18789";
const GATEWAY_TOKEN     = process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
const SEND_API_PORT     = Number(process.env.SEND_API_PORT   ?? "18780");

if (!AGENT_ID) {
  console.error("[consumer] FATAL: AGENT_ID env var is required");
  process.exit(1);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentCommand {
  tenantId:   string;
  agentId:    string;
  sessionKey: string;
  messageId:  string;
  action:     string;
  payload:    Record<string, unknown>;
}

// ── AMQP connection with auto-reconnect ───────────────────────────────────────

const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

function buildAmqpUrl(): string {
  const vhostEnc = encodeURIComponent(RABBITMQ_VHOST);
  return `amqp://${encodeURIComponent(RABBITMQ_USER)}:${encodeURIComponent(RABBITMQ_PASS)}@${RABBITMQ_HOST}:${RABBITMQ_PORT}/${vhostEnc}`;
}

async function connectWithRetry(attempt = 0): Promise<amqp.Connection> {
  try {
    const conn = await amqp.connect(buildAmqpUrl());
    console.log(`[consumer] Connected to RabbitMQ (vhost: ${RABBITMQ_VHOST})`);
    attempt = 0; // reset backoff on success

    conn.on("error", (err) => {
      console.error("[consumer] Connection error:", err.message);
    });

    conn.on("close", () => {
      console.warn("[consumer] Connection closed — reconnecting...");
      setTimeout(() => startConsumer(), RETRY_DELAYS_MS[0]);
    });

    return conn;
  } catch (err: any) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    console.error(`[consumer] RabbitMQ connection failed (attempt ${attempt + 1}): ${err.message}. Retrying in ${delay}ms...`);
    await sleep(delay);
    return connectWithRetry(attempt + 1);
  }
}

// ── Openclaw gateway caller ───────────────────────────────────────────────────

/**
 * Sends a chat message to the openclaw gateway and returns the text response.
 *
 * Uses the OpenAI-compatible endpoint: POST /v1/chat/completions
 * Passes x-openclaw-session-key header so openclaw routes to the correct session.
 */
async function callOpenclaw(sessionKey: string, userContent: string): Promise<string> {
  const body = JSON.stringify({
    model:    "default",
    messages: [{ role: "user", content: userContent }],
    stream:   false,
  });

  const url = new URL("/v1/chat/completions", GATEWAY_URL);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type":           "application/json",
      "Authorization":          `Bearer ${GATEWAY_TOKEN}`,
      "x-openclaw-session-key": sessionKey,
    },
    body,
    // 60s timeout — openclaw may be thinking
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`openclaw gateway returned ${response.status}: ${errText}`);
  }

  const data = await response.json() as Record<string, unknown>;

  // Extract text from OpenAI-compatible response
  const content =
    (data.content as string) ??
    ((data.choices as any)?.[0]?.message?.content as string) ??
    JSON.stringify(data);

  return content;
}

// ── Inbound consumer ──────────────────────────────────────────────────────────

async function startConsumer(): Promise<void> {
  const conn = await connectWithRetry();
  const ch   = await conn.createChannel();
  ch.prefetch(1); // process one message at a time (keeps ordering)

  // Declare exchange (idempotent — in case it doesn't exist yet)
  await ch.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

  // Declare agent-specific durable queue
  const queueName = `agent-${AGENT_ID}`;
  await ch.assertQueue(queueName, { durable: true });

  // Bind to the tenant exchange with routing key agent.<AGENT_ID>
  await ch.bindQueue(queueName, RABBITMQ_EXCHANGE, `agent.${AGENT_ID}`);

  console.log(`[consumer] Listening on queue "${queueName}" (exchange: ${RABBITMQ_EXCHANGE})`);

  ch.consume(queueName, async (msg) => {
    if (!msg) return;

    let cmd: AgentCommand;
    try {
      cmd = JSON.parse(msg.content.toString()) as AgentCommand;
    } catch {
      console.error("[consumer] Invalid message format — nacking");
      ch.nack(msg, false, false);
      return;
    }

    console.log(`[consumer] Received action="${cmd.action}" sessionKey="${cmd.sessionKey}"`);

    try {
      let userContent: string;
      if (cmd.action === "chat_message") {
        userContent = String((cmd.payload as any).content ?? JSON.stringify(cmd.payload));
      } else {
        // For task/delegate actions, format as a structured prompt
        userContent = `Action: ${cmd.action}\n\nPayload:\n${JSON.stringify(cmd.payload, null, 2)}`;
      }

      // Forward to openclaw gateway (synchronous HTTP call)
      const reply = await callOpenclaw(cmd.sessionKey, userContent);

      // Publish reply back to the exchange
      const replyRoutingKey = `reply.${cmd.sessionKey}`;
      ch.publish(
        RABBITMQ_EXCHANGE,
        replyRoutingKey,
        Buffer.from(JSON.stringify({ content: reply, sessionKey: cmd.sessionKey, messageId: cmd.messageId })),
        {
          contentType:   "application/json",
          correlationId: cmd.messageId,
          deliveryMode:  1, // transient — reply doesn't need to survive restart
        },
      );

      ch.ack(msg);
      console.log(`[consumer] Reply published to "${replyRoutingKey}"`);
    } catch (err: any) {
      console.error(`[consumer] Processing error: ${err.message}`);
      // Nack without requeue to avoid poison-pill loops
      ch.nack(msg, false, false);
    }
  }, { noAck: false });
}

// ── Outbound send HTTP API (agent-to-agent) ───────────────────────────────────
//
// openclaw calls this endpoint to send a message to another agent.
// The sidecar publishes to the workspace exchange with routing key agent.<targetAgentId>.
//
// POST http://127.0.0.1:18780/send
// Body: { targetAgentId, action, payload, sessionKey }

interface SendRequest {
  targetAgentId: string;
  action:        string;
  payload:       Record<string, unknown>;
  sessionKey?:   string;
}

async function startSendApi(): Promise<void> {
  // Single AMQP connection shared for publishing
  let pubConn: amqp.Connection | null = null;
  let pubCh:   amqp.Channel   | null = null;

  async function ensurePubChannel(): Promise<amqp.Channel> {
    if (pubCh) return pubCh;
    pubConn = await amqp.connect(buildAmqpUrl());
    pubCh   = await pubConn.createChannel();
    await pubCh.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });
    pubConn.on("close", () => { pubConn = null; pubCh = null; });
    return pubCh;
  }

  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/send") {
      res.writeHead(404).end(JSON.stringify({ error: "Not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const { targetAgentId, action, payload, sessionKey } = JSON.parse(body) as SendRequest;
        if (!targetAgentId || !action) {
          res.writeHead(400).end(JSON.stringify({ error: "targetAgentId and action are required" }));
          return;
        }

        const messageId      = Math.random().toString(36).slice(2);
        const effectiveKey   = sessionKey ?? `a2a-${messageId}`;
        const routingKey     = `agent.${targetAgentId}`;

        const command: AgentCommand = {
          tenantId:   RABBITMQ_VHOST.replace("/tenant-", ""),
          agentId:    targetAgentId,
          sessionKey: effectiveKey,
          messageId,
          action,
          payload:    payload ?? {},
        };

        const ch = await ensurePubChannel();
        ch.publish(
          RABBITMQ_EXCHANGE,
          routingKey,
          Buffer.from(JSON.stringify(command)),
          { contentType: "application/json", deliveryMode: 2 },
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ queued: true, messageId, targetAgentId, sessionKey: effectiveKey }));
        console.log(`[consumer] Agent-to-agent: dispatched action="${action}" to agent "${targetAgentId}"`);
      } catch (err: any) {
        console.error("[consumer] Send API error:", err.message);
        res.writeHead(500).end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(SEND_API_PORT, "127.0.0.1", () => {
    console.log(`[consumer] Send API listening on 127.0.0.1:${SEND_API_PORT}`);
  });
}

// ── Entry ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log(`[consumer] Starting forge-consumer for agent: ${AGENT_ID}`);
  await Promise.all([
    startConsumer(),
    startSendApi(),
  ]);
}

main().catch((err) => {
  console.error("[consumer] Fatal error:", err);
  process.exit(1);
});
