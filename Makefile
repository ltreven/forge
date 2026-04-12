.PHONY: help web web-install web-kill web-build k8s-test clean

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
	@echo "  Kubernetes / Helm"
	@echo "  ─────────────────────────────────────"
	@echo "  make k8s-test       Run Helm test deployment"
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

# ── Kubernetes / Helm ──────────────────────────────────────────────────────────

k8s-test:
	bash src/test/test-simple.sh

# ── Utilities ─────────────────────────────────────────────────────────────────

clean: web-kill
	rm -rf apps/web/.next
	@echo "✓ Clean done"
