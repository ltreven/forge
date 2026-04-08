# Provider Configuration

This document explains how model provider choices are represented in the current eDEV deployment model.

## Goal

Keep the operator-facing configuration simple while still wiring provider-specific secrets correctly inside the deployment.

## Current schema

The chart now exposes a generic operator-facing shape:

```yaml
model:
  provider: openai
  name: openai/gpt-5.4
  alias: GPT
  credentials:
    secretName: edev-openai
    key: OPENAI_API_KEY
```

This same shape can also be used for Gemini:

```yaml
model:
  provider: gemini
  name: google/gemini-2.5-flash
  alias: Gemini Flash
  credentials:
    secretName: edev-gemini
    key: GEMINI_API_KEY
```

## Current provider wiring

### OpenAI
When `model.provider=openai`, the chart wires:
- `OPENAI_API_KEY`

### Gemini
When `model.provider=gemini`, the chart wires:
- `GEMINI_API_KEY`

## Notes

This is an intentionally narrow first implementation.

It supports:
- OpenAI
- Gemini

It does not yet try to solve the final generalized provider architecture for every future provider.

## Recommendation

Use this schema to deploy different agents in the same cluster with different provider choices while keeping release-level configuration readable and explicit.
