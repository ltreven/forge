FROM ghcr.io/openclaw/openclaw:latest

# eDEV local MVP image
#
# This image extends the official OpenClaw image with a minimal set of
# directories expected by the local MVP workflow.

USER root
RUN mkdir -p /home/node/.openclaw /home/node/workspace \
    && chown -R node:node /home/node/.openclaw /home/node/workspace

USER node
WORKDIR /home/node/workspace
