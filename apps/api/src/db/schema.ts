import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const agentTypeEnum = pgEnum("agent_type", [
  "software_engineer",
  "product_manager",
  "project_manager",
  "software_architect",
]);

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mission: text("mission").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

// ── Agents ────────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: agentTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
