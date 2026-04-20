import type { Agent } from "../db/schema";
import { coreV1, customObjects, FORGE_AI_GROUP, FORGE_AI_VERSION, FORGE_AI_PLURAL } from "./client";

/**
 * Derives the deterministic Kubernetes namespace for a workspace.
 * Pattern: forge-ws-{workspaceId[:8]}
 * Guaranteed unique (UUID prefix), never changes after creation.
 */
export function workspaceNamespace(workspaceId: string): string {
  return `forge-ws-${workspaceId.slice(0, 8)}`;
}

/**
 * Ensures the Kubernetes namespace for a workspace exists.
 * Idempotent — safe to call multiple times.
 *
 * @kubernetes/client-node@0.22.x positional arg API:
 *   readNamespace(name: string)
 *   createNamespace(body: V1Namespace)
 */
export async function ensureNamespace(namespace: string): Promise<void> {
  try {
    await coreV1.readNamespace(namespace);
  } catch (err: any) {
    if (httpStatus(err) === 404) {
      await coreV1.createNamespace({
        metadata: {
          name: namespace,
          labels: {
            "app.kubernetes.io/managed-by": "forge",
            "forge.ai/component":           "workspace",
          },
        },
      });
    } else {
      throw err;
    }
  }
}

/**
 * Creates or updates the credentials Secret for an agent.
 * Positional API: createNamespacedSecret(namespace, body) / replaceNamespacedSecret(name, namespace, body)
 */
export async function applyCredentialsSecret(
  namespace: string,
  agent: Agent,
): Promise<void> {
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const name = `${agent.id}-creds`;

  // Platform-level fallbacks — set in forge-api env via PLATFORM_* vars from .env
  const platformOpenAIKey = process.env.PLATFORM_OPENAI_API_KEY;
  const platformGeminiKey = process.env.PLATFORM_GEMINI_API_KEY;

  const stringData: Record<string, string> = {};
  if (agent.gatewayToken)                    stringData.OPENCLAW_GATEWAY_TOKEN  = agent.gatewayToken;
  if (metadata.telegramBotToken)             stringData.TELEGRAM_BOT_TOKEN      = String(metadata.telegramBotToken);
  if (metadata.linearApiKey)                 stringData.LINEAR_API_KEY           = String(metadata.linearApiKey);
  if (metadata.linearEnabled)                stringData.LINEAR_ENABLED            = String(metadata.linearEnabled);
  if (metadata.githubToken)                  stringData.GITHUB_PERSONAL_ACCESS_TOKEN = String(metadata.githubToken);
  if (metadata.githubEnabled)                stringData.GITHUB_ENABLED            = String(metadata.githubEnabled);
  if (metadata.githubAuthMode)               stringData.GITHUB_AUTH_MODE          = String(metadata.githubAuthMode);
  // Agent-specific key takes priority; fall back to platform key
  const openaiKey = metadata.openaiApiKey ? String(metadata.openaiApiKey) : platformOpenAIKey;
  if (openaiKey)                             stringData.OPENAI_API_KEY            = openaiKey;
  const geminiKey = metadata.geminiApiKey ? String(metadata.geminiApiKey) : platformGeminiKey;
  if (geminiKey)                             stringData.GEMINI_API_KEY            = geminiKey;

  const secretBody = {
    metadata: {
      name,
      namespace,
      labels: {
        "app.kubernetes.io/managed-by": "forge",
        "forge.ai/agent-id":            agent.id,
      },
    },
    stringData,
  };

  try {
    await coreV1.readNamespacedSecret(name, namespace);
    // Exists — replace
    await coreV1.replaceNamespacedSecret(name, namespace, secretBody);
  } catch (err: any) {
    if (httpStatus(err) === 404) {
      await coreV1.createNamespacedSecret(namespace, secretBody);
    } else {
      throw err;
    }
  }
}

/**
 * Applies the ForgeAgent Custom Resource (create-or-replace semantics).
 * Uses create → 409 conflict → get resourceVersion → replace to avoid PATCH Content-Type issues.
 */
