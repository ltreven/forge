ALTER TABLE "team_capabilities" ADD COLUMN "assigned_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "team_capabilities" ADD COLUMN "assigned_role" text;--> statement-breakpoint
ALTER TABLE "team_capabilities" ADD CONSTRAINT "team_capabilities_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;