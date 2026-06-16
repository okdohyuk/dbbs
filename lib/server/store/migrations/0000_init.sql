CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"engine" text DEFAULT 'mysql' NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 3306 NOT NULL,
	"user" text NOT NULL,
	"password_enc" text NOT NULL,
	"default_database" text,
	"last_tested_at" timestamp with time zone,
	"last_server_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restore_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"target_connection_id" uuid NOT NULL,
	"target_database" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"log_tail" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"source_database" text NOT NULL,
	"name" text NOT NULL,
	"file_path" text NOT NULL,
	"bytes" bigint DEFAULT 0 NOT NULL,
	"compressed" boolean DEFAULT false NOT NULL,
	"options" jsonb NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"server_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_target_connection_id_connections_id_fk" FOREIGN KEY ("target_connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_source_connection_id_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;