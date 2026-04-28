ALTER TABLE "tasks" ADD COLUMN "plan" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "task_list" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "execution_log" jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "work_summary" text;