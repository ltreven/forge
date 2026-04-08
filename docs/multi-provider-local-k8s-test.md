# Multi-Provider Local Kubernetes Test

This document explains a simple local-cluster test for running more than one eDEV instance in the same Kubernetes cluster with different providers.

## Example goal

- Bob uses OpenAI
- Alice uses Gemini

## Create secrets

### Bob / OpenAI

```bash
kubectl -n edev-team create secret generic bob-gateway \
  --from-literal=OPENCLAW_GATEWAY_TOKEN='<bob-gateway-token>'

kubectl -n edev-team create secret generic bob-openai \
  --from-literal=OPENAI_API_KEY='<bob-openai-key>'
```

### Alice / Gemini

```bash
kubectl -n edev-team create secret generic alice-gateway \
  --from-literal=OPENCLAW_GATEWAY_TOKEN='<alice-gateway-token>'

kubectl -n edev-team create secret generic alice-gemini \
  --from-literal=GEMINI_API_KEY='<alice-gemini-key>'
```

## Deploy Bob

```bash
helm upgrade --install bob ./k8s/helm/edev \
  --namespace edev-team \
  --set image.repository=edev \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set profile.name=bob \
  --set model.provider=openai \
  --set model.name=openai/gpt-5.4 \
  --set model.alias=GPT \
  --set model.credentials.secretName=bob-openai \
  --set model.credentials.key=OPENAI_API_KEY \
  --set secrets.gatewayTokenSecretName=bob-gateway
```

## Deploy Alice

```bash
helm upgrade --install alice ./k8s/helm/edev \
  --namespace edev-team \
  --set image.repository=edev \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set profile.name=alice \
  --set model.provider=gemini \
  --set model.name=google/gemini-2.5-flash \
  --set model.alias='Gemini Flash' \
  --set model.credentials.secretName=alice-gemini \
  --set model.credentials.key=GEMINI_API_KEY \
  --set secrets.gatewayTokenSecretName=alice-gateway
```

## Validation

```bash
kubectl -n edev-team get pods
kubectl -n edev-team logs deployment/bob-bob --tail=100
kubectl -n edev-team logs deployment/alice-alice --tail=100
```

## Notes

This test is intended to validate the current narrow multi-provider implementation, not the final long-term provider architecture.

Provider-backed models also need agent auth material available at runtime. Without that auth file, a deployment can start but still fail on first reply with provider auth errors.
