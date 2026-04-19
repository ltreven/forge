# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /workspace

# Cache deps before copying source (faster rebuilds)
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary — no CGO, no libc dependency
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -a -ldflags="-w -s" -o controller ./cmd/...

# ── Runtime stage ─────────────────────────────────────────────────────────────
# distroless/static:nonroot = ~2MB base, no shell, non-root UID 65532
FROM gcr.io/distroless/static:nonroot

COPY --from=builder /workspace/controller /controller

USER 65532:65532

ENTRYPOINT ["/controller"]
