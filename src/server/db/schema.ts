// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql, relations } from "drizzle-orm";
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
    rounds: d.integer("rounds").notNull().default(1),
    imageUrl: d.varchar("image_url", { length: 512 }),
    createdAt: d.timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("game_name_idx").on(t.name)],
);

// Add schedule tables
export const schedules = createTable(
  "schedule",
  (d) => ({
    id: d.serial("id").primaryKey(),
    name: d.varchar("name", { length: 256 }).notNull(),
    description: d.text("description"),
    gameDurationMs: d.integer("game_duration_ms").notNull(),
    transitionTimeMs: d.integer("transition_time_ms").notNull(),
    isLive: d.boolean("is_live").default(false).notNull(),
    createdAt: d.timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  })
);

export const timeRanges = createTable(
  "time_range",
  (d) => ({
    id: d.serial("id").primaryKey(),
    scheduleId: d.integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
    startTime: d.timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: d.timestamp("end_time", { withTimezone: true }).notNull(),
  })
);

export const timeSlots = createTable(
  "time_slot",
  (d) => ({
    id: d.serial("id").primaryKey(),
    scheduleId: d.integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
    slotIndex: d.integer("slot_index").notNull(),
    startTime: d.timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: d.timestamp("end_time", { withTimezone: true }).notNull(),
  })
);

export const scheduleEntries = createTable(
  "schedule_entry",
  (d) => ({
    id: d.serial("id").primaryKey(),
    timeSlotId: d.integer("time_slot_id").notNull().references(() => timeSlots.id, { onDelete: "cascade" }),
    groupId: d.integer("group_id").notNull().references(() => groups.id),
    gameId: d.integer("game_id").notNull().references(() => games.id),
    round: d.integer("round").notNull().default(1),
    isSecondChance: d.boolean("is_second_chance").notNull().default(false),
  })
);

// Add scores table
export const scores = createTable(
  "score",
  (d) => ({
    id: d.serial("id").primaryKey(),
    groupId: d.integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    gameId: d.integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    round: d.integer("round").notNull().default(1),
    score: d.integer("score").notNull().default(0),
    createdAt: d.timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    // Ensure unique combination of group, game, and round
    index("score_group_game_round_idx").on(t.groupId, t.gameId, t.round),
  ]
);

// Define relations
export const schedulesRelations = relations(schedules, ({ many }) => ({
  timeRanges: many(timeRanges),
  timeSlots: many(timeSlots),
}));

export const timeSlotsRelations = relations(timeSlots, ({ one, many }) => ({
  schedule: one(schedules, {
    fields: [timeSlots.scheduleId],
    references: [schedules.id],
  }),
  entries: many(scheduleEntries),
}));

export const scheduleEntriesRelations = relations(scheduleEntries, ({ one }) => ({
  timeSlot: one(timeSlots, {
    fields: [scheduleEntries.timeSlotId],
    references: [timeSlots.id],
  }),
  group: one(groups, {
    fields: [scheduleEntries.groupId],
    references: [groups.id],
  }),
  game: one(games, {
    fields: [scheduleEntries.gameId],
    references: [games.id],
  }),
}));

// Add scores relations
export const scoresRelations = relations(scores, ({ one }) => ({
  group: one(groups, {
    fields: [scores.groupId],
    references: [groups.id],
  }),
  game: one(games, {
    fields: [scores.gameId],
    references: [games.id],
  }),
}));

// Add relations to groups and games for scores
export const groupsRelations = relations(groups, ({ many }) => ({
  scheduleEntries: many(scheduleEntries),
  scores: many(scores),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  scheduleEntries: many(scheduleEntries),
  scores: many(scores),
}));