-- Recreate agent_type enum to include 'team_lead' without ALTER TYPE ADD VALUE.
-- ALTER TYPE ADD VALUE cannot be used in the same transaction as the new value (PG error 55P04).
-- Drizzle runs all pending migrations in one transaction, so we use rename→create→alter→drop instead.
ALTER TYPE "public"."agent_type" RENAME TO "agent_type_old";--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('team_lead', 'software_engineer', 'product_manager', 'software_architect', 'project_manager');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "type" TYPE "public"."agent_type" USING "type"::text::"public"."agent_type";--> statement-breakpoint
DROP TYPE "public"."agent_type_old";--> statement-breakpoint
CREATE TYPE "public"."counterpart_type" AS ENUM('human', 'agent', 'external');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"counterpart_type" "counterpart_type" NOT NULL,
	"counterpart_id" text,
	"counterpart_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "mission" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "template" text DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;