# Telegram on Kubernetes

This document explains how to connect a deployed eDEV instance to Telegram in a Kubernetes environment.

## Goal

Allow an operator to deploy eDEV into Kubernetes and connect it to a Telegram bot safely using Kubernetes Secrets and Helm values.

## Required inputs

At minimum, the deployment needs:
- a Telegram bot token
- an OpenClaw gateway token
- a supported model-provider secret if the agent should answer real requests

## Secret creation example

```bash
kubectl -n edev-test create secret generic edev-telegram \
  --from-literal=TELEGRAM_BOT_TOKEN='<your-telegram-bot-token>'
```

## Helm example

```bash
helm upgrade --install edev ./k8s/helm/edev \
  --namespace edev-test \
  --set image.repository=edev \
  --set image.tag=local \
  --set image.pullPolicy=IfNotPresent \
  --set secrets.gatewayTokenSecretName=edev-gateway \
  --set secrets.openaiSecretName=edev-openai \
  --set telegram.enabled=true \
  --set telegram.secretName=edev-telegram
```

## Validation

After deployment:
- confirm the pod is running
- check logs for Telegram startup messages
- send a test message to the bot
- verify the deployed agent responds as expected

## Notes

- Keep the Telegram token in a Kubernetes Secret, never in Git.
- The current chart wires Telegram token injection but does not yet model every channel-specific option that may be needed later.
- This is the first deployment-oriented Telegram baseline for Kubernetes.
