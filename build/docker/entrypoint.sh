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

mkdir -p "$OPENCLAW_DIR" "$WORKSPACE_DIR" "$AGENT_DIR"
chmod 700 "$OPENCLAW_DIR" || true

case "$MODEL_PROVIDER" in
  openai)
    AUTH_PROFILE_ID="openai:default"
    AUTH_PROVIDER="openai"
    AUTH_ENV_KEY="OPENAI_API_KEY"
    ;;
  gemini|google)
    AUTH_PROFILE_ID="google:default"
    AUTH_PROVIDER="google"
    AUTH_ENV_KEY="GEMINI_API_KEY"
    ;;
  *)
    echo "Unsupported MODEL_PROVIDER: $MODEL_PROVIDER" >&2
    exit 2
    ;;
esac

AUTH_VALUE="$(printenv "$AUTH_ENV_KEY" 2>/dev/null || true)"
if [ -z "$AUTH_VALUE" ]; then
  echo "Missing provider API key env: $AUTH_ENV_KEY" >&2
  exit 2
fi

cat > "$OPENCLAW_DIR/openclaw.json" <<EOF
{
  "auth": {
    "profiles": {
      "$AUTH_PROFILE_ID": {
        "provider": "$AUTH_PROVIDER",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "$MODEL_NAME"
      },
      "models": {
        "$MODEL_NAME": {
          "alias": "$MODEL_ALIAS"
        }
      },
      "workspace": "$WORKSPACE_DIR"
    }
  },
  "tools": {
    "profile": "$TOOLS_PROFILE"
  },
  "session": {
    "dmScope": "$SESSION_DM_SCOPE"
  },
  "gateway": {
    "mode": "local",
    "port": $GATEWAY_PORT,
    "bind": "$GATEWAY_BIND",
    "auth": {
      "mode": "token",
      "token": "\${OPENCLAW_GATEWAY_TOKEN}"
    }
  }
}
EOF

AUTH_PROFILE_ID="$AUTH_PROFILE_ID" AUTH_PROVIDER="$AUTH_PROVIDER" AUTH_ENV_KEY="$AUTH_ENV_KEY" AGENT_DIR="$AGENT_DIR" python3 - <<'PY'
import json, os
path = os.path.join(os.environ['AGENT_DIR'], 'auth-profiles.json')
profile_id = os.environ['AUTH_PROFILE_ID']
provider = os.environ['AUTH_PROVIDER']
api_key = os.environ[os.environ['AUTH_ENV_KEY']]
with open(path, 'w') as f:
    json.dump({
        'profiles': {
            profile_id: {
                'provider': provider,
                'mode': 'api_key',
                'apiKey': api_key,
            }
        }
    }, f)
PY

chmod 600 "$OPENCLAW_DIR/openclaw.json" "$AGENT_DIR/auth-profiles.json" || true

exec "$@"
