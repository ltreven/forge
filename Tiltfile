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
# docker_build registers the image with Tilt. Tilt SUBSTITUTES the tag from
# forge/agent:local → forge/agent:tilt-XXXX (the actual built digest) in any
# k8s_yaml it manages that references this image.
# The ConfigMap below carries the substituted tag. The Go controller reads it,
# so agent pods always use the exact image Tilt has loaded into k8s containerd.
# pullPolicy: IfNotPresent (not Never) — safe since the image is from a build.
docker_build(
  AGENT_IMAGE,
  context='apps/agents',
  dockerfile='apps/agents/Dockerfile',
  ignore=['*.md'],
)

# ConfigMap in forge namespace that holds the current agent image ref.
# Tilt will substitute AGENT_IMAGE here → the exact tilt-tagged digest.
# The Go controller reads this to build agent Deployments.
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
