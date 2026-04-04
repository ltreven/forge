# Provider Configuration

This document explains how model provider choices should be represented in the eDEV deployment model.

## Principle

Provider and model configuration must be deployment-driven rather than hardcoded.

That means operators should be able to adapt eDEV per customer environment by changing Helm values and referenced secrets.

## Current Helm values

The chart currently exposes:

```yaml
provider:
  name: openai
  model: openai/gpt-5.4
```

## Secret handling

Secrets must stay outside Git.

The chart expects provider credentials to come from Kubernetes Secrets.

Example pattern:

```yaml
secrets:
  providerSecretName: edev-provider
  providerKeyName: OPENAI_API_KEY
```

## OpenAI-style example

```yaml
provider:
  name: openai
  model: openai/gpt-5.4

secrets:
  providerSecretName: edev-openai
  providerKeyName: OPENAI_API_KEY
```

## Gemini-style example

The first chart version documents Gemini as a deployment concern even if the current manifest example does not yet inject Gemini-specific keys automatically.

Representative configuration shape:

```yaml
provider:
  name: gemini
  model: google/gemini-2.5-pro
```

In future iterations, the chart should support provider-specific environment wiring for Gemini and additional providers in a more generic way.

## Recommendation

Keep the chart values expressive enough to describe the operator intent now, even if provider-specific secret injection grows in later iterations.
