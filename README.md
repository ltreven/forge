# Forge

**Forge** is a deployable agent platform built around OpenClaw-based autonomous agents.

It starts as a local-first engineering laboratory and evolves toward a framework for deploying specialized agents into customer-controlled environments.

## Current direction

The current implementation target is the first MVP:
- a local Docker-based OpenClaw software engineer agent
- clear approval-aware behavior
- project-management integration starting with Linear and expanding to GitHub
- portable state and reproducible local setup

## Product model

Forge is **not** intended to be a hosted SaaS.

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
- `system-overview.md`
- `agent-persona-software-engineer.md`
- `local-mvp-setup.md`
- `kubernetes-deployment.md`
- `provider-configuration.md`
- `telegram-kubernetes.md`
- `local-k8s-test.md`
- `github-integration.md`

## Current local MVP shape

The local MVP uses:
- `build/docker/Dockerfile` for the agent image
- `docker-compose.yml` for local orchestration
- `.env.example` for local environment variables
- `src/agent/profiles/software-engineer/` for baseline agent identity, behavior, memory files, and runtime config
- an explicit `openclaw gateway run --allow-unconfigured` command in Compose so startup follows the supported OpenClaw CLI flow
- a lightweight entrypoint hardening step that tightens permissions on mounted local OpenClaw config files before launch

## Principles

- Keep secrets out of Git.
- Keep persisted artifacts in English.
- Keep external actions approval-aware.
- Prefer portability and reproducibility over ad hoc setup.
- Provide realistic engineering tooling, but route deeper execution capability through clearly bounded and auditable environments.

## Backend API (apps/api)

The Forge REST API is a Node.js/Express service exposing CRUD endpoints for **Teams** and **Agents**.

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker (for local PostgreSQL)

### Quick start

```bash
# 1. Start PostgreSQL
make docker-db          # postgres://forge:forge@localhost:5432/forge

# 2. Install dependencies
make api-install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env  # edit DATABASE_URL if needed

# 4. Run migrations
make db-migrate

# 5. Start dev server (http://127.0.0.1:4000)
make api

# 6. (Optional) Seed demo data
make db-seed
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://forge:forge@localhost:5432/forge` | PostgreSQL connection string |
| `PORT` | `4000` | HTTP port (loopback-bound only) |

### API Endpoints

All responses use the envelope `{ data, error, meta }`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/teams` | Create team (auto-creates a `project_manager` agent) |
| `GET` | `/teams` | List all teams |
| `GET` | `/teams/:id` | Get team by ID |
| `PUT` | `/teams/:id` | Update team |
| `DELETE` | `/teams/:id` | Delete team |
| `POST` | `/agents` | Create agent |
| `GET` | `/agents?teamId=` | List agents (optional team filter) |
| `GET` | `/agents/:id` | Get agent by ID |
| `PUT` | `/agents/:id` | Update agent |
| `DELETE` | `/agents/:id` | Delete agent |

### Agent types

`software_engineer` · `product_manager` · `project_manager` · `software_architect`

---

## Next steps

Planned follow-on work includes:
- improving the runtime image
- strengthening local configuration patterns
- refining the software engineer agent workflow
- preparing the path to Helm and Terraform support
