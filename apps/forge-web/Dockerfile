# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args:
# API_INTERNAL_URL: destination for Next.js rewrites() — baked at build time.
#   In k8s:  http://forge-api:4000 (ClusterIP, pod-to-pod)
#   In bare-metal dev: http://localhost:4000 (default fallback)
# NEXT_PUBLIC_API_URL: URL the browser will call — also baked into the client bundle.
#   In k8s:  /api  (relative path, goes through Next.js rewrite proxy)
#   In bare-metal dev: http://localhost:4000 (direct)
ARG API_INTERNAL_URL=http://forge-api:4000
ARG NEXT_PUBLIC_API_URL=/api

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Expose build args as env vars for next.config.mjs and client bundle
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

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
