import * as k8s from "@kubernetes/client-node";

/**
 * Singleton Kubernetes client configured from the environment.
 * - Inside the cluster: reads the mounted ServiceAccount token automatically.
 * - Outside the cluster (local dev / Tilt): reads ~/.kube/config.
 */

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

/** Core V1 API — Namespaces, Secrets, ConfigMaps */
export const coreV1 = kc.makeApiClient(k8s.CoreV1Api);

/** Apps V1 API — Deployments */
export const appsV1 = kc.makeApiClient(k8s.AppsV1Api);

/** Custom Objects API — ForgeAgent CRs */
export const customObjects = kc.makeApiClient(k8s.CustomObjectsApi);

export const FORGE_AI_GROUP   = "forge.ai";
export const FORGE_AI_VERSION = "v1alpha1";
export const FORGE_AI_PLURAL  = "agents";
