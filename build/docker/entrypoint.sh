#!/usr/bin/env sh
set -eu

OPENCLAW_DIR="${OPENCLAW_CONFIG_DIR:-/home/node/.openclaw}"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE:-/home/node/workspace}"
AGENT_ID="${OPENCLAW_AGENT_ID:-main}"
AGENT_DIR="${OPENCLAW_DIR}/agents/${AGENT_ID}/agent"
MODEL_PROVIDER="${MODEL_PROVIDER:-openai}"
MODEL_NAME="${MODEL_NAME:-openai/gpt-5.4}"
MODEL_ALIAS="${MODEL_ALIAS:-GPT}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-loopback}"
TOOLS_PROFILE="${OPENCLAW_TOOLS_PROFILE:-coding}"
SESSION_DM_SCOPE="${OPENCLAW_SESSION_DM_SCOPE:-per-channel-peer}"
TEMPLATE_DIR="/opt/edev/templates"
BOOTSTRAP_CONFIG_DIR="/opt/edev/config"

mkdir -p "$OPENCLAW_DIR" "$WORKSPACE_DIR" "$AGENT_DIR"
chmod 700 "$OPENCLAW_DIR" || true

if [ -d "$BOOTSTRAP_CONFIG_DIR" ]; then
  cp -Rn "$BOOTSTRAP_CONFIG_DIR"/. "$WORKSPACE_DIR"/ 2>/dev/null || true
fi

case "$MODEL_PROVIDER" in
  openai)
    AUTH_PROFILE_ID="openai:default"
    AUTH_PROVIDER="openai"
    MODEL_API_KEY="${OPENAI_API_KEY:-}"
    ;;
  gemini|google)
    AUTH_PROFILE_ID="google:default"
    AUTH_PROVIDER="google"
    MODEL_API_KEY="${GEMINI_API_KEY:-}"
    ;;
  *)
    echo "Unsupported MODEL_PROVIDER: $MODEL_PROVIDER" >&2
    exit 2
    ;;
esac

if [ -z "$MODEL_API_KEY" ]; then
  echo "Missing provider API key for MODEL_PROVIDER=$MODEL_PROVIDER" >&2
  exit 2
fi

OPENCLAW_DIR="$OPENCLAW_DIR" \
WORKSPACE_DIR="$WORKSPACE_DIR" \
AGENT_DIR="$AGENT_DIR" \
AUTH_PROFILE_ID="$AUTH_PROFILE_ID" \
AUTH_PROVIDER="$AUTH_PROVIDER" \
MODEL_NAME="$MODEL_NAME" \
MODEL_ALIAS="$MODEL_ALIAS" \
MODEL_API_KEY="$MODEL_API_KEY" \
GATEWAY_PORT="$GATEWAY_PORT" \
GATEWAY_BIND="$GATEWAY_BIND" \
TOOLS_PROFILE="$TOOLS_PROFILE" \
SESSION_DM_SCOPE="$SESSION_DM_SCOPE" \
TEMPLATE_DIR="$TEMPLATE_DIR" \
python3 - <<'PY'
import os
from pathlib import Path

def render(template: str, values: dict[str, str]) -> str:
    out = template
    for key, value in values.items():
        out = out.replace(f'__{key}__', value)
    return out

template_dir = Path(os.environ['TEMPLATE_DIR'])
openclaw_template = (template_dir / 'openclaw.json.template').read_text()
auth_template = (template_dir / 'auth-profiles.json.template').read_text()
values = {
    'AUTH_PROFILE_ID': os.environ['AUTH_PROFILE_ID'],
    'AUTH_PROVIDER': os.environ['AUTH_PROVIDER'],
    'MODEL_NAME': os.environ['MODEL_NAME'],
    'MODEL_ALIAS': os.environ['MODEL_ALIAS'],
    'WORKSPACE_DIR': os.environ['WORKSPACE_DIR'],
    'GATEWAY_PORT': os.environ['GATEWAY_PORT'],
    'GATEWAY_BIND': os.environ['GATEWAY_BIND'],
    'TOOLS_PROFILE': os.environ['TOOLS_PROFILE'],
    'SESSION_DM_SCOPE': os.environ['SESSION_DM_SCOPE'],
    'MODEL_API_KEY': os.environ['MODEL_API_KEY'],
}
Path(os.environ['OPENCLAW_DIR'], 'openclaw.json').write_text(render(openclaw_template, values))
Path(os.environ['AGENT_DIR'], 'auth-profiles.json').write_text(render(auth_template, values))
PY

chmod 600 "$OPENCLAW_DIR/openclaw.json" "$AGENT_DIR/auth-profiles.json" || true

exec "$@"
