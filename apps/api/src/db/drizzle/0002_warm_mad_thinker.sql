ALTER TABLE "notes" DROP CONSTRAINT "notes_parent_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "parent_id";