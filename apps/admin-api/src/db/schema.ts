import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// ── Users ─────────────────────────────────────────────────────────────────────
// Only Admin can create/manage users via Control Plane
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

// ── Workspaces ────────────────────────────────────────────────────────────────
// Logical grouping for teams, owned by a user
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  k8sNamespace: text("k8s_namespace").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;

