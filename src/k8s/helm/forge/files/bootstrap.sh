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
  echo '    "bind": "lan",' >> "$CONFIG_FILE"
  echo '    "port": 18789,' >> "$CONFIG_FILE"
  echo '    "auth": { "mode": "token" },' >> "$CONFIG_FILE"
  echo '    "controlUi": { "enabled": false }' >> "$CONFIG_FILE"
  echo '  },' >> "$CONFIG_FILE"
  echo '  "agents": {' >> "$CONFIG_FILE"
  echo '    "defaults": {' >> "$CONFIG_FILE"
  echo '      "workspace": "~/.openclaw/workspace",' >> "$CONFIG_FILE"
  echo '      "subagents": { "allowAgents": ["*"] },' >> "$CONFIG_FILE"
  echo '      "model": {' >> "$CONFIG_FILE"
  echo "        \"primary\": \"$PRIMARY_MODEL\"," >> "$CONFIG_FILE"
  echo "        \"fallbacks\": [\"$FALLBACK_MODEL\"]" >> "$CONFIG_FILE"
  echo '      }' >> "$CONFIG_FILE"
  echo '    }' >> "$CONFIG_FILE"
  echo '  }' >> "$CONFIG_FILE"
  echo '}' >> "$CONFIG_FILE"

  if [ "$ENABLE_LINEAR_MCP" = "true" ]; then
    echo "==> Pre-installing @sylphx/linear-mcp into persistent volume"
    MCP_PKG_DIR="$OPENCLAW_CONFIG_DIR/mcp-packages"
    mkdir -p "$MCP_PKG_DIR"
    # Install the package into the persistent volume so the main container doesn't need network access
    npm install --prefix "$MCP_PKG_DIR" --save "@sylphx/linear-mcp" \
      --cache /tmp/.npm \
      --prefer-offline 2>&1 || \
    npm install --prefix "$MCP_PKG_DIR" --save "@sylphx/linear-mcp" \
      --cache /tmp/.npm 2>&1

    # Resolve the binary path
    LINEAR_MCP_BIN="$MCP_PKG_DIR/node_modules/.bin/linear-mcp"

    echo "==> Configuring linear MCP server via OpenClaw CLI (pre-installed binary)"
    JSON_ARG="{\"command\":\"node\",\"args\":[\"$MCP_PKG_DIR/node_modules/@sylphx/linear-mcp/dist/index.js\"],\"env\":{\"LINEAR_API_KEY\":\"${LINEAR_API_KEY}\"}}"
    openclaw mcp set linear "$JSON_ARG"

    echo "==> Creating linear SKILL.md for the agent context"
    mkdir -p "$OPENCLAW_CONFIG_DIR/workspace/skills/linear"
    cat << 'EOF' > "$OPENCLAW_CONFIG_DIR/workspace/skills/linear/SKILL.md"
---
name: linear
description: Manage Linear issues, projects, and teams natively via MCP.
metadata: { "openclaw": { "emoji": "🔗" } }
---

# Linear Integration

You have direct access to Linear through native MCP tools. 
Use these tools to query and manage work items.

## Available Native Tools:
- `linear_issue_search`: Search issues by text or filter.
- `linear_issue_get`: Retrieve full details of a specific issue.
- `linear_issue_create`: Create new issues.
- `linear_issue_update`: Update issue state, assignee, or text.
- `linear_team_list`: Find teams and their IDs.
- `linear_project_list`: Find projects and their IDs.

## Important Note
You DO NOT need external scripts like `curl` or `mcporter`. Call the native tools directly through your tool calling interface.
EOF
  fi

  echo "==> Creating symlink for openclaw.json so the agent can inspect it"
  ln -sf "$CONFIG_FILE" "$OPENCLAW_CONFIG_DIR/workspace/openclaw.json"

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