export async function applyForgeAgentCR(
  namespace: string,
  agent: Agent,
  workspaceId: string,
): Promise<void> {
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const name = agent.id;

  const crBody: Record<string, unknown> = {
    apiVersion: `${FORGE_AI_GROUP}/${FORGE_AI_VERSION}`,
    kind: "Agent",
    metadata: {
      name,
      namespace,
      labels: {
        "app.kubernetes.io/managed-by": "forge",
        "forge.ai/agent-id":            agent.id,
        "forge.ai/workspace-id":        workspaceId,
        "forge.ai/profile":             agent.type,
      },
      annotations: {
        "forge.ai/agent-name": agent.name,
      },
    },
    spec: {
      agentName:            agent.name,
      profile:              agent.type,
      operatorName:         String(metadata.operatorName ?? ""),
      credentialsSecretRef: `${agent.id}-creds`,
      model: {
        provider: String(metadata.modelProvider ?? process.env.PLATFORM_MODEL_PROVIDER ?? "openai"),
        name:     String(metadata.modelName     ?? process.env.PLATFORM_MODEL_NAME     ?? "gpt-4o-mini"),
      },
      resources: {
        requests: { cpu: "250m",  memory: "512Mi" },
        limits:   { cpu: "1000m", memory: "2Gi"   },
      },
      persistence: { size: "10Gi" },
    },
  };

  try {
    await customObjects.createNamespacedCustomObject(
      FORGE_AI_GROUP, FORGE_AI_VERSION, namespace, FORGE_AI_PLURAL, crBody,
    );
  } catch (err: any) {
    if (httpStatus(err) === 409) {
      // Already exists — replace (requires current resourceVersion for optimistic lock)
      const existing = await customObjects.getNamespacedCustomObject(
        FORGE_AI_GROUP, FORGE_AI_VERSION, namespace, FORGE_AI_PLURAL, name,
      ) as any;
      (crBody.metadata as any).resourceVersion = existing.metadata?.resourceVersion;

      await customObjects.replaceNamespacedCustomObject(
        FORGE_AI_GROUP, FORGE_AI_VERSION, namespace, FORGE_AI_PLURAL, name, crBody,
      );
    } else {
      throw err;
    }
  }
}

/**
 * Deletes the ForgeAgent CR. K8s GC cascades to all child resources (ownerReferences).
 * Idempotent — 404 is treated as success.
 */
export async function deleteForgeAgentCR(namespace: string, agentId: string): Promise<void> {
  try {
    await customObjects.deleteNamespacedCustomObject(
      FORGE_AI_GROUP, FORGE_AI_VERSION, namespace, FORGE_AI_PLURAL, agentId,
    );
  } catch (err: any) {
    if (httpStatus(err) !== 404) throw err;
  }
}

/**
 * Deletes the agent credentials Secret.
 */
export async function deleteCredentialsSecret(namespace: string, agentId: string): Promise<void> {
  try {
    await coreV1.deleteNamespacedSecret(`${agentId}-creds`, namespace);
  } catch (err: any) {
    if (httpStatus(err) !== 404) throw err;
  }
}

/**
 * Reads the live status of a ForgeAgent CR. Returns null if not found.
 */
export async function getForgeAgentStatus(
  namespace: string,
  agentId: string,
): Promise<{ phase: string; podName?: string; conditions?: unknown[] } | null> {
  try {
    const cr = await customObjects.getNamespacedCustomObject(
      FORGE_AI_GROUP, FORGE_AI_VERSION, namespace, FORGE_AI_PLURAL, agentId,
    ) as any;
    return cr?.status ?? { phase: "Pending" };
  } catch (err: any) {
    if (httpStatus(err) === 404) return null;
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the HTTP status code from a @kubernetes/client-node error.
 * The error shape varies by library version; this handles both styles.
 */
function httpStatus(err: any): number {
  return err?.response?.statusCode       // axios-style (older versions)
    ?? err?.body?.code                   // K8s API body code
    ?? err?.statusCode                   // direct property
    ?? 0;
}
