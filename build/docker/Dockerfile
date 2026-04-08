FROM ghcr.io/openclaw/openclaw:latest

# eDEV local MVP image
#
# This image extends the official OpenClaw image with a minimal set of
# directories and templates expected by the local MVP workflow.

USER root
RUN mkdir -p /home/node/.openclaw /home/node/workspace /opt/edev/templates /opt/edev/config \
    && chown -R node:node /home/node/.openclaw /home/node/workspace /opt/edev

COPY src/agent/config/ /opt/edev/config/
COPY src/agent/config/openclaw.json.template /opt/edev/templates/openclaw.json.template
COPY src/agent/config/auth-profiles.json.template /opt/edev/templates/auth-profiles.json.template
COPY build/docker/entrypoint.sh /usr/local/bin/edev-entrypoint.sh
RUN chmod 755 /usr/local/bin/edev-entrypoint.sh

USER node
WORKDIR /home/node/workspace
ENTRYPOINT ["/usr/local/bin/edev-entrypoint.sh"]
