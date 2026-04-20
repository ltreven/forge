# ─────────────────────────────────────────────────────────────────────────────
# Forge — Tiltfile
#
# Usage:
#   tilt up             — start everything
#   tilt down           — stop everything
#   tilt up forge-api   — start only the API (and its dependencies)
#
# Prerequisites:
#   - Docker Desktop with Kubernetes enabled
#   - ingress-nginx controller (installed automatically below)
#   - helm 3.x on PATH
#   - tilt 0.33+ on PATH
#
# Local settings (registry, etc.) can be overridden in tilt-settings.yaml
# ─────────────────────────────────────────────────────────────────────────────

# ── Load local developer settings (optional, gitignored) ─────────────────────
settings = read_yaml("tilt-settings.yaml", default={})

# ── Load platform credentials from .env (gitignored, never committed) ────────────
# Copy .env.example to .env and fill in real values.
dotenv = str(read_file(".env", default="")).splitlines()
def _parse_dotenv(lines):
  env = {}
  for line in lines:
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue
    k, _, v = line.partition("=")
    env[k.strip()] = v.strip()
  return env
_env = _parse_dotenv(dotenv)

PLATFORM_OPENAI_KEY    = _env.get("PLATFORM_OPENAI_API_KEY",  "")
PLATFORM_MODEL_PROVIDER = _env.get("PLATFORM_MODEL_PROVIDER", "openai")
PLATFORM_MODEL_NAME     = _env.get("PLATFORM_MODEL_NAME",    "gpt-4o-mini")

# ── Configuration ─────────────────────────────────────────────────────────────
NAMESPACE      = "forge"
HELM_CHART     = "charts/forge"
VALUES_LOCAL   = "charts/forge/values-local.yaml"
API_IMAGE        = settings.get("api_image",        "forge/api")
WEB_IMAGE        = settings.get("web_image",        "forge/web")
AGENT_IMAGE      = settings.get("agent_image",      "forge/agent:local")
CONSUMER_IMAGE   = settings.get("consumer_image",   "forge/consumer:local")
CONTROLLER_IMAGE = settings.get("controller_image", "forge/controller")
TILT_HOST      = settings.get("host", "forge.localhost")

# ── 1. Install ingress-nginx via Helm (only if not already present) ────────────
load('ext://helm_resource', 'helm_resource', 'helm_repo')

helm_repo(
  'ingress-nginx-repo',
  'https://kubernetes.github.io/ingress-nginx',
  labels=['infra'],
)

helm_resource(
  'ingress-nginx',
  'ingress-nginx-repo/ingress-nginx',
  namespace='ingress-nginx',
  flags=[
    '--create-namespace',
    # Docker Desktop natively supports LoadBalancer — binds to localhost:80 / localhost:443
    '--set', 'controller.service.type=LoadBalancer',
  ],
  resource_deps=[],
  labels=['infra'],
)

# ── 1b. RabbitMQ Cluster Operator ────────────────────────────────────────────
# Installed via the official manifest (kubectl apply) from GitHub releases.
# This is the recommended approach from the RabbitMQ docs.
# The Operator watches RabbitmqCluster CRs and manages the StatefulSet lifecycle.
#
# We use local_resource instead of helm_resource because the public Helm chart
# URL is frequently unavailable. The manifest includes the CRD + RBAC + Deployment.
local_resource(
  'rabbitmq-operator',
  cmd='kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"',
  labels=['infra'],
  deps=[],
)

# ── 2. Ensure the forge namespace exists ─────────────────────────────────────
# For local mode, all credentials are injected via values-local.yaml (no Secret needed).
# DATABASE_URL is built from embedded PostgreSQL, JWT_SECRET is inlined as an env var.

local_resource(
  'ensure-namespace',
  cmd='kubectl create namespace forge --dry-run=client -o yaml | kubectl apply -f -',
  labels=['setup'],
)

# ── 2b. Run DB migrations after PostgreSQL is ready ───────────────────────────
# Pipes all migration SQL files into the PostgreSQL pod.
# ON_ERROR_STOP=0 makes it idempotent ("already exists" errors are harmless).
# Tilt re-runs this step whenever a new .sql file is added to migrations/.
local_resource(
  'db-migrate',
  cmd='cat apps/api/migrations/[0-9]*.sql | kubectl exec -i -n forge forge-postgresql-0 -- psql -U forge -d forge -v ON_ERROR_STOP=0 2>&1 | grep -vE "already exists|^$" | grep -E "^(ERROR|FATAL)" || echo "✓ DB migrations applied"',
  resource_deps=['forge-postgresql'],
  deps=['apps/api/migrations'],
  labels=['setup'],
)

# ── 3. Build API image with live_update ───────────────────────────────────────
docker_build(
  API_IMAGE,
  context='apps/api',
  dockerfile='apps/api/Dockerfile',
  # Only-changed files trigger a rebuild (faster)
  ignore=[
    'node_modules',
    'dist',
    '.env',
    '*.md',
  ],
  live_update=[
    # Sync source code changes directly into the running container
    sync('apps/api/src', '/app/src'),
    # After syncing, recompile TypeScript and restart (only changed files)
    run(
      'cd /app && npx tsc --outDir dist --noEmit false 2>/dev/null || true && echo "TS compiled"',
      trigger=['apps/api/src'],
    ),
  ],
)

