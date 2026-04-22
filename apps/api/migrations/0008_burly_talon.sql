CREATE TYPE "public"."activity_type" AS ENUM('request_created', 'request_received', 'request_responded', 'project_created', 'task_created', 'project_issue_created', 'project_issue_blocked', 'project_issue_unblocked', 'task_blocked', 'task_unblocked', 'task_finished');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "public"."agent_k8s_status" AS ENUM('pending', 'provisioning', 'running', 'failed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."project_health" AS ENUM('unknown', 'on_track', 'at_risk', 'off_track');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('created', 'processing', 'responded');--> statement-breakpoint
CREATE TABLE "project_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_issue_id" uuid,
	"title" text NOT NULL,
	"short_summary" text,
	"description_markdown" text,
	"description_rich_text" jsonb,
	"status" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"assigned_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_health" "project_health" NOT NULL,
	"new_health" "project_health" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"title" text NOT NULL,
	"short_summary" text,
	"description_markdown" text,
	"description_rich_text" jsonb,
	"start_date_kind" text,
	"start_date_value" text,
	"end_date_kind" text,
	"end_date_value" text,
	"status" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"lead_id" uuid,
	"health" "project_health" DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"type" "activity_type" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"requester_type" "actor_type" NOT NULL,
	"target_agent_id" uuid NOT NULL,
	"team_task_id" uuid,
	"project_issue_id" uuid,
	"input_data" jsonb,
	"response_contract" text,
	"status" "request_status" DEFAULT 'created' NOT NULL,
	"response_status_code" integer,
	"response_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"short_summary" text,
	"description_markdown" text,
	"description_rich_text" jsonb,
	"status" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"assigned_to_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "gateway_token" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "k8s_status" "agent_k8s_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "k8s_resource_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "k8s_namespace" text;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_parent_issue_id_project_issues_id_fk" FOREIGN KEY ("parent_issue_id") REFERENCES "public"."project_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_activities" ADD CONSTRAINT "team_activities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_target_agent_id_agents_id_fk" FOREIGN KEY ("target_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_team_task_id_team_tasks_id_fk" FOREIGN KEY ("team_task_id") REFERENCES "public"."team_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_project_issue_id_project_issues_id_fk" FOREIGN KEY ("project_issue_id") REFERENCES "public"."project_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_parent_task_id_team_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."team_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_k8s_namespace_unique" UNIQUE("k8s_namespace");--> statement-breakpoint
 