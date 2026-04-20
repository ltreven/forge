.PHONY: help web web-install web-kill web-build api api-install db-migrate db-seed docker-db agents-test \
        tilt-up tilt-down k8s-lint k8s-render k8s-namespace clean-k8s clean

# Default target
help:
	@echo ""
	@echo "  Forge — Dev Commands"
	@echo ""
	@echo "  Web (apps/web)"
	@echo "  ─────────────────────────────────────"
	@echo "  make web            Start web dev server (localhost:3000)"
	@echo "  make web-install    Install web dependencies"
	@echo "  make web-build      Build web for production"
	@echo "  make web-kill       Kill any running web dev server"
	@echo ""
	@echo "  API (apps/api)"
	@echo "  ─────────────────────────────────────"
	@echo "  make api            Start API dev server (localhost:4000)"
	@echo "  make api-install    Install API dependencies"
	@echo "  make db-migrate     Run Drizzle migrations"
	@echo "  make db-seed        Seed the database with demo data"
	@echo "  make docker-db      Start local PostgreSQL via Docker"
	@echo ""
	@echo "  Agents (apps/agents)"
	@echo "  ─────────────────────────────────────"
	@echo "  make agents-test    Run agent Helm test deployment"
	@echo ""
	@echo "  Kubernetes / Tilt (FOR-53)"
	@echo "  ─────────────────────────────────────"
	@echo "  make tilt-up        Start local k8s dev environment (Tilt)"
	@echo "  make tilt-down      Stop Tilt and clean up local k8s resources"
	@echo "  make k8s-lint       Lint the Helm chart (all environments)"
	@echo "  make k8s-render     Render Helm templates for local (dry-run)"
	@echo "  make k8s-namespace  Create the forge namespace (one-time setup)"
	@echo "  make clean-k8s     ⚠ Delete forge + all forge-ws-* namespaces (dev reset)"
	@echo ""
	@echo "  Utilities"
	@echo "  ─────────────────────────────────────"
	@echo "  make clean          Remove build artifacts and lock files"
	@echo ""

# ── Web ────────────────────────────────────────────────────────────────────────

web: web-kill
	cd apps/web && npm run dev

web-install:
	cd apps/web && npm install

web-build:
	cd apps/web && npm run build

web-kill:
	@pkill -f "next dev" 2>/dev/null || true
	@rm -rf apps/web/.next/dev/lock 2>/dev/null || true
	@echo "✓ Web dev server stopped"

# ── API ────────────────────────────────────────────────────────────────────────

api:
	cd apps/api && pnpm dev

api-install:
	cd apps/api && pnpm install

db-migrate:
	cd apps/api && pnpm db:migrate

db-seed:
	cd apps/api && pnpm db:seed

docker-db:
	@docker run --rm --name forge-postgres \
		-e POSTGRES_USER=forge \
		-e POSTGRES_PASSWORD=forge \
		-e POSTGRES_DB=forge \
		-p 5432:5432 \
		postgres:16-alpine

# ── Agents ────────────────────────────────────────────────────────────────────

agents-test:
	bash apps/agents/tests/test-simple.sh

# ── Kubernetes / Tilt ─────────────────────────────────────────────────────────

## Start the full local k8s environment via Tilt (docker-desktop context required)
tilt-up:
	tilt up

## Stop Tilt and remove all deployed resources from the local cluster
tilt-down:
	tilt down

## Lint the Helm chart against all environment values files
k8s-lint:
	@echo "→ Linting chart with values-local.yaml..."
	helm lint charts/forge -f charts/forge/values-local.yaml
	@echo "→ Linting chart with values-uat.yaml..."
	helm lint charts/forge -f charts/forge/values-uat.yaml --set api.image.tag=lint --set web.image.tag=lint
	@echo "→ Linting chart with values-prod.yaml..."
	helm lint charts/forge -f charts/forge/values-prod.yaml --set api.image.tag=lint --set web.image.tag=lint
	@echo "✓ All Helm lints passed"

## Render and print Helm templates for local (useful for debugging)
k8s-render:
	helm template forge charts/forge -f charts/forge/values-local.yaml

## Create the forge namespace (idempotent — safe to run multiple times)
k8s-namespace:
	kubectl create namespace forge --dry-run=client -o yaml | kubectl apply -f -

## Delete the forge namespace AND all forge-ws-* workspace namespaces.
## ⚠  DESTRUCTIVE: wipes all agent PVCs, Secrets, and state for every workspace.
## Use only during local dev to start fresh. Never run against production.
clean-k8s:
	@echo ""
	@echo "  ⚠  WARNING: This will permanently delete:"
	@echo "     • namespace/forge  (API, Web, Controller, PostgreSQL, all data)"
	@echo "     • all forge-ws-* namespaces (agent pods, PVCs, Secrets)"
	@echo ""
	@printf "  Type 'yes' to confirm: "; read CONFIRM; \
	if [ "$$CONFIRM" = "yes" ]; then \
		echo "→ Deleting namespace/forge..."; \
		kubectl delete namespace forge --ignore-not-found; \
		echo "→ Deleting forge-ws-* namespaces..."; \
		kubectl get namespace -o name | grep 'namespace/forge-ws-' | xargs -r kubectl delete --ignore-not-found; \
		echo "✓ Done. Run 'make tilt-up' to start fresh."; \
	else \
		echo "Aborted."; \
	fi

# ── Utilities ─────────────────────────────────────────────────────────────────

clean: web-kill
	rm -rf apps/web/.next apps/api/dist
	@echo "✓ Clean done"

