CREATE TABLE "agent_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"emoji" text NOT NULL,
	"background_color" text NOT NULL,
	"suggested_name" text DEFAULT 'agent_default_name' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_type_roles" (
	"team_type_id" text NOT NULL,
	"agent_role_id" text NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_type_roles_team_type_id_agent_role_id_pk" PRIMARY KEY("team_type_id","agent_role_id")
);
--> statement-breakpoint
CREATE TABLE "team_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_type_roles" ADD CONSTRAINT "team_type_roles_team_type_id_team_types_id_fk" FOREIGN KEY ("team_type_id") REFERENCES "public"."team_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_type_roles" ADD CONSTRAINT "team_type_roles_agent_role_id_agent_roles_id_fk" FOREIGN KEY ("agent_role_id") REFERENCES "public"."agent_roles"("id") ON DELETE cascade ON UPDATE no action;