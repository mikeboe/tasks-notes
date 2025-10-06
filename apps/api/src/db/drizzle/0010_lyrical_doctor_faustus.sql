ALTER TABLE "tags" RENAME COLUMN "organization_id" TO "team_id";--> statement-breakpoint
ALTER TABLE "task_stages" RENAME COLUMN "organization_id" TO "team_id";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "organization_id" TO "team_id";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_stages" ADD CONSTRAINT "task_stages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;