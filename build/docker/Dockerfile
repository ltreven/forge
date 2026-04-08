FROM ghcr.io/openclaw/openclaw:latest

# eDEV local MVP image
#
# This image extends the official OpenClaw image with bootstrap content
# templates while delegating runtime auth/model setup to the OpenClaw CLI.

USER root
RUN mkdir -p /home/node/.openclaw /home/node/workspace /opt/edev/config \
    && chown -R node:node /home/node/.openclaw /home/node/workspace /opt/edev

COPY src/agent/config/ /opt/edev/config/
COPY build/docker/entrypoint.sh /usr/local/bin/edev-entrypoint.sh
RUN chmod 755 /usr/local/bin/edev-entrypoint.sh

USER node
WORKDIR /home/node/workspace
ENTRYPOINT ["/usr/local/bin/edev-entrypoint.sh"]
