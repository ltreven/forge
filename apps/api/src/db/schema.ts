import { pgTable, uuid, text, timestamp, pgEnum, jsonb, integer, type AnyPgColumn } from "drizzle-orm/pg-core";

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
export const projectHealthEnum = pgEnum("project_health", [
  "unknown",
  "on_track",
  "at_risk",
  "off_track",
]);

export const actorTypeEnum = pgEnum("actor_type", ["human", "agent"]);
export const requestStatusEnum = pgEnum("request_status", ["created", "processing", "responded"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "request_created",
  "request_received",
  "request_responded",
  "project_created",
  "task_created",
  "project_issue_created",
  "project_issue_blocked",
  "project_issue_unblocked",
  "task_blocked",
  "task_unblocked",
  "task_finished"
]);

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

// ── Project Management ───────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  shortSummary: text("short_summary"),
  descriptionMarkdown: text("description_markdown"),
  descriptionRichText: jsonb("description_rich_text"),
  startDateKind: text("start_date_kind"),
  startDateValue: text("start_date_value"),
  endDateKind: text("end_date_kind"),
  endDateValue: text("end_date_value"),
  status: integer("status").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  leadId: uuid("lead_id"),
  health: projectHealthEnum("health").notNull().default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectHealth = Project["health"];

export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  happenedAt: timestamp("happened_at", { withTimezone: true }).notNull().defaultNow(),
  oldHealth: projectHealthEnum("old_health").notNull(),
  newHealth: projectHealthEnum("new_health").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type NewProjectUpdate = typeof projectUpdates.$inferInsert;

export const projectIssues = pgTable("project_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentIssueId: uuid("parent_issue_id").references((): AnyPgColumn => projectIssues.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  shortSummary: text("short_summary"),
  descriptionMarkdown: text("description_markdown"),
  descriptionRichText: jsonb("description_rich_text"),
  status: integer("status").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  assignedToId: uuid("assigned_to_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectIssue = typeof projectIssues.$inferSelect;
export type NewProjectIssue = typeof projectIssues.$inferInsert;

export const projectActivities = pgTable("project_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectActivity = typeof projectActivities.$inferSelect;
export type NewProjectActivity = typeof projectActivities.$inferInsert;

// ── Continuous Kanban Tasks (not linked to projects) ─────────────────────────

export const teamTasks = pgTable("team_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => teamTasks.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  shortSummary: text("short_summary"),
  descriptionMarkdown: text("description_markdown"),
  descriptionRichText: jsonb("description_rich_text"),
  status: integer("status").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  assignedToId: uuid("assigned_to_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TeamTask = typeof teamTasks.$inferSelect;
export type NewTeamTask = typeof teamTasks.$inferInsert;

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
  teamTaskId: uuid("team_task_id").references((): AnyPgColumn => teamTasks.id, { onDelete: "set null" }),
  projectIssueId: uuid("project_issue_id").references((): AnyPgColumn => projectIssues.id, { onDelete: "set null" }),
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

// ── Team Activities (Log) ───────────────────────────────────────────────────

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

// ── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  teamTaskId: uuid("team_task_id").references((): AnyPgColumn => teamTasks.id, { onDelete: "cascade" }),
  projectIssueId: uuid("project_issue_id").references((): AnyPgColumn => projectIssues.id, { onDelete: "cascade" }),
  
  actorId: uuid("actor_id").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  
  content: text("content").notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
