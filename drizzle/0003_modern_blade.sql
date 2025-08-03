CREATE TABLE "jeux-girons_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(256) NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "jeux-girons_setting_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "setting_key_idx" ON "jeux-girons_setting" USING btree ("key");