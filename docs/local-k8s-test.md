# Local Kubernetes Test Flow

This document captures a practical local test flow for running Forge in a Kubernetes cluster such as Docker Desktop Kubernetes.

## Prerequisites

1. Build a local image:

```bash
make build
# or manually: docker build -t forge:local -f build/docker/Dockerfile .
```

2. Create a namespace:

```bash
kubectl create namespace forge-test
```

3. Create required secrets. Replace placeholders with your own keys:

```bash
# Agent Gateway authentication
kubectl -n forge-test create secret generic forge-gateway \
  --from-literal=OPENCLAW_GATEWAY_TOKEN='<gateway-token>'

# Model provider key (e.g. OpenAI)
kubectl -n forge-test create secret generic forge-openai \
  --from-literal=OPENAI_API_KEY='<openai-key>'

# Optional Telegram secret
kubectl -n forge-test create secret generic forge-telegram \
  --from-literal=TELEGRAM_BOT_TOKEN='<telegram-token>'
```

## Single-Agent Deployment

Deploy a default Software Engineer agent:

```bash
helm upgrade --install forge ./src/k8s/helm/forge \
  --namespace forge-test \
  --set image.repository=forge \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set profile.name=software-engineer \
  --set profile.operatorName='Your Name' \
  --set model.provider=openai \
  --set model.name=openai/gpt-5.4 \
  --set model.alias=GPT \
  --set model.credentials.secretName=forge-openai \
  --set model.credentials.key=OPENAI_API_KEY \
  --set secrets.gatewayTokenSecretName=forge-gateway
```

## Multi-Provider Deployment (Example)

You can run more than one Forge instance in the same cluster using different providers (e.g., OpenAI vs Gemini) or distinct profiles.

1. Ensure secrets exist for the second agent (Alice using Gemini in this case):
```bash
kubectl -n forge-test create secret generic alice-gateway \
  --from-literal=OPENCLAW_GATEWAY_TOKEN='<alice-gateway-token>'

kubectl -n forge-test create secret generic alice-gemini \
  --from-literal=GEMINI_API_KEY='<alice-gemini-key>'
```

2. Deploy the second agent (Alice):
```bash
helm upgrade --install alice ./src/k8s/helm/forge \
  --namespace forge-test \
  --set image.repository=forge \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set profile.name=product-manager \
  --set profile.operatorName='Alice' \
  --set model.provider=gemini \
  --set model.name=google/gemini-2.5-flash \
  --set model.alias='Gemini Flash' \
  --set model.credentials.secretName=alice-gemini \
  --set model.credentials.key=GEMINI_API_KEY \
  --set secrets.gatewayTokenSecretName=alice-gateway
```

## Validation

Check pod health and access logs:

```bash
kubectl -n forge-test get pods
kubectl -n forge-test logs deployment/forge-forge --tail=100
```

*For multi-agent setups:*
```bash
kubectl -n forge-test logs deployment/alice-alice --tail=100
```

Optional local UI access:

```bash
kubectl -n forge-test port-forward deployment/forge-forge 18789:18789
```

## Automated Testing Script

For an automated end-to-end integration loop of these deployment scenarios, you can also use our test script:
./src/test/test-forge.sh
```
This script dynamically creates a disposable namespace, injects secrets from `.env`, runs the Helm installation, and tests internal OpenClaw health.

## Runtime note

Local cluster testing showed that the runtime needed more realistic memory defaults and explicit Node.js heap tuning. Those settings are now carried in the chart baseline.

Provider-backed models also need agent auth material available at runtime; the chart now mounts that auth store as a secret-backed file for the selected provider.
