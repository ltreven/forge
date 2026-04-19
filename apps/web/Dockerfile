# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time arg: destination for the /api/* rewrite (Next.js bakes rewrites at build time).
# In Kubernetes: forge-api is the ClusterIP service name (pod-to-pod routing).
# In local bare-metal dev: omit or set to http://localhost:4000.
ARG API_INTERNAL_URL=http://forge-api:4000

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Make the ARG available to next.config.mjs during build
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

RUN npm run build


# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup -S forge && adduser -S forge -G forge

# Next.js standalone output bundles everything needed
COPY --from=builder --chown=forge:forge /app/.next/standalone ./
COPY --from=builder --chown=forge:forge /app/.next/static ./.next/static
COPY --from=builder --chown=forge:forge /app/public ./public

USER forge

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
