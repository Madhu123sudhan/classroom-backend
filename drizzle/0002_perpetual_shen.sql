ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_student_id_class_id_unique";--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_student_id_class_id_pk";--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "invite_code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "schedules" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "id" integer PRIMARY KEY NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "enrollments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "enrollments_student_class_unique" ON "enrollments" USING btree ("student_id","class_id");