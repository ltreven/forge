#!/usr/bin/env sh
set -eu

WORKSPACE_DIR="${OPENCLAW_WORKSPACE:-/home/node/workspace}"
STATE_DIR="${OPENCLAW_CONFIG_DIR:-/home/node/.openclaw}"
MODEL_PROVIDER="${MODEL_PROVIDER:-openai}"
MODEL_ID="${MODEL_ID:-openai/gpt-5.4}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
GATEWAY_BIND="${OPENCLAW_GATEWAY_BIND:-loopback}"
BOOTSTRAP_CONFIG_DIR="/opt/edev/config"

mkdir -p "$WORKSPACE_DIR" "$STATE_DIR"
chmod 700 "$STATE_DIR" || true

if [ -d "$BOOTSTRAP_CONFIG_DIR" ]; then
  cp -Rn "$BOOTSTRAP_CONFIG_DIR"/. "$WORKSPACE_DIR"/ 2>/dev/null || true
fi

openclaw setup --mode local --non-interactive --workspace "$WORKSPACE_DIR"

case "$MODEL_PROVIDER" in
  openai)
    if [ -z "${OPENAI_API_KEY:-}" ]; then
      echo "Missing OPENAI_API_KEY" >&2
      exit 2
    fi
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice openai-api-key \
      --secret-input-mode ref \
      --gateway-port "$GATEWAY_PORT" \
      --gateway-bind "$GATEWAY_BIND"
    ;;
  gemini|google)
    if [ -z "${GEMINI_API_KEY:-}" ]; then
      echo "Missing GEMINI_API_KEY" >&2
      exit 2
    fi
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --secret-input-mode ref \
      --gateway-port "$GATEWAY_PORT" \
      --gateway-bind "$GATEWAY_BIND"
    ;;
  *)
    echo "Unsupported MODEL_PROVIDER: $MODEL_PROVIDER" >&2
    exit 2
    ;;
esac

openclaw models set "$MODEL_ID"

exec "$@"
