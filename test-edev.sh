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

echo ""
echo "========================================="
echo "   Agent Identity & Settings             "
echo "========================================="
echo " ENGINEER: ${ENGINEER_AGENT_NAME:-Alice} / ${ENGINEER_AGENT_PROFILE:-software-engineer} / ${ENGINEER_AGENT_OPERATOR_NAME:-Lourenco}"
echo " PM      : ${PM_AGENT_NAME:-Assiscleidson} / ${PM_AGENT_PROFILE:-product-manager} / ${PM_AGENT_OPERATOR_NAME:-Lourenco}"
echo "========================================="
echo ""

NAMESPACE="edev-test-$(date +%s)"

echo "[test] Creating namespace: $NAMESPACE"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | \
  kubectl apply -f -

function cleanup {
  echo "========================================="
  echo "[test] Cleaning up namespace: $NAMESPACE"
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
  echo "========================================="
}

# Ensure cleanup runs on exit (both success and failure)
trap cleanup EXIT

create_profile_configmap() {
  local profile="$1"
  local cm_name="$2"
  local base_dir="src/agent/profiles/${profile}"

  if [ ! -d "$base_dir" ]; then
    echo "[error] Profile directory not found: $base_dir"
    exit 1
  fi

  kubectl create configmap "$cm_name" \
    --namespace "$NAMESPACE" \
    --from-file="${base_dir}/"
}

deploy_agent() {
  local prefix="$1"
  local release_name="$2"

  local operator_var="${prefix}_AGENT_OPERATOR_NAME"
  local profile_var="${prefix}_AGENT_PROFILE"
  local agent_name_var="${prefix}_AGENT_NAME"
  local gateway_var="${prefix}_OPENCLAW_GATEWAY_TOKEN"
  local openai_var="${prefix}_OPENAI_API_KEY"
  local gemini_var="${prefix}_GEMINI_API_KEY"
  local telegram_var="${prefix}_TELEGRAM_BOT_TOKEN"

  local operator_name="${!operator_var:-Lourenco (via Test Script)}"
  local profile_name="${!profile_var:-software-engineer}"
  local agent_name="${!agent_name_var:-${prefix,,}-agent}"
  local gateway_token="${!gateway_var:-$(openssl rand -hex 16)}"
  local openai_key="${!openai_var:-}"
  local gemini_key="${!gemini_var:-}"
  local telegram_token="${!telegram_var:-}"

  local model_provider
  local model_key
  local model_secret_value

  if [ -n "$gemini_key" ] && [ -z "$openai_key" ]; then
    model_provider="gemini"
    model_key="GEMINI_API_KEY"
    model_secret_value="$gemini_key"
  else
    model_provider="openai"
    model_key="OPENAI_API_KEY"
    model_secret_value="${openai_key:-dummy-key}"
  fi

  local suffix
  suffix=$(openssl rand -hex 3)
  local model_secret_name="${release_name}-model-${suffix}"
  local telegram_secret_name="${release_name}-telegram-${suffix}"
  local gateway_secret_name="${release_name}-gateway-${suffix}"
  local profile_cm_name="${release_name}-profile-${suffix}"

  echo "[test] Creating secrets for ${prefix} (${release_name})..."
  kubectl create secret generic "$model_secret_name" \
    --namespace "$NAMESPACE" \
    --from-literal="${model_key}=${model_secret_value}"

  kubectl create secret generic "$telegram_secret_name" \
    --namespace "$NAMESPACE" \
    --from-literal="TELEGRAM_BOT_TOKEN=${telegram_token:-dummy-telegram-token-${suffix}}"

  kubectl create secret generic "$gateway_secret_name" \
    --namespace "$NAMESPACE" \
    --from-literal="OPENCLAW_GATEWAY_TOKEN=${gateway_token}"

  echo "[test] Creating profile ConfigMap for ${prefix} (${profile_name})..."
  create_profile_configmap "$profile_name" "$profile_cm_name"

  echo "[test] Installing Helm chart for ${prefix} (${release_name})..."
  helm install "$release_name" ./k8s/helm/edev \
    --namespace "$NAMESPACE" \
    --set image.pullPolicy=IfNotPresent \
    --set profile.name="$profile_name" \
    --set profile.operatorName="$operator_name" \
    --set profile.agentName="$agent_name" \
    --set profile.configMapName="$profile_cm_name" \
    --set model.provider="$model_provider" \
    --set model.credentials.secretName="$model_secret_name" \
    --set model.credentials.key="$model_key" \
    --set secrets.gatewayTokenSecretName="$gateway_secret_name" \
    --set telegram.secretName="$telegram_secret_name" \
    --set telegram.enabled=$([ -n "$telegram_token" ] && echo "true" || echo "false") \
    --set persistence.enabled=true \
    --wait \
    --timeout 3m

  local pod_name
  pod_name=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$release_name" -o jsonpath='{.items[0].metadata.name}')

  if [ -z "$pod_name" ]; then
    echo "[error] Could not find pod for release: $release_name"
    exit 1
  fi

  echo "[test] Pod found for ${prefix}: $pod_name"

  echo "[test] Checking OpenClaw binary for ${prefix}..."
  kubectl exec -n "$NAMESPACE" "$pod_name" -- openclaw --help > /dev/null

  echo "[test] Checking env variables for ${prefix}..."
  kubectl exec -n "$NAMESPACE" "$pod_name" -- sh -c "
    if [ -z \"\$${model_key}\" ]; then
      echo \"Error: ${model_key} is not set inside the container\"
      exit 1
    fi
    if [ -z \"\$OPENCLAW_GATEWAY_TOKEN\" ]; then
      echo \"Error: OPENCLAW_GATEWAY_TOKEN is not set inside the container\"
      exit 1
    fi
    if [ \"\$AGENT_OPERATOR_NAME\" != \"$operator_name\" ]; then
      echo \"Error: AGENT_OPERATOR_NAME mismatch. Expected $operator_name, got \$AGENT_OPERATOR_NAME\"
      exit 1
    fi
    if [ \"\$AGENT_PROFILE\" != \"$profile_name\" ]; then
      echo \"Error: AGENT_PROFILE mismatch. Expected $profile_name, got \$AGENT_PROFILE\"
      exit 1
    fi
    if [ \"\$AGENT_NAME\" != \"$agent_name\" ]; then
      echo \"Error: AGENT_NAME mismatch. Expected $agent_name, got \$AGENT_NAME\"
      exit 1
    fi
    if [ ! -f \"\$OPENCLAW_CONFIG_DIR/workspace/SOUL.md\" ]; then
      echo \"Error: SOUL.md not found in workspace\"
      exit 1
    fi
    if [ ! -f \"\$OPENCLAW_CONFIG_DIR/workspace/USER.md\" ]; then
      echo \"Error: USER.md not found in workspace\"
      exit 1
    fi
    if ! grep -q \"$operator_name\" \"\$OPENCLAW_CONFIG_DIR/workspace/USER.md\"; then
      echo \"Error: operator name placeholder was not rendered in USER.md\"
      exit 1
    fi
    echo \"  -> Keys, identity env vars, and profile markdown files validated.\"
  "
}

deploy_agent "ENGINEER" "engineer"
deploy_agent "PM" "pm"

echo "[test] All checks passed successfully!"

echo ""
echo "========================================="
echo " Tests completed. The namespace $NAMESPACE is active."
echo " You can explore the pods using: kubectl -n $NAMESPACE get pods"
echo " Press any key to tear down the namespace and exit..."
echo "========================================="
read -n 1 -s -r
