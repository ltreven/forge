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
  alias: GPT
```

## Secret handling

Secrets must stay outside Git.

The current chart now wires OpenAI explicitly through Kubernetes Secrets.

Example pattern:

```yaml
secrets:
  openaiSecretName: edev-openai
  openaiKeyName: OPENAI_API_KEY
```

## OpenAI-style example

```yaml
provider:
  name: openai
  model: openai/gpt-5.4
  alias: GPT

secrets:
  openaiSecretName: edev-openai
  openaiKeyName: OPENAI_API_KEY
```

## Gemini-style example

The current wave keeps Gemini documented as a future deployment concern, but does not yet implement Gemini-specific secret injection in the chart.

Representative configuration shape:

```yaml
provider:
  name: gemini
  model: google/gemini-2.5-pro
  alias: Gemini
```

A later iteration should add provider-specific secret wiring for Gemini and additional providers in a more generic way.

## Recommendation

Keep the chart values expressive enough to describe the operator intent now, even if provider-specific secret injection grows in later iterations.

## Runtime note from cluster testing

Local Kubernetes testing showed that the runtime may require explicit Node.js heap tuning to remain stable. The chart now supports runtime environment overrides through `runtime.extraEnv`, with `NODE_OPTIONS` carried by default for the current baseline.
