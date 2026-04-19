-- FOR-56: Agent K8s provisioning fields
-- Adds:
--   - agent_k8s_status enum (Postgres enum type)
--   - workspaces.k8s_namespace (derived: forge-ws-{workspace_id[:8]})
--   - agents.k8s_status (current provisioning phase)
--   - agents.k8s_resource_name (ForgeAgent CR name in the cluster)

-- 1. Create the enum type
DO $$ BEGIN
  CREATE TYPE agent_k8s_status AS ENUM (
    'pending',
    'provisioning',
    'running',
    'failed',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add k8s_namespace to workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS k8s_namespace TEXT UNIQUE;

-- 3. Add k8s tracking fields to agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS k8s_status agent_k8s_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS k8s_resource_name TEXT;
