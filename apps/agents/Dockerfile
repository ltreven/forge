FROM ghcr.io/openclaw/openclaw:2026.4.9

# ── Profile seed templates ────────────────────────────────────────────────────
# These files are the "factory defaults" for each agent role.
# bootstrap.sh copies the relevant profile to the PVC at FIRST BOOT ONLY.
# After that, the files live on the PVC and evolve with the agent.
# Updating this image does NOT overwrite files of existing agents.
COPY profiles/ /opt/forge/profiles/

# ── bootstrap entrypoint ──────────────────────────────────────────────────────
# The bootstrap script is also baked into the image.
# --chmod=755 sets permissions at copy time (BuildKit) — avoids needing root.
COPY --chmod=755 helm/files/bootstrap.sh /opt/forge/bootstrap.sh

# ── MCP packages (pre-installed — no npm install at runtime) ──────────────────
# Installing here avoids network calls during agent startup and makes
# startup time deterministic regardless of npm registry availability.
ENV MCP_PACKAGES_DIR=/opt/mcp-packages

RUN npm install --prefix $MCP_PACKAGES_DIR --save \
    @sylphx/linear-mcp \
    @modelcontextprotocol/server-github \
    && npm cache clean --force
