FROM ghcr.io/openclaw/openclaw:latest

# eDEV local MVP image
#
# This image extends the official OpenClaw image with a minimal set of
# directories expected by the local MVP workflow.

USER root
RUN mkdir -p /home/node/.openclaw /home/node/workspace \
    && chown -R node:node /home/node/.openclaw /home/node/workspace

COPY build/docker/entrypoint.sh /usr/local/bin/edev-entrypoint.sh
RUN chmod 755 /usr/local/bin/edev-entrypoint.sh

USER node
WORKDIR /home/node/workspace
ENTRYPOINT ["/usr/local/bin/edev-entrypoint.sh"]
