# Kubernetes Deployment

This document explains the first Kubernetes deployment model for eDEV.

## Goal

Package eDEV so it can be deployed into a generic Kubernetes cluster using Helm.

This deployment model is intended to be:
- portable
- values-driven
- safe by default
- ready for later expansion toward multiple profiles and more advanced orchestration

## Current packaging

The repository includes an initial Helm chart under:

```text
k8s/helm/edev
```

## Basic deployment flow

1. Prepare a Kubernetes cluster.
2. Prepare required secrets outside Git.
3. Review and override `values.yaml` as needed.
4. Install with Helm.

Example:

```bash
helm upgrade --install edev ./k8s/helm/edev \
  --namespace edev \
  --create-namespace \
  -f ./k8s/helm/edev/values.yaml
```

## What the chart currently provisions

- a Deployment
- a Service
- a PersistentVolumeClaim for state

## Important notes

- This is an initial chart, not a final production-ready packaging layer.
- Secrets should be provided through Kubernetes Secrets or an equivalent secret-management workflow.
- OpenClaw should remain configured with safe defaults and approval-aware behavior.
- The chart is intentionally structured so it can evolve toward more profiles than just `edev` later.
