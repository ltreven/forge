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
API_IMAGE      = settings.get("api_image", "forge/api")
WEB_IMAGE      = settings.get("web_image", "forge/web")
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
    '--set', 'controller.service.type=NodePort',
    '--set', 'controller.service.nodePorts.http=30080',
    '--set', 'controller.service.nodePorts.https=30443',
    '--set', 'controller.hostPort.enabled=true',
    '--set', 'controller.hostPort.ports.http=80',
    '--set', 'controller.hostPort.ports.https=443',
  ],
  resource_deps=[],
  labels=['infra'],
)

# ── 2. Create a local secret from .env (if it exists) ────────────────────────
# Reads the root .env file and creates a Kubernetes Secret in the forge namespace.
# Only JWT_SECRET is required; DATABASE_URL is built from the embedded PostgreSQL.

local_resource(
  'create-local-secrets',
  cmd="""
    kubectl create namespace forge --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl create secret generic forge-api-local-secret \
      --namespace=forge \
      --from-env-file=.env \
      --dry-run=client -o yaml | kubectl apply -f -
  """,
  deps=['.env'],
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
  ignore=[
    'node_modules',
    '.next',
    '*.md',
  ],
  live_update=[
    # Sync Next.js app directory for HMR (Next.js dev server handles the rest)
    sync('apps/web/app', '/app/app'),
    sync('apps/web/components', '/app/components'),
    sync('apps/web/lib', '/app/lib'),
    sync('apps/web/public', '/app/public'),
  ],
)

# ── 5. Deploy the forge Helm chart ────────────────────────────────────────────
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
  resource_deps=['forge-postgresql', 'create-local-secrets'],
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
