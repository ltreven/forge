-- Migration 0008: Add gateway_token column to agents table
--
-- Each agent gets a unique Openclaw gateway token generated at creation time.
-- This token is passed to the pod as OPENCLAW_GATEWAY_TOKEN via the credentials
-- Secret, allowing the bootstrap.sh to run 'openclaw onboard --non-interactive'.
--
-- Nullable so that existing rows keep working (no token = bootstrap will fail,
-- but the column being NULL won't break anything at the DB layer).

ALTER TABLE agents ADD COLUMN gateway_token TEXT;
