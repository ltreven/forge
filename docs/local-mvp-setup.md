# Local MVP Setup

This document explains the first local MVP setup for eDEV.

## Goal

Run a local Docker-based OpenClaw software engineer agent with:
- persisted workspace state
- local-only credential injection
- conservative local exposure

## Files

- `build/docker/Dockerfile`
- `docker-compose.yml`
- `.env.example`

## Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill local secrets in `.env`.

3. Build the container:

```bash
make build
```

4. Start the local agent:

```bash
make up
```

5. Follow logs:

```bash
make logs
```

## Notes

- Do not commit `.env`.
- Keep the gateway bound conservatively.
- Use token-based local auth instead of hardcoded example passwords.
- The container runs `openclaw gateway run --allow-unconfigured` explicitly so startup follows the supported OpenClaw CLI path instead of relying on an implicit image entrypoint.
- This is a local-first MVP, not the final production deployment model.
