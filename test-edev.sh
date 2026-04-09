#!/usr/bin/env bash

# test-edev.sh - Test the eDEV deployment in a fresh k8s namespace

set -e

echo "========================================="
echo " starting eDEV Kubernetes integration test "
echo "========================================="

# 1. Load env vars
if [ -f .env ]; then
  echo "[test] Loading .env file..."
  # Export vars from .env, ignoring comments and empty lines
  export $(grep -v '^#' .env | xargs)
else
  echo "[test] Warning: .env file not found, using default/env vars if available"
fi

DEFAULT_OPERATOR="${AGENT_OPERATOR_NAME:-Lourenço (via Test Script)}"
DEFAULT_PROFILE="${AGENT_PROFILE:-software-engineer}"

echo ""
echo "========================================="
echo "   Agent Identity & Settings             "
echo "========================================="
echo " Operator Name: $DEFAULT_OPERATOR"
echo " Profile File : $DEFAULT_PROFILE"
echo "========================================="
echo ""

IMAGE_REPO="${IMAGE_REPOSITORY:-edev}"
IMAGE_TAG="${IMAGE_TAG:-local}"

AGENT_ID=$(openssl rand -hex 4)
NAMESPACE="edev-test-$(date +%s)"
RELEASE_NAME="edev-test-release-${AGENT_ID}"

MODEL_SECRET_NAME="edev-model-${AGENT_ID}"
TELEGRAM_SECRET_NAME="edev-telegram-${AGENT_ID}"
GATEWAY_SECRET_NAME="edev-gateway-${AGENT_ID}"
LINEAR_SECRET_NAME="edev-linear-secret"

RANDOM_GATEWAY_TOKEN=$(openssl rand -hex 16)

echo "[test] Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE"

function cleanup {
  echo "========================================="
  echo "[test] Cleaning up namespace: $NAMESPACE"
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
  echo "========================================="
}

# Ensure cleanup runs on exit (both success and failure)
trap cleanup EXIT

echo "[test] Creating secrets..."

# 1. Model API Key (OpenAI or Gemini)
if [ -n "$GEMINI_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
  MODEL_PROVIDER="gemini"
  MODEL_KEY="GEMINI_API_KEY"
  MODEL_SECRET_VALUE="$GEMINI_API_KEY"
else
  # Default to OpenAI
  MODEL_PROVIDER="openai"
  MODEL_KEY="OPENAI_API_KEY"
  MODEL_SECRET_VALUE="${OPENAI_API_KEY:-dummy-key}"
fi

kubectl create secret generic "$MODEL_SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=${MODEL_KEY}="${MODEL_SECRET_VALUE}"

# 2. Telegram Bot Token (Random per agent, generated or supplied)
kubectl create secret generic "$TELEGRAM_SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-dummy-telegram-token-${AGENT_ID}}"

# 3. Random OpenClaw Gateway Token
kubectl create secret generic "$GATEWAY_SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=OPENCLAW_GATEWAY_TOKEN="${RANDOM_GATEWAY_TOKEN}"

# 4. Linear API Key (Common/Shared across agents)
kubectl create secret generic "$LINEAR_SECRET_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=LINEAR_API_KEY="${LINEAR_API_KEY:-dummy-linear-key}"

echo "[test] Installing Helm chart..."
helm install "$RELEASE_NAME" ./k8s/helm/edev \
  --namespace "$NAMESPACE" \
  --set image.repository="$IMAGE_REPO" \
  --set image.tag="$IMAGE_TAG" \
  --set image.pullPolicy=IfNotPresent \
  --set profile.name="$DEFAULT_PROFILE" \
  --set profile.operatorName="$DEFAULT_OPERATOR" \
  --set model.provider="$MODEL_PROVIDER" \
  --set model.credentials.secretName="$MODEL_SECRET_NAME" \
  --set model.credentials.key="$MODEL_KEY" \
  --set secrets.gatewayTokenSecretName="$GATEWAY_SECRET_NAME" \
  --set telegram.secretName="$TELEGRAM_SECRET_NAME" \
  --set telegram.enabled=$([ -n "$TELEGRAM_BOT_TOKEN" ] && echo "true" || echo "false") \
  --set linear.enabled=$([ -n "$LINEAR_API_KEY" ] && echo "true" || echo "false") \
  --set linear.credentials.secretName="$LINEAR_SECRET_NAME" \
  --set persistence.enabled=false \
  --wait \
  --timeout 3m

echo "[test] Helm release installed. Finding pod name..."
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "[error] Could not find edev pod."
  exit 1
fi

echo "[test] Pod found: $POD_NAME"
echo "[test] Checking if OpenClaw is running and responding..."

# Verify openclaw binary is accessible
echo "[test] Executing 'openclaw --help' inside the container..."
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- openclaw --help > /dev/null
echo "  -> OpenClaw binary is present and responding."

# Verify environment variables are injected correctly
echo "[test] Checking environment variables inside container..."
kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
  if [ -z \"\$${MODEL_KEY}\" ]; then
    echo \"Error: ${MODEL_KEY} is not set inside the container\"
    exit 1
  fi
  if [ -z \"\$OPENCLAW_GATEWAY_TOKEN\" ]; then
    echo \"Error: OPENCLAW_GATEWAY_TOKEN is not set inside the container\"
    exit 1
  fi
  if [ \"\$AGENT_OPERATOR_NAME\" != \"$DEFAULT_OPERATOR\" ]; then
    echo \"Error: AGENT_OPERATOR_NAME mismatch. Expected $DEFAULT_OPERATOR, got \$AGENT_OPERATOR_NAME\"
    exit 1
  fi
  if [ \"\$AGENT_PROFILE\" != \"$DEFAULT_PROFILE\" ]; then
    echo \"Error: AGENT_PROFILE mismatch. Expected $DEFAULT_PROFILE, got \$AGENT_PROFILE\"
    exit 1
  fi
  echo \"  -> Required API keys and tokens are configured properly.\"
  echo \"  -> Identity (Operator: \$AGENT_OPERATOR_NAME, Profile: \$AGENT_PROFILE) validated.\"
"

echo "[test] All checks passed successfully!"

echo ""
echo "========================================="
echo " Tests completed. The namespace $NAMESPACE is active."
echo " You can explore the pods using: kubectl -n $NAMESPACE get pods"
echo " Press any key to tear down the namespace and exit..."
echo "========================================="
read -n 1 -s -r

