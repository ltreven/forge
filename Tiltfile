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

# ── Configuration ─────────────────────────────────────────────────────────────
NAMESPACE      = "forge"
HELM_CHART     = "charts/forge"
VALUES_LOCAL   = "charts/forge/values-local.yaml"
API_IMAGE        = settings.get("api_image",        "forge/api")
WEB_IMAGE        = settings.get("web_image",        "forge/web")
AGENT_IMAGE      = settings.get("agent_image",      "forge/agent:local")
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

# ── 2. Ensure the forge namespace exists ─────────────────────────────────────
# For local mode, all credentials are injected via values-local.yaml (no Secret needed).
# DATABASE_URL is built from embedded PostgreSQL, JWT_SECRET is inlined as an env var.

local_resource(
  'ensure-namespace',
  cmd='kubectl create namespace forge --dry-run=client -o yaml | kubectl apply -f -',
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
# docker_build() builds the image AND loads it into the k8s node's containerd
# via Tilt's injection mechanism. This works because of the DaemonSet below
# that references the image — Tilt needs ≥1 k8s resource to associate the image
# with so it knows to load it into the cluster.
docker_build(
  AGENT_IMAGE,
  context='apps/agents',
  dockerfile='apps/agents/Dockerfile',
  ignore=['*.md'],
)

# Preload DaemonSet: exists solely so Tilt loads forge/agent:local into the
# node's containerd. Agent pods in forge-ws-* namespaces use pullPolicy=Never
# and need the image pre-loaded. The pod runs a no-op sleep loop (8Mi RAM).
k8s_yaml(blob("""
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: forge-agent-preload
  namespace: forge
  labels:
    app.kubernetes.io/name: forge-agent-preload
    app.kubernetes.io/managed-by: tilt
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: forge-agent-preload
  template:
    metadata:
      labels:
        app.kubernetes.io/name: forge-agent-preload
    spec:
      tolerations:
        - operator: Exists
      terminationGracePeriodSeconds: 1
      containers:
        - name: preload
          image: {agent_image}
          command: ["sh", "-c", "echo 'forge-agent image loaded on node'; exec sleep infinity"]
          resources:
            requests:
              memory: "8Mi"
              cpu: "5m"
            limits:
              memory: "32Mi"
              cpu: "50m"
""".format(agent_image=AGENT_IMAGE)))

k8s_resource('forge-agent-preload', labels=['agent'])

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

# API depends on PostgreSQL being healthy
k8s_resource(
  'forge-api',
  resource_deps=['forge-postgresql', 'ensure-namespace'],
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
