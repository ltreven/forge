-- Remove project_manager from agent_type enum.
-- Existing agents with type='project_manager' are migrated to 'team_lead'.
UPDATE "agents" SET "type" = 'team_lead' WHERE "type" = 'project_manager';

-- Recreate the enum without project_manager.
ALTER TYPE "public"."agent_type" RENAME TO "agent_type_old";
CREATE TYPE "public"."agent_type" AS ENUM('team_lead', 'software_engineer', 'product_manager', 'software_architect');
ALTER TABLE "agents" ALTER COLUMN "type" TYPE "public"."agent_type" USING "type"::text::"public"."agent_type";
DROP TYPE "public"."agent_type_old";
