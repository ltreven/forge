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
 */
export async function ensureNamespace(namespace: string): Promise<void> {
  try {
    await coreV1.readNamespace({ name: namespace });
  } catch (err: any) {
    if (err?.response?.statusCode === 404) {
      await coreV1.createNamespace({
        body: {
          metadata: {
            name: namespace,
            labels: {
              "app.kubernetes.io/managed-by": "forge",
              "forge.ai/component":           "workspace",
            },
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
 * The Secret is created in the workspace namespace and referenced
 * by the ForgeAgent CR spec — never embedded in the CR itself.
 */
export async function applyCredentialsSecret(
  namespace: string,
  agent: Agent,
): Promise<void> {
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const name = `${agent.id}-creds`;

  // Collect all sensitive values from agent metadata.
  // Only non-empty values are included.
  const stringData: Record<string, string> = {};

  if (metadata.telegramBotToken)    stringData.TELEGRAM_BOT_TOKEN    = String(metadata.telegramBotToken);
  if (metadata.linearApiKey)        stringData.LINEAR_API_KEY         = String(metadata.linearApiKey);
  if (metadata.linearEnabled)       stringData.LINEAR_ENABLED         = String(metadata.linearEnabled);
  if (metadata.githubToken)         stringData.GITHUB_PERSONAL_ACCESS_TOKEN = String(metadata.githubToken);
  if (metadata.githubEnabled)       stringData.GITHUB_ENABLED         = String(metadata.githubEnabled);
  if (metadata.githubAuthMode)      stringData.GITHUB_AUTH_MODE       = String(metadata.githubAuthMode);
  if (metadata.openaiApiKey)        stringData.OPENAI_API_KEY         = String(metadata.openaiApiKey);
  if (metadata.geminiApiKey)        stringData.GEMINI_API_KEY         = String(metadata.geminiApiKey);
  if (metadata.gatewayToken)        stringData.OPENCLAW_GATEWAY_TOKEN = String(metadata.gatewayToken);

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
    await coreV1.readNamespacedSecret({ name, namespace });
    await coreV1.replaceNamespacedSecret({ name, namespace, body: secretBody });
  } catch (err: any) {
    if (err?.response?.statusCode === 404) {
      await coreV1.createNamespacedSecret({ namespace, body: secretBody });
    } else {
      throw err;
    }
  }
}

/**
 * Applies the ForgeAgent Custom Resource in the workspace namespace.
 * This is the ONLY "desired state" write for agent provisioning.
 * The Agent Controller watches these CRs and reconciles all runtime resources.
 * Idempotent — creates or updates.
 */
export async function applyForgeAgentCR(
  namespace: string,
  agent: Agent,
  workspaceId: string,
): Promise<void> {
  const metadata = (agent.metadata ?? {}) as Record<string, unknown>;
  const name = agent.id; // CR name = agent UUID (deterministic)

  const crBody = {
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
        provider: String(metadata.modelProvider ?? "openai"),
        name:     String(metadata.modelName ?? "gpt-4.1"),
      },
      resources: {
        requests: { cpu: "250m",  memory: "512Mi" },
        limits:   { cpu: "1000m", memory: "2Gi"   },
      },
      persistence: {
        size: "10Gi",
      },
    },
  };

  try {
    await customObjects.getNamespacedCustomObject({
      group:     FORGE_AI_GROUP,
      version:   FORGE_AI_VERSION,
      namespace,
      plural:    FORGE_AI_PLURAL,
      name,
    });
    // CR exists — patch spec
    await customObjects.patchNamespacedCustomObject({
      group:     FORGE_AI_GROUP,
      version:   FORGE_AI_VERSION,
      namespace,
      plural:    FORGE_AI_PLURAL,
      name,
      body:      crBody,
    }, { headers: { "Content-Type": "application/merge-patch+json" } });
  } catch (err: any) {
    if (err?.response?.statusCode === 404) {
      await customObjects.createNamespacedCustomObject({
        group:     FORGE_AI_GROUP,
        version:   FORGE_AI_VERSION,
        namespace,
        plural:    FORGE_AI_PLURAL,
        body:      crBody,
      });
    } else {
      throw err;
    }
  }
}

/**
 * Deletes the ForgeAgent CR.
 * The K8s Garbage Collector cascades to all child resources (ownerReferences).
 * Idempotent — 404 is treated as success.
 */
export async function deleteForgeAgentCR(namespace: string, agentId: string): Promise<void> {
  try {
    await customObjects.deleteNamespacedCustomObject({
      group:   FORGE_AI_GROUP,
      version: FORGE_AI_VERSION,
      namespace,
      plural:  FORGE_AI_PLURAL,
      name:    agentId,
    });
  } catch (err: any) {
    if (err?.response?.statusCode !== 404) throw err;
  }
}

/**
 * Deletes the agent credentials Secret.
 * Called alongside CR deletion during agent deprovisioning.
 */
export async function deleteCredentialsSecret(namespace: string, agentId: string): Promise<void> {
  try {
    await coreV1.deleteNamespacedSecret({ name: `${agentId}-creds`, namespace });
  } catch (err: any) {
    if (err?.response?.statusCode !== 404) throw err;
  }
}

/**
 * Reads the live status of a ForgeAgent CR from the cluster.
 * Returns null if the CR does not exist yet.
 */
export async function getForgeAgentStatus(
  namespace: string,
  agentId: string,
): Promise<{ phase: string; podName?: string; conditions?: unknown[] } | null> {
  try {
    const cr = await customObjects.getNamespacedCustomObject({
      group:   FORGE_AI_GROUP,
      version: FORGE_AI_VERSION,
      namespace,
      plural:  FORGE_AI_PLURAL,
      name:    agentId,
    }) as any;
    return cr?.status ?? { phase: "Pending" };
  } catch (err: any) {
    if (err?.response?.statusCode === 404) return null;
    throw err;
  }
}
