#!/bin/sh
set -eu

export HOME=/home/node
export OPENCLAW_CONFIG_DIR=/home/node/.openclaw

mkdir -p "$OPENCLAW_CONFIG_DIR"
mkdir -p "$OPENCLAW_CONFIG_DIR/workspace"

escape_sed_replacement() {
  # Escape replacement-string metacharacters for sed:
  # '&' (matched text), '\' (escape), and our delimiter '|'.
  printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

render_profile_file() {
  src_file="$1"
  dst_file="$2"

  if command -v envsubst >/dev/null 2>&1; then
    envsubst < "$src_file" > "$dst_file"
    return
  fi

  safe_operator="$(escape_sed_replacement "${AGENT_OPERATOR_NAME:-}")"
  safe_profile="$(escape_sed_replacement "${AGENT_PROFILE:-}")"
  safe_agent="$(escape_sed_replacement "${AGENT_NAME:-}")"

  sed \
    -e "s|\${AGENT_OPERATOR_NAME}|${safe_operator}|g" \
    -e "s|\${AGENT_PROFILE}|${safe_profile}|g" \
    -e "s|\${AGENT_NAME}|${safe_agent}|g" \
    "$src_file" > "$dst_file"
}

if [ ! -f "$OPENCLAW_CONFIG_DIR/.bootstrapped" ]; then
  echo "==> Running non-interactive onboarding"

  openclaw onboard --non-interactive \
    --accept-risk \
    --skip-health \
    --mode local \
    --secret-input-mode ref \
    --gateway-auth token \
    --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
    --workspace "$OPENCLAW_CONFIG_DIR/workspace" \
    --json

  echo "==> Adding Telegram channel"
  openclaw channels add \
    --channel telegram \
    --token "$TELEGRAM_BOT_TOKEN"

  ENABLE_LINEAR_MCP=false
  if [ "${LINEAR_ENABLED:-false}" = "true" ] && [ -n "${LINEAR_API_KEY:-}" ]; then
    ENABLE_LINEAR_MCP=true
    echo "==> Linear MCP will be enabled"
  elif [ "${LINEAR_ENABLED:-false}" = "true" ]; then
    echo "==> LINEAR_ENABLED=true but LINEAR_API_KEY is empty; Linear MCP will not be configured"
  fi

  echo "==> Writing config manually"

  PROVIDER="${ACTIVE_PROVIDER:-gemini}"

  if [ "$PROVIDER" = "openai" ]; then
    PRIMARY_MODEL="openai/gpt-4.1"
    FALLBACK_MODEL="openai/gpt-4.1-mini"
  elif [ "$PROVIDER" = "gemini" ]; then
    PRIMARY_MODEL="google/gemini-3.1-pro-preview"
    FALLBACK_MODEL="google/gemini-3-flash-preview"
  else
    echo "Unknown provider: $PROVIDER"
    exit 1
  fi

  CONFIG_FILE="$OPENCLAW_CONFIG_DIR/openclaw.json"

  echo '{' > "$CONFIG_FILE"
  echo '  "gateway": {' >> "$CONFIG_FILE"
  echo '    "mode": "local",' >> "$CONFIG_FILE"
  echo '    "bind": "0.0.0.0",' >> "$CONFIG_FILE"
  echo '    "port": 18789,' >> "$CONFIG_FILE"
  echo '    "auth": { "mode": "token" },' >> "$CONFIG_FILE"
  echo '    "controlUi": { "enabled": false }' >> "$CONFIG_FILE"
  echo '  },' >> "$CONFIG_FILE"
  echo '  "agents": {' >> "$CONFIG_FILE"
  echo '    "defaults": {' >> "$CONFIG_FILE"
  echo '      "workspace": "~/.openclaw/workspace",' >> "$CONFIG_FILE"
  echo '      "model": {' >> "$CONFIG_FILE"
  echo "        \"primary\": \"$PRIMARY_MODEL\"," >> "$CONFIG_FILE"
  echo "        \"fallbacks\": [\"$FALLBACK_MODEL\"]" >> "$CONFIG_FILE"
  echo '      }' >> "$CONFIG_FILE"
  echo '    }' >> "$CONFIG_FILE"
  echo -n '  }' >> "$CONFIG_FILE"

  if [ "$ENABLE_LINEAR_MCP" = "true" ]; then
    echo ',' >> "$CONFIG_FILE"
    echo '  "mcpServers": {' >> "$CONFIG_FILE"
    echo '    "linear": {' >> "$CONFIG_FILE"
    echo '      "command": "npx",' >> "$CONFIG_FILE"
    echo '      "args": ["-y", "@modelcontextprotocol/server-linear"]' >> "$CONFIG_FILE"
    echo '    }' >> "$CONFIG_FILE"
    echo '  }' >> "$CONFIG_FILE"
  else
    echo >> "$CONFIG_FILE"
  fi

  echo '}' >> "$CONFIG_FILE"

  echo "==> Injecting profile markdown files (if provided by ConfigMap)"
  if [ -d /profile-files ]; then
    for f in AGENTS.md IDENTITY.md SOUL.md USER.md PROCESS.MD MEMORY.md HEARTBEAT.md; do
      if [ -f "/profile-files/$f" ]; then
        render_profile_file "/profile-files/$f" "$OPENCLAW_CONFIG_DIR/workspace/$f"
      fi
    done
  fi

  # Minimal fallback only when profile files were not supplied.
  AGENTS_FILE="$OPENCLAW_CONFIG_DIR/workspace/AGENTS.md"
  if [ ! -f "$AGENTS_FILE" ]; then
    {
      echo "# OpenClaw Assistant"
      echo
      echo "You are a helpful AI assistant running in Kubernetes."
      echo
      echo "Primary model: $PRIMARY_MODEL"
      echo "Fallback model: $FALLBACK_MODEL"
      echo
      echo "Main channel: Telegram"
      if [ -n "${AGENT_OPERATOR_NAME:-}" ]; then
        echo
        echo "Operator: ${AGENT_OPERATOR_NAME}"
      fi
    } > "$AGENTS_FILE"
  fi

  touch "$OPENCLAW_CONFIG_DIR/.bootstrapped"
  echo "==> Bootstrap complete"
else
  echo "==> Already bootstrapped, skipping"
fi
