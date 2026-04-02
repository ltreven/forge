#!/usr/bin/env sh
set -eu

if [ -d /home/node/.openclaw ]; then
  chmod 700 /home/node/.openclaw || true
fi

if [ -f /home/node/.openclaw/openclaw.json ]; then
  chmod 600 /home/node/.openclaw/openclaw.json || true
fi

exec "$@"
