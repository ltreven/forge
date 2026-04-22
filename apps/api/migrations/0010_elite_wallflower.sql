CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"team_task_id" uuid,
	"project_issue_id" uuid,
	"actor_id" uuid NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_team_task_id_team_tasks_id_fk" FOREIGN KEY ("team_task_id") REFERENCES "public"."team_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_issue_id_project_issues_id_fk" FOREIGN KEY ("project_issue_id") REFERENCES "public"."project_issues"("id") ON DELETE cascade ON UPDATE no action;