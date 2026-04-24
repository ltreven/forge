import { pgTable, uuid, text, timestamp, pgEnum, jsonb, integer, boolean, unique, primaryKey, type AnyPgColumn } from "drizzle-orm/pg-core";

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

export const agentAvailabilityEnum = pgEnum("agent_availability", [
  "available",
  "busy",
  "blocked"
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

export const actorTypeEnum = pgEnum("actor_type", ["human", "agent"]);
export const requestStatusEnum = pgEnum("request_status", ["created", "processing", "responded"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "request_created",
  "request_received",
  "request_responded",
  "task_created",
  "task_updated",
  "task_blocked",
  "task_unblocked",
  "task_finished",
  "task_deleted"
]);

export const teamActivities = pgTable("team_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  type: activityTypeEnum("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamActivity = typeof teamActivities.$inferSelect;
export type NewTeamActivity = typeof teamActivities.$inferInsert;

// ── Users (Logical Reference) ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

// ── Workspaces (Logical Reference) ──────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  k8sNamespace: text("k8s_namespace"),
});

export type Workspace = typeof workspaces.$inferSelect;

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Logical reference to workspace in Admin API database */
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  identifierPrefix: text("identifier_prefix").notNull(),
  icon: text("icon"),
  mission: text("mission"),
  waysOfWorking: text("ways_of_working"),
  /** Template vertical: starter | engineering | customer_support */
  template: text("template").notNull().default("starter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq_team_prefix_workspace: unique().on(t.workspaceId, t.identifierPrefix),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  icon: text("icon"),
  /** JSON bag for avatarColor, telegramBotToken, telegramPairingCode, etc. */
  metadata: jsonb("metadata"),
  /**
   * Openclaw gateway authentication token.
   * Generated once on agent creation (crypto.randomBytes(32).toString('base64url')).
   * Passed to the pod as OPENCLAW_GATEWAY_TOKEN via the credentials Secret.
   * Never regenerated — same token persists across pod restarts (PVC state).
   */
  gatewayToken: text("gateway_token"),
  /** Current Kubernetes provisioning phase, updated by the Agent Controller. */
  k8sStatus: agentK8sStatusEnum("k8s_status").default("pending"),
  /** Name of the ForgeAgent CR in the cluster (equals agent UUID). */
  k8sResourceName: text("k8s_resource_name"),
  /** Current availability of the agent. */
  availability: agentAvailabilityEnum("availability").notNull().default("available"),
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

// ── Task Management (Kanban, Types, Labels) ────────────────────────────────

export const taskTypes = pgTable("task_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  backgroundColor: text("background_color").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TaskType = typeof taskTypes.$inferSelect;
export type NewTaskType = typeof taskTypes.$inferInsert;

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#333333"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
  taskTypeId: uuid("task_type_id").references(() => taskTypes.id, { onDelete: "set null" }),
  number: integer("number").notNull(),
  identifier: text("identifier").notNull(),
  title: text("title").notNull(),
  shortSummary: text("short_summary"),
  descriptionMarkdown: text("description_markdown"),
  descriptionRichText: jsonb("description_rich_text"),
  status: integer("status").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  assignedToId: uuid("assigned_to_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq_team_task_number: unique().on(t.teamId, t.number),
  unq_task_identifier: unique().on(t.teamId, t.identifier),
}));

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export const taskLabels = pgTable("task_labels", {
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  labelId: uuid("label_id")
    .notNull()
    .references(() => labels.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.labelId] }),
}));

export type TaskLabel = typeof taskLabels.$inferSelect;
export type NewTaskLabel = typeof taskLabels.$inferInsert;


// ── Team Requests (Agent-to-Agent / Human-to-Agent) ─────────────────────────

export const teamRequests = pgTable("team_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id").notNull(),
  requesterType: actorTypeEnum("requester_type").notNull(),
  targetAgentId: uuid("target_agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
  title: text("title").notNull().default("New Request"),
  inputData: jsonb("input_data"),
  responseContract: text("response_contract"),
  status: requestStatusEnum("status").notNull().default("created"),
  responseStatusCode: integer("response_status_code"),
  responseMetadata: jsonb("response_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamRequest = typeof teamRequests.$inferSelect;
export type NewTeamRequest = typeof teamRequests.$inferInsert;

// ── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
  
  actorId: uuid("actor_id").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  
  content: text("content").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// ── Meta Configuration (Templates & Roles) ──────────────────────────────────

export const teamTypes = pgTable("team_types", {
  id: text("id").primaryKey(), // Using text IDs like 'engineering', 'sales'
  name: text("name").notNull(),
  description: text("description"),
  featured: boolean("featured").notNull().default(false),
  mission: text("mission"),
  waysOfWorking: text("ways_of_working"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamType = typeof teamTypes.$inferSelect;

export const teamMetaCapabilities = pgTable("team_meta_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamTypeId: text("team_type_id")
    .notNull()
    .references(() => teamTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  triggers: jsonb("triggers"), // Array of string identifiers
  description: text("description").notNull(),
  inputsDescription: text("inputs_description"),
  expectedOutputsDescription: text("expected_outputs_description"),
  expectedEventsOutput: jsonb("expected_events_output"), // Array of strings
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamMetaCapability = typeof teamMetaCapabilities.$inferSelect;
export type NewTeamMetaCapability = typeof teamMetaCapabilities.$inferInsert;

export const teamCapabilities = pgTable("team_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  triggers: jsonb("triggers"),
  description: text("description").notNull(),
  inputsDescription: text("inputs_description"),
  expectedOutputsDescription: text("expected_outputs_description"),
  expectedEventsOutput: jsonb("expected_events_output"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  scheduleConfig: jsonb("schedule_config"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamCapability = typeof teamCapabilities.$inferSelect;
export type NewTeamCapability = typeof teamCapabilities.$inferInsert;

export const agentRoles = pgTable("agent_roles", {
  id: text("id").primaryKey(), // Using text IDs like 'software_engineer'
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji").notNull(),
  backgroundColor: text("background_color").notNull(), // Hex or CSS color
  suggestedName: text("suggested_name").notNull().default("agent_default_name"), // Dictionary key
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentRole = typeof agentRoles.$inferSelect;

export const teamTypeRoles = pgTable("team_type_roles", {
  teamTypeId: text("team_type_id")
    .notNull()
    .references(() => teamTypes.id, { onDelete: "cascade" }),
  agentRoleId: text("agent_role_id")
    .notNull()
    .references(() => agentRoles.id, { onDelete: "cascade" }),
  isLeader: boolean("is_leader").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.teamTypeId, t.agentRoleId] }),
}));

export type TeamTypeRole = typeof teamTypeRoles.$inferSelect;
