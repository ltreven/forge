# Forge

**Forge** is a platform for deploying and operating autonomous AI engineering agent teams inside customer-controlled infrastructure.

Forge gives organizations a governed, production-ready execution layer — deploying squads of autonomous AI agents (Software Engineer, Architect, Product Manager) directly into their own Kubernetes clusters via Helm. Agents follow a strict SDLC: ticket ingestion, technical planning, implementation, testing, and PR submission — with multi-level human approval at every critical step.

---

## Architecture overview

```
forge/
├── apps/
│   ├── web/          # Next.js marketing site + onboarding UI (port 3000)
│   └── api/          # Node.js/Express REST API (port 4000)
├── src/
│   └── k8s/helm/     # Helm chart for Kubernetes agent deployment
├── Makefile          # Top-level dev commands
└── .env.example      # Root environment variable reference
```

**Stack:**
- **Frontend:** Next.js 16, Tailwind CSS, shadcn/ui, i18n (EN + ZH)
- **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL, JWT auth (bcryptjs)
- **Agents:** OpenClaw, containerized via Docker/Kubernetes, deployed via Helm
- **Integrations:** Linear, Jira, Trello (PM tools), GitHub (VCS)

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
   - Step 2: Workspace name + "Ways of Working" (pre-filled, editable)
   - Step 3: Agent squad — pick roles (Engineer / Architect / PM) and name each agent
   - Submits to the API → redirects to `/setup`

2. **`/setup`** — Configure your team:
   - Team name, mission, Ways of Working, agent editor (add/remove)
   - PM tool: choose Linear / Jira / Trello and paste your API key
   - GitHub: paste a Personal Access Token + add repo URLs
   - Click **"Create Team & Deploy"** → persists all data to the database

3. **Navbar (authenticated):** Click your avatar in the top-right → dropdown shows "Team Setup" and "Log out"

4. **`/login`** — Sign back in with the credentials you created

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

make k8s-test       Run Helm test deployment (requires .env)
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

### Integrations

| Method | Path | Description |
|---|---|---|
| `POST` | `/teams/:id/integrations` | Add PM or GitHub integration to a team |
| `GET` | `/teams/:id/integrations` | List integrations for a team |

**Agent types:** `software_engineer` · `software_architect` · `product_manager` · `project_manager`

**Integration providers:** `linear` · `jira` · `trello` · `github`

### Environment variables (apps/api/.env)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://forge:forge@localhost:5432/forge` | PostgreSQL connection string |
| `PORT` | `4000` | HTTP port (loopback-bound) |
| `JWT_SECRET` | — | **Required.** Secret for signing JWTs |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## Kubernetes / Helm deployment

Agents are deployed as containerized OpenClaw instances via the Helm chart in `src/k8s/helm/forge/`.

```bash
# Quick test deployment (reads credentials from .env)
make k8s-test
```

The Helm chart supports:
- Configurable agent profile, model provider, and model name
- Linear and GitHub MCP integrations (enabled via values)
- Telegram bot token for agent communication
- Non-privileged container execution

See `src/k8s/helm/forge/values.yaml` for the full configuration reference.

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
