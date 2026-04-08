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
  --set model.provider=openai \
  --set model.name=openai/gpt-5.4 \
  --set model.alias=GPT \
  --set model.credentials.secretName=edev-openai \
  --set model.credentials.key=OPENAI_API_KEY \
  --set secrets.gatewayTokenSecretName=edev-gateway \
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
- The chart now uses the generic `model.*` schema for provider configuration.
- Provider-backed models also need agent auth material available at runtime; the chart mounts that auth store as a secret-backed file for the selected provider.
- This is the first deployment-oriented Telegram baseline for Kubernetes.
