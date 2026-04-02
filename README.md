# eDEV

**eDEV** is a deployable agent platform built around OpenClaw-based autonomous agents.

It starts as a local-first engineering laboratory and evolves toward a framework for deploying specialized agents into customer-controlled environments.

## Current direction

The current implementation target is the first MVP:
- a local Docker-based OpenClaw software engineer agent
- clear approval-aware behavior
- project-management integration starting with Linear
- portable state and reproducible local setup

## Product model

eDEV is **not** intended to be a hosted SaaS.

The long-term goal is to make it possible to deploy and operate agent systems for clients using:
- local Docker workflows
- Kubernetes deployments
- Helm-based customer configuration
- Terraform-based infrastructure provisioning
- future operational automation and monitoring

## Current repository focus

This repository currently focuses on:
- product documentation
- MVP definition
- local runtime baseline
- initial agent configuration patterns

## Key documents

Under `docs/`:
- `product-vision.md`
- `mvp-scope.md`
- `system-overview.md`
- `agent-persona-software-engineer.md`
- `local-mvp-setup.md`

## Current local MVP shape

The local MVP uses:
- `build/docker/Dockerfile` for the agent image
- `docker-compose.yml` for local orchestration
- `.env.example` for local environment variables
- `src/agent/config/` for baseline agent identity, behavior, and memory files
- an explicit `openclaw gateway run --allow-unconfigured` command in Compose so startup follows the supported OpenClaw CLI flow

## Principles

- Keep secrets out of Git.
- Keep persisted artifacts in English.
- Keep external actions approval-aware.
- Prefer portability and reproducibility over ad hoc setup.
- Provide realistic engineering tooling, but route deeper execution capability through clearly bounded and auditable environments.

## Next steps

Planned follow-on work includes:
- improving the runtime image
- strengthening local configuration patterns
- refining the software engineer agent workflow
- preparing the path to Helm and Terraform support
