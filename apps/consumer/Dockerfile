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

# Non-root user (matches openclaw container UID 1000)
RUN addgroup -g 1000 forge && adduser -u 1000 -G forge -s /bin/sh -D forge
USER forge

CMD ["node", "dist/index.js"]
