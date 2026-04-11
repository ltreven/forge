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

  ENABLE_GITHUB_MCP=false
  GITHUB_AUTH_MODE="${GITHUB_AUTH_MODE:-pat}"
  if [ "${GITHUB_ENABLED:-false}" = "true" ]; then
    if [ "$GITHUB_AUTH_MODE" = "pat" ]; then
      if [ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
        ENABLE_GITHUB_MCP=true
        echo "==> GitHub MCP will be enabled (remote PAT mode)"
      else
        echo "==> GITHUB_ENABLED=true but GITHUB_PERSONAL_ACCESS_TOKEN is empty; GitHub MCP will not be configured"
      fi
    elif [ "$GITHUB_AUTH_MODE" = "app" ]; then
      if [ -n "${GITHUB_APP_ID:-}" ] && [ -n "${GITHUB_INSTALLATION_ID:-}" ] && [ -n "${GITHUB_APP_PRIVATE_KEY:-}" ]; then
        ENABLE_GITHUB_MCP=true
        echo "==> GitHub MCP will be enabled (GitHub App mode)"
      else
        echo "==> GITHUB_ENABLED=true and GITHUB_AUTH_MODE=app, but one or more app vars are missing"
      fi
    else
      echo "==> Unknown GITHUB_AUTH_MODE='$GITHUB_AUTH_MODE'; expected 'pat' or 'app'"
    fi
  fi

  echo "==> Writing config manually"

  # Normalize 'google' -> 'gemini' so both spellings work
  PROVIDER="${ACTIVE_PROVIDER:-gemini}"
  if [ "$PROVIDER" = "google" ]; then
    PROVIDER="gemini"
  fi

  MODEL_NAME="${ACTIVE_MODEL_NAME:-}"

  if [ "$PROVIDER" = "openai" ]; then
    _primary_name="${MODEL_NAME:-gpt-4.1}"
    PRIMARY_MODEL="openai/${_primary_name}"
    FALLBACK_MODEL="openai/gpt-4.1-mini"
  elif [ "$PROVIDER" = "gemini" ]; then
    _primary_name="${MODEL_NAME:-gemini-2.5-flash}"
    PRIMARY_MODEL="google/${_primary_name}"
    FALLBACK_MODEL="google/gemini-2.0-flash"
  else
    echo "Unknown provider: $PROVIDER (accepted: openai, gemini, google)"
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

    # Resolve the binary path for readability and easier future swaps.
    LINEAR_MCP_BIN="$MCP_PKG_DIR/node_modules/@sylphx/linear-mcp/dist/index.js"

    echo "==> Configuring linear MCP server via OpenClaw CLI (pre-installed binary)"
    JSON_ARG="{\"command\":\"node\",\"args\":[\"$LINEAR_MCP_BIN\"],\"env\":{\"LINEAR_API_KEY\":\"${LINEAR_API_KEY}\"}}"
    openclaw mcp set linear "$JSON_ARG"

    echo "==> Creating linear SKILL.md for the agent context"
    mkdir -p "$OPENCLAW_CONFIG_DIR/workspace/skills/linear"
    cat << 'SKILL_EOF' > "$OPENCLAW_CONFIG_DIR/workspace/skills/linear/SKILL.md"
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
SKILL_EOF
  fi

  if [ "$ENABLE_GITHUB_MCP" = "true" ]; then
    echo "==> Pre-installing @modelcontextprotocol/server-github into persistent volume"
    npm install --prefix "$MCP_PKG_DIR" --save "@modelcontextprotocol/server-github" \
      --cache /tmp/.npm \
      --prefer-offline 2>&1 || \
    npm install --prefix "$MCP_PKG_DIR" --save "@modelcontextprotocol/server-github" \
      --cache /tmp/.npm 2>&1

    if [ "$GITHUB_AUTH_MODE" = "pat" ]; then
      echo "==> Configuring GitHub MCP server via OpenClaw CLI (local stdio, PAT mode)"
      GITHUB_MCP_BIN="$MCP_PKG_DIR/node_modules/@modelcontextprotocol/server-github/dist/index.js"
      JSON_ARG="{\"command\":\"node\",\"args\":[\"$GITHUB_MCP_BIN\"],\"env\":{\"GITHUB_PERSONAL_ACCESS_TOKEN\":\"${GITHUB_PERSONAL_ACCESS_TOKEN}\"}}"
    elif [ "$GITHUB_AUTH_MODE" = "app" ]; then
      echo "==> Configuring GitHub MCP server via OpenClaw CLI (GitHub App stdio mode)"
      GITHUB_APP_COMMAND="${GITHUB_APP_COMMAND:-node}"
      GITHUB_APP_SCRIPT_PATH="${GITHUB_APP_SCRIPT_PATH:-/opt/mcp/github-app-server.js}"
      JSON_ARG="{\"command\":\"${GITHUB_APP_COMMAND}\",\"args\":[\"${GITHUB_APP_SCRIPT_PATH}\"],\"env\":{\"GITHUB_APP_ID\":\"${GITHUB_APP_ID}\",\"GITHUB_INSTALLATION_ID\":\"${GITHUB_INSTALLATION_ID}\",\"GITHUB_APP_PRIVATE_KEY\":\"${GITHUB_APP_PRIVATE_KEY}\"}}"
    else
      echo "==> Unknown GITHUB_AUTH_MODE='$GITHUB_AUTH_MODE'; skipping GitHub MCP configuration"
      JSON_ARG=""
    fi

    if [ -z "$JSON_ARG" ]; then
      echo "==> GitHub MCP JSON was not generated; skipping openclaw mcp set github"
    else
      openclaw mcp set github "$JSON_ARG"
    fi

    echo "==> Creating github SKILL.md for the agent context"
    mkdir -p "$OPENCLAW_CONFIG_DIR/workspace/skills/github"
    cat << 'SKILL_EOF' > "$OPENCLAW_CONFIG_DIR/workspace/skills/github/SKILL.md"
---
name: github
description: Manage repositories, pull requests, and issues in GitHub via MCP.
metadata: { "openclaw": { "emoji": "🐙" } }
---

# GitHub Integration

You have direct access to GitHub through native MCP tools.
Use these tools first for repository discovery, issue triage, and pull-request workflows.

## Usage Rules
- Prefer GitHub MCP tools over shell scripts for repository, issue, and PR operations.
- Keep operations scoped to the minimum repository and permission set required.
- For destructive actions, confirm intent before invoking write tools.
SKILL_EOF
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