# ── 4. Build Web image with live_update ──────────────────────────────────────
docker_build(
  WEB_IMAGE,
  context='apps/web',
  dockerfile='apps/web/Dockerfile',
  # Build args: baked into the Next.js bundle at build time.
  # NEXT_PUBLIC_API_URL → relative path used by browser, routed through Next.js rewrite proxy.
  # API_INTERNAL_URL    → ClusterIP used by the Next.js server to reach the API pod.
  build_args={
    'NEXT_PUBLIC_API_URL': '/api',
    'API_INTERNAL_URL': 'http://forge-api:4000',
  },
  ignore=[
    'node_modules',
    '.next',
    '*.md',
  ],
  # NOTE: live_update is disabled for the web in standalone mode.
  # Next.js standalone bakes configuration at build time (rewrites, env vars),
  # so file syncs cannot update them — a full image rebuild is required.
  # Tilt will trigger a rebuild automatically when files in apps/web/ change.
)

# ── 5a. Build forge-agent image ──────────────────────────────────────────────
# Root cause of stale-image problem:
#   `docker build` writes to containerd's "default" namespace.
#   Docker Desktop Kubernetes reads from the "k8s.io" namespace.
#   These are separate — plain docker build is invisible to Kubernetes.
#
# Tilt's docker_build *does* load images into k8s.io via its cluster connector,
# but only for images it considers "used" in a k8s resource (container image field).
#
# Solution:
#   1. docker_build so Tilt builds and loads the image into k8s.io containerd.
#   2. A 0-replica Deployment ("preloader") with forge/agent:local — Tilt
#      substitutes this with the tilt-tagged digest and loads it into k8s.io.
#   3. local_resource reads the substituted tag from the preloader and patches
#      forge-agent-image ConfigMap → controller uses the exact loaded digest.
docker_build(
  AGENT_IMAGE,
  context='apps/agents',
  dockerfile='apps/agents/Dockerfile',
)

# 1-replica preloader: forces Tilt to load forge/agent into k8s.io containerd.
# replicas:0 makes Tilt substitute the tag but does NOT trigger k8s.io loading
# (no pod needs to run). With replicas:1 + a trivial sleep command, Tilt sees
# a real pod that needs the image and loads it into k8s.io.
# pullPolicy: IfNotPresent allows Docker Desktop's bridge to serve the image
# on first pull if k8s.io hasn't synced yet.
k8s_yaml(blob("""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: forge-agent-preloader
  namespace: forge
  labels:
    app.kubernetes.io/managed-by: tilt
spec:
  replicas: 1
  selector:
    matchLabels:
      app: forge-agent-preloader
  template:
    metadata:
      labels:
        app: forge-agent-preloader
    spec:
      containers:
      - name: agent-preloader
        image: {image}
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh", "-c", "while true; do sleep 3600; done"]
""".format(image=AGENT_IMAGE)))

k8s_resource('forge-agent-preloader', pod_readiness='ignore', labels=['images'])

# Sync the tilt-substituted image tag into the ConfigMap the controller reads.
local_resource(
  'forge-agent-configmap-sync',
  cmd="""
    IMG=$(kubectl get deployment forge-agent-preloader -n forge \\
      -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
    if [ -z "$IMG" ]; then echo "==> preloader not ready, skipping"; exit 0; fi
    kubectl patch configmap forge-agent-image -n forge \\
      -p '{"data":{"image":"'"$IMG"'","pullPolicy":"IfNotPresent"}}'
    echo "==> forge-agent-image ConfigMap => $IMG"
  """,
  resource_deps=['forge-agent-preloader'],
  labels=['images'],
)

# Initial placeholder ConfigMap — value is overwritten by forge-agent-configmap-sync.
k8s_yaml(blob("""
apiVersion: v1
kind: ConfigMap
metadata:
  name: forge-agent-image
  namespace: forge
  labels:
    app.kubernetes.io/managed-by: tilt
data:
  image: "{image}"
  pullPolicy: "IfNotPresent"
""".format(image=AGENT_IMAGE)))



# ── 5b. Build forge-consumer image ────────────────────────────────────────────────
docker_build(
  CONSUMER_IMAGE,
  context='apps/consumer',
  dockerfile='apps/consumer/Dockerfile',
  ignore=['node_modules', 'dist'],
  live_update=[
    sync('apps/consumer/src', '/app/src'),
  ],
)

