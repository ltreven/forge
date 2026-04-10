# Kubernetes Deployment

This document explains the first Kubernetes deployment model for Forge.

## Goal

Package Forge so it can be deployed into a generic Kubernetes cluster using Helm.

This deployment model is intended to be:
- portable
- values-driven
- safe by default
- ready for later expansion toward multiple profiles and more advanced orchestration

## Current packaging

The repository includes an initial Helm chart under:

src/k8s/helm/forge
```

## Basic deployment flow

1. Prepare a Kubernetes cluster.
2. Prepare required secrets outside Git.
3. Review and override `values.yaml` as needed.
4. Install with Helm.
5. If Telegram is required, create a Telegram bot token secret and enable Telegram wiring in Helm values.

Example:

```bash
helm upgrade --install forge ./src/k8s/helm/forge \
  --namespace forge \
  --create-namespace \
  -f ./src/k8s/helm/forge/values.yaml
```

Example local-cluster style override for a locally built image and explicit secrets:

```bash
helm upgrade --install forge ./src/k8s/helm/forge \
  --namespace forge-test \
  --set image.repository=forge \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set secrets.gatewayTokenSecretName=forge-gateway \
  --set model.credentials.secretName=forge-openai
```

## What the chart currently provisions

- a Deployment
- a Service
- a PersistentVolumeClaim for state when persistence is enabled
- a ConfigMap carrying the baseline `openclaw.json` runtime configuration
- optional Telegram token injection through a Kubernetes Secret reference

## Important notes

- This wave aligns the chart more closely with the validated local runtime model by carrying a baseline runtime config into Kubernetes instead of relying only on generic image defaults.
- Runtime tuning matters: local cluster testing showed that the Forge/OpenClaw runtime was not stable with the earlier lower memory defaults. The chart now carries more realistic default memory settings and supports explicit runtime environment overrides such as `NODE_OPTIONS`.
- This is still not a final production-ready packaging layer.
- Secrets should be provided through Kubernetes Secrets or an equivalent secret-management workflow.
- OpenClaw should remain configured with safe defaults and approval-aware behavior.
- The chart is intentionally structured so it can evolve toward more profiles than just `forge` later.
