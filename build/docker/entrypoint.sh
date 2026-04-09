#!/usr/bin/env sh
set -eu

MODEL_PROVIDER="${MODEL_PROVIDER:-openai}"
MODEL_ID="${MODEL_ID:-openai/gpt-5.4}"
AGENT_PROFILE="${AGENT_PROFILE:-software-engineer}"
AGENT_OPERATOR_NAME="${AGENT_OPERATOR_NAME:-Operator}"

BOOTSTRAP_CONFIG_DIR="/opt/edev/profiles/$AGENT_PROFILE"

mkdir -p /home/node/workspace /home/node/.openclaw
chmod 700 /home/node/.openclaw 2>/dev/null || true

if [ "$MODEL_PROVIDER" = "openai" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
  openclaw onboard --non-interactive --accept-risk --skip-health \
    --workspace /home/node/workspace \
    --mode local --auth-choice openai-api-key --secret-input-mode ref \
    --gateway-port 18789 --gateway-bind loopback
elif [ -n "${GEMINI_API_KEY:-}" ]; then
  openclaw onboard --non-interactive --accept-risk --skip-health \
    --workspace /home/node/workspace \
    --mode local --auth-choice gemini-api-key --secret-input-mode ref \
    --gateway-port 18789 --gateway-bind loopback
fi

if [ -d "$BOOTSTRAP_CONFIG_DIR" ]; then
  # Force copy (no -n) to ensure our openclaw.json overwrites any onboard-generated defaults
  cp -Rf "$BOOTSTRAP_CONFIG_DIR"/. /home/node/workspace/ 2>/dev/null || true
  if [ -f /home/node/workspace/USER.md ]; then
    sed -i "s/\${AGENT_OPERATOR_NAME}/$AGENT_OPERATOR_NAME/g" /home/node/workspace/USER.md 2>/dev/null || true
  fi
fi

openclaw models set "$MODEL_ID" 2>/dev/null || true

# Hammer the main agent's internal configuration to forcibly use our Model
AGENT_DIR="/home/node/.openclaw/agents/main/agent"
if [ -d "$AGENT_DIR" ]; then
  # 1. Force Auth Profile to OpenAI
  echo '{"profiles":{"openai:default":{"provider":"openai","mode":"api_key"}}}' > "$AGENT_DIR/auth-profiles.json"
  # 2. Force default agent config to our Model
  echo "{\"model\": {\"primary\": \"$MODEL_ID\"}}" > "$AGENT_DIR/config.json"
  echo "{\"model\": {\"primary\": \"$MODEL_ID\"}}" > "$AGENT_DIR/openclaw.json"
fi

# Ensure bootstrap files exist for OpenClaw internally by linking SOUL.md
if [ -f /home/node/workspace/SOUL.md ]; then
  ln -sf /home/node/workspace/SOUL.md /home/node/workspace/system.md
fi

exec "$@"