# NOTE: The forge-consumer-image ConfigMap is intentionally applied with an EMPTY
# image value. This gives Tilt ownership of the ConfigMap (so tilt down cleans it),
# while keeping consumerImage="" so the controller skips sidecar injection.
#
# To enable the sidecar (FOR-26 Phase 2), change "" to CONSUMER_IMAGE below
# AFTER forge-rabbit is Running and the consumer build passes:
k8s_yaml(blob("""
apiVersion: v1
kind: ConfigMap
metadata:
  name: forge-consumer-image
  namespace: forge
  labels:
    app.kubernetes.io/managed-by: tilt
data:
  image: ""
  pullPolicy: "Never"
"""))


# ── RabbitmqCluster CR ───────────────────────────────────────────────────────────────
# Applied DIRECTLY here (not in Helm) because Tilt can't load CRD-backed resources
# from helm template before the Operator installs the CRD.
# Tilt sees this as a known resource named 'forge-rabbit' and applies it in the
# correct order via resource_deps=['rabbitmq-operator'].
k8s_yaml(blob("""
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: forge-rabbit
  namespace: infra-messaging
  labels:
    app.kubernetes.io/managed-by: tilt
    forge.ai/component: message-bus
spec:
  replicas: 1
  persistence:
    storage: 2Gi
  rabbitmq:
    additionalPlugins:
      - rabbitmq_management
      - rabbitmq_prometheus
    additionalConfig: |
      default_vhost = /
      log.console = true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: "300m"
      memory: 256Mi
"""))


# ── 5b. Build forge-controller (Go) ─────────────────────────────────────────
docker_build(
  CONTROLLER_IMAGE,
  context='apps/controller',
  dockerfile='apps/controller/Dockerfile',
  ignore=['vendor'],
)

# ── 5. Deploy the forge Helm chart ────────────────────────────────────────────
# Note: Tilt passes --include-crds to helm template automatically, so CRDs in
# charts/forge/crds/ (ForgeAgent CRD) are applied as part of this step.
# No separate kubectl apply step is needed, even on a zero-km cluster.
k8s_yaml(
  helm(
    HELM_CHART,
    name='forge',
    namespace=NAMESPACE,
    values=[VALUES_LOCAL],
    set=[
      'api.image.repository=' + API_IMAGE,
      'api.image.tag=local',
      'web.image.repository=' + WEB_IMAGE,
      'web.image.tag=local',
      'controller.image.repository=' + CONTROLLER_IMAGE,
      'controller.image.tag=local',
      'ingress.host=' + TILT_HOST,
      # Platform AI credentials — read from .env (gitignored)
      'api.env.PLATFORM_OPENAI_API_KEY=' + PLATFORM_OPENAI_KEY,
      'api.env.PLATFORM_MODEL_PROVIDER=' + PLATFORM_MODEL_PROVIDER,
      'api.env.PLATFORM_MODEL_NAME=' + PLATFORM_MODEL_NAME,
    ],
  )
)

# ── 6. Resource configuration ─────────────────────────────────────────────────

# PostgreSQL must be ready before the API starts
k8s_resource(
  'forge-postgresql',
  labels=['database'],
  port_forwards=['5432:5432'],
)

# RabbitMQ cluster — the RabbitmqCluster CR is a non-workload CRD resource.
# Tilt requires the objects= syntax to reference it by name.
# Port-forwards to the management UI are done separately by targeting the
# Service created by the Operator (forge-rabbit-management, port 15672).
k8s_resource(
  objects=['forge-rabbit:RabbitmqCluster:infra-messaging'],
  new_name='forge-rabbit',
  resource_deps=['rabbitmq-operator'],
  labels=['infra'],
)

# API depends on PostgreSQL only at startup; RabbitMQ connection is lazy in the app
k8s_resource(
  'forge-api',
  resource_deps=['forge-postgresql', 'db-migrate', 'ensure-namespace'],
  labels=['app'],
  port_forwards=['4000:4000'],
  links=[
    link('http://localhost:4000/health', 'API Health'),
  ],
)

# Web depends on the API
k8s_resource(
  'forge-web',
  resource_deps=['forge-api'],
  labels=['app'],
  port_forwards=['3000:3000'],
  links=[
    link('http://' + TILT_HOST, 'Forge Web (via Ingress)'),
    link('http://localhost:3000', 'Forge Web (direct)'),
  ],
)

k8s_resource(
  'ingress-nginx',
  labels=['infra'],
  links=[
    link('http://' + TILT_HOST, 'Ingress entry point'),
  ],
)

# ── 7. Convenience local resources ───────────────────────────────────────────

local_resource(
  'helm-lint',
  cmd='helm lint charts/forge -f charts/forge/values-local.yaml',
  deps=['charts/forge'],
  labels=['validation'],
  auto_init=True,
  trigger_mode=TRIGGER_MODE_MANUAL,
)

local_resource(
  'api-typecheck',
  cmd='cd apps/api && npx tsc --noEmit',
  deps=['apps/api/src', 'apps/api/tsconfig.json'],
  labels=['validation'],
  auto_init=False,
)

local_resource(
  'web-typecheck',
  cmd='cd apps/web && npx tsc --noEmit',
  deps=['apps/web/app', 'apps/web/components', 'apps/web/tsconfig.json'],
  labels=['validation'],
  auto_init=False,
)
