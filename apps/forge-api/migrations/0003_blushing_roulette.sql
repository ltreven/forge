CREATE TABLE "team_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"triggers" jsonb,
	"description" text NOT NULL,
	"inputs_description" text,
	"expected_outputs_description" text,
	"expected_events_output" jsonb,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"schedule_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_meta_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_type_id" text NOT NULL,
	"name" text NOT NULL,
	"triggers" jsonb,
	"description" text NOT NULL,
	"inputs_description" text,
	"expected_outputs_description" text,
	"expected_events_output" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_types" ADD COLUMN "mission" text;--> statement-breakpoint
ALTER TABLE "team_types" ADD COLUMN "ways_of_working" text;--> statement-breakpoint
ALTER TABLE "team_capabilities" ADD CONSTRAINT "team_capabilities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_meta_capabilities" ADD CONSTRAINT "team_meta_capabilities_team_type_id_team_types_id_fk" FOREIGN KEY ("team_type_id") REFERENCES "public"."team_types"("id") ON DELETE cascade ON UPDATE no action;