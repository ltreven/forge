.PHONY: help web web-install web-kill web-build api api-install db-migrate db-seed docker-db agents-test clean

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

# ── Utilities ─────────────────────────────────────────────────────────────────

clean: web-kill
	rm -rf apps/web/.next apps/api/dist
	@echo "✓ Clean done"
