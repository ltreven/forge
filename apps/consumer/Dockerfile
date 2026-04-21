FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Only copy production dependencies
COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# node:22-alpine already ships with user 'node' (UID/GID 1000).
# Reuse it — matches the openclaw container UID and avoids group conflicts.
USER node

CMD ["node", "dist/index.js"]
