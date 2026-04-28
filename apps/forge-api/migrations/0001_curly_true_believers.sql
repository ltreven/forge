ALTER TABLE "tasks" DROP CONSTRAINT "tasks_team_id_number_unique";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_team_id_identifier_unique";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "identifier" text NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN "externally_visible";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "request_scope";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "number";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "identifier";--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_team_id_number_unique" UNIQUE("team_id","number");--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_team_id_identifier_unique" UNIQUE("team_id","identifier");--> statement-breakpoint
DROP TYPE "public"."request_scope";