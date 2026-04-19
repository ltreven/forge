# Forge

**Forge** is a platform for deploying and operating autonomous AI agent teams with world-class management discipline — structured roles, clear ownership, governed workflows, and real-time health visibility.

> *"Forge brings world-class team management discipline to autonomous AI agents — so your agent teams run like a well-managed human organization, at AI speed."*

Whether you are building software, running customer support, or coordinating any other team-based function, Forge gives you the infrastructure to deploy autonomous agents that operate like a well-managed organization.

---

## Architecture overview

```
forge/
├── apps/
│   ├── web/              # Next.js SaaS frontend (port 3000)
│   │   └── tests/        # Web unit & integration tests
│   ├── api/              # Node.js/Express REST API (port 4000)
│   │   └── tests/        # API unit & integration tests
│   └── agents/           # Per-tenant agent runtime (Kubernetes workload)
│       ├── profiles/     # Agent persona markdown files (IDENTITY, SOUL, PROCESS, …)
│       ├── helm/         # Helm chart — deploys one namespace per customer tenant
│       │   ├── Chart.yaml
│       │   ├── values.yaml
│       │   ├── templates/
│       │   └── files/bootstrap.sh
│       └── tests/        # Agent deployment test scripts
│
├── docs/                 # Product vision, system overview, ADRs
├── Makefile              # Top-level dev commands
└── .env.example          # Root environment variable reference

# Coming soon
├── infra/                # Cross-cutting infrastructure
│   ├── argocd/           # ArgoCD App-of-Apps + ApplicationSets
│   ├── terraform/        # Cloud provider IaC (AWS, GCP, Azure)
│   └── environments/     # Per-environment Helm values (dev, uat, prod)
├── e2e/                  # Cross-system end-to-end tests
└── .github/workflows/    # CI/CD pipelines
```

> **Deployment convention:** each app that runs on Kubernetes will have its Dockerfile and Helm chart under a `deploy/` subfolder (e.g., `apps/web/deploy/`, `apps/api/deploy/`). ArgoCD will point to those paths per environment.

**Stack:**
- **Frontend:** Next.js 16, Tailwind CSS, shadcn/ui, i18n (EN + ZH)
- **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL, JWT auth (bcryptjs)
- **Agents:** OpenClaw, containerized via Docker/Kubernetes, deployed via Helm
- **Integrations:** Linear (Engineering template)

---

## Multi-tenant model

Each paying Forge customer gets their own **isolated Kubernetes namespace**, provisioned via the Helm chart in `apps/agents/helm/`. This means:

- 1 shared deployment of `apps/web` and `apps/api` (the SaaS layer)
- N namespaces, one per customer, each running that customer's agent team
- Future additions per namespace: RabbitMQ, dedicated PostgreSQL, Ingress, monitoring

---

## Team Templates

| Template | Description |
|---|---|
| **Forge Starter** | Minimal team — Team Lead only. General-purpose or exploratory use. |
| **Engineering** | Full software delivery squad with SDLC discipline (Engineer, Architect, PM). |
| **Customer Support** | *(Coming soon)* Automated support team. |

Every team requires at least a **Team Lead** — the ownership and coordination primitive.

---

## Running locally

You need **3 terminals** running in parallel.

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10 (web) · pnpm ≥ 9 (api)
- Docker (for local PostgreSQL)

### First-time setup

```bash
# 1. Clone and install dependencies
make web-install
make api-install

# 2. Configure the API environment
cp apps/api/.env.example apps/api/.env
# Add your JWT secret (required for auth):
echo "JWT_SECRET=your-local-dev-secret-here" >> apps/api/.env
```

### Start the stack

**Terminal 1 — PostgreSQL**
```bash
make docker-db
# Starts postgres://forge:forge@localhost:5432/forge
```

**Terminal 2 — API** (http://localhost:4000)
```bash
make db-migrate   # run once after first setup or after new migrations
make api
```

**Terminal 3 — Web** (http://localhost:3000)
```bash
make web
```

Verify: `curl http://localhost:4000/health` → `{"status":"ok"}`

---

## Testing the onboarding flow

Once all three services are running:

1. **`/signup`** — Create an account (3 steps):
   - Step 1: Full name + work email + password
   - Step 2: Workspace name
   - Step 3: Choose a team template (Forge Starter or Engineering)
     - **Forge Starter:** Team name + Team Lead name → creates team → goes to `/teams`
     - **Engineering:** Team name + agent squad (Engineer / Architect / PM) → goes to `/teams`

2. **`/teams`** — Your agent team dashboard after onboarding

3. **`/login`** — Sign back in with the credentials you created

> **Note:** SSO (Google / Microsoft) is UI-only in the current MVP — clicking the buttons shows a "Coming soon" toast. Real OAuth support is a future ticket.

---

## Available make commands

```
make web            Start web dev server (localhost:3000)
make web-install    Install web dependencies
make web-build      Build web for production
make web-kill       Kill any running web dev server

make api            Start API dev server (localhost:4000)
make api-install    Install API dependencies
make db-migrate     Run Drizzle migrations
make db-seed        Seed the database with demo data
make docker-db      Start local PostgreSQL via Docker

make agents-test    Run agent Helm test deployment (requires .env)
make clean          Remove build artifacts
```

---

## Backend API reference

All responses use the envelope: `{ success, data, error }`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create user + workspace, return JWT |
| `POST` | `/auth/login` | Validate credentials, return JWT |
| `GET` | `/auth/me` | Return current user (requires Bearer token) |

### Teams & Agents

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/teams` | Create team + agents atomically |
| `GET` | `/teams` | List all teams |
| `GET` | `/teams/:id` | Get team by ID |
| `PUT` | `/teams/:id` | Update team |
| `DELETE` | `/teams/:id` | Delete team |
| `POST` | `/agents` | Create agent |
| `GET` | `/agents?teamId=` | List agents (optional filter) |
| `GET` | `/agents/:id` | Get agent by ID |
| `PUT` | `/agents/:id` | Update agent |
| `DELETE` | `/agents/:id` | Delete agent |

**Agent types:** `team_lead` · `software_engineer` · `software_architect` · `product_manager` · `project_manager`

**Team templates:** `starter` · `engineering` · `customer_support`

### Environment variables (apps/api/.env)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://forge:forge@localhost:5432/forge` | PostgreSQL connection string |
| `PORT` | `4000` | HTTP port (loopback-bound) |
| `JWT_SECRET` | — | **Required.** Secret for signing JWTs |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## Agent Kubernetes deployment

Agents are deployed as containerized OpenClaw instances via the Helm chart in `apps/agents/helm/`.

```bash
# Quick test deployment (reads credentials from .env)
make agents-test
```

The Helm chart supports:
- Configurable agent profile, model provider, and model name
- Linear MCP integration (enabled via values, Engineering template)
- Telegram bot token for agent communication
- Non-privileged container execution
- One namespace per customer tenant (multi-tenant isolation)

See `apps/agents/helm/values.yaml` for the full configuration reference.

---

## Engineering principles

- **Secrets out of Git.** All credentials via environment variables only.
- **English everywhere.** Code, comments, commits, ADRs — always in English.
- **Approval-aware.** Agents never take external actions without explicit human sign-off.
- **Portable by default.** State persists in Git; any environment can be restored from zero.
- **Strict SDLC.** Every task: ticket intake → DoR check → tech planning → implementation → tests → PR.

---

## Key documents

Under `docs/`:
- `product-vision.md`
- `system-overview.md`
- `agent-persona-software-engineer.md`
- `kubernetes-deployment.md`
- `provider-configuration.md`
- `github-integration.md`
