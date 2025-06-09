CREATE TABLE "jeux-girons_game" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"number_of_groups" integer NOT NULL,
	"description" text,
	"rounds" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"contact_name" text,
	"contact_phone" varchar(50),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_schedule_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"time_slot_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"round" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"game_duration_ms" integer NOT NULL,
	"transition_time_ms" integer NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_score" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_time_range" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jeux-girons_time_slot" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"slot_index" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jeux-girons_schedule_entry" ADD CONSTRAINT "jeux-girons_schedule_entry_time_slot_id_jeux-girons_time_slot_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."jeux-girons_time_slot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_schedule_entry" ADD CONSTRAINT "jeux-girons_schedule_entry_group_id_jeux-girons_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."jeux-girons_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_schedule_entry" ADD CONSTRAINT "jeux-girons_schedule_entry_game_id_jeux-girons_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."jeux-girons_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_score" ADD CONSTRAINT "jeux-girons_score_group_id_jeux-girons_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."jeux-girons_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_score" ADD CONSTRAINT "jeux-girons_score_game_id_jeux-girons_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."jeux-girons_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_time_range" ADD CONSTRAINT "jeux-girons_time_range_schedule_id_jeux-girons_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."jeux-girons_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeux-girons_time_slot" ADD CONSTRAINT "jeux-girons_time_slot_schedule_id_jeux-girons_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."jeux-girons_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_name_idx" ON "jeux-girons_game" USING btree ("name");--> statement-breakpoint
CREATE INDEX "name_idx" ON "jeux-girons_group" USING btree ("name");--> statement-breakpoint
CREATE INDEX "score_group_game_round_idx" ON "jeux-girons_score" USING btree ("group_id","game_id","round");