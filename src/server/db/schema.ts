// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `jeux-girons_${name}`);


export const groups = createTable(
  "group",
  (d) => ({
    id: d.serial("id").primaryKey(),
    name: d.varchar("name", { length: 256 }).notNull(),
    contactName: d.text("contact_name"),
    contactPhone: d.varchar("contact_phone", { length: 50 }),
    createdAt: d.timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

export const games = createTable(
  "game",
  (d) => ({
    id: d.serial("id").primaryKey(),
    name: d.varchar("name", { length: 256 }).notNull(),
    numberOfGroups: d.integer("number_of_groups").notNull(),
    description: d.text("description"),
    createdAt: d.timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("game_name_idx").on(t.name)],
);
