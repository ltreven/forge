CREATE TYPE "public"."notification_priority" AS ENUM('info', 'normal', 'high', 'alert');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"recipient_type" "actor_type" NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"related_entity_id" uuid,
	"related_entity_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;