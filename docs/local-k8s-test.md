# Local Kubernetes Test Flow

This document captures a practical local test flow for running eDEV in a Kubernetes cluster such as Docker Desktop Kubernetes.

## Suggested flow

1. Build a local image:

```bash
docker build -t edev:local -f build/docker/Dockerfile .
```

2. Create a namespace:

```bash
kubectl create namespace edev-test
```

3. Create required secrets:

```bash
kubectl -n edev-test create secret generic edev-gateway \
  --from-literal=OPENCLAW_GATEWAY_TOKEN='<gateway-token>'

kubectl -n edev-test create secret generic edev-openai \
  --from-literal=OPENAI_API_KEY='<openai-key>'
```

Optional Telegram secret:

```bash
kubectl -n edev-test create secret generic edev-telegram \
  --from-literal=TELEGRAM_BOT_TOKEN='<telegram-token>'
```

4. Install the chart:

```bash
helm upgrade --install edev ./k8s/helm/edev \
  --namespace edev-test \
  --set image.repository=edev \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set model.provider=openai \
  --set model.name=openai/gpt-5.4 \
  --set model.alias=GPT \
  --set model.credentials.secretName=edev-openai \
  --set model.credentials.key=OPENAI_API_KEY \
  --set secrets.gatewayTokenSecretName=edev-gateway
```

5. Check pod health:

```bash
kubectl -n edev-test get pods
kubectl -n edev-test logs deployment/edev-edev --tail=100
```

6. Optional local access:

```bash
kubectl -n edev-test port-forward deployment/edev-edev 18789:18789
```

## Runtime note

Local cluster testing showed that the runtime needed more realistic memory defaults and explicit Node.js heap tuning. Those settings are now carried in the chart baseline.

The chart also now provisions provider auth into the agent runtime store so provider-backed models such as OpenAI and Gemini can answer through the embedded agent path.
