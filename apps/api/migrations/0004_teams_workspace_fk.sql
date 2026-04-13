-- Add workspace_id FK to teams table.
-- Existing rows (if any) must be updated manually or set a default before enforcing NOT NULL.
-- For a clean dev database, this runs fine as-is.

ALTER TABLE "teams"
  ADD COLUMN "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE;

-- If you have existing rows without a workspace, set them to the first workspace:
-- UPDATE "teams" SET "workspace_id" = (SELECT id FROM "workspaces" LIMIT 1) WHERE "workspace_id" IS NULL;

-- Then enforce NOT NULL:
ALTER TABLE "teams" ALTER COLUMN "workspace_id" SET NOT NULL;
