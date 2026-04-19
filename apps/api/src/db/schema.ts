import { pgTable, uuid, text, timestamp, pgEnum, jsonb, integer } from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const agentTypeEnum = pgEnum("agent_type", [
  "team_lead",
  "software_engineer",
  "product_manager",
  "software_architect",
]);

/**
 * Tracks the Kubernetes provisioning state of an agent workload.
 * Updated by the Agent Controller via PATCH /internal/agents/:id/k8s-status.
 */
export const agentK8sStatusEnum = pgEnum("agent_k8s_status", [
  "pending",       // CR not yet applied to cluster
  "provisioning", // CR applied, controller reconciling
  "running",      // Deployment Available
  "failed",       // Reconciliation error
  "terminated",   // CR deleted, resources being GC'd
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "linear",
  "jira",
  "trello",
  "github",
]);

export const counterpartTypeEnum = pgEnum("counterpart_type", [
  "human",
  "agent",
  "external",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ── Workspaces ────────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  waysOfWorking: text("ways_of_working"),
  /**
   * Kubernetes namespace for this workspace's agents.
   * Derived deterministically: forge-ws-{id[:8]}
   * Set on workspace creation; never changes.
   */
  k8sNamespace: text("k8s_namespace").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  mission: text("mission"),
  waysOfWorking: text("ways_of_working"),
  /** Template vertical: starter | engineering | customer_support */
  template: text("template").notNull().default("starter"),
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
  icon: text("icon"),
  /** JSON bag for avatarColor, telegramBotToken, telegramPairingCode, etc. */
  metadata: jsonb("metadata"),
  /** Current Kubernetes provisioning phase, updated by the Agent Controller. */
  k8sStatus: agentK8sStatusEnum("k8s_status").default("pending"),
  /** Name of the ForgeAgent CR in the cluster (equals agent UUID). */
  k8sResourceName: text("k8s_resource_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// ── Integrations ──────────────────────────────────────────────────────────────

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  apiKey: text("api_key"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

// ── Conversations ─────────────────────────────────────────────────────────────

/**
 * A conversation thread between an agent and a counterpart
 * (human user, another agent, or an external system).
 */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  counterpartType: counterpartTypeEnum("counterpart_type").notNull(),
  /** FK to users, agents, or free-form string for external systems */
  counterpartId: text("counterpart_id"),
  counterpartName: text("counterpart_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

// ── Messages ──────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  /** Token usage for this message (informational) */
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
