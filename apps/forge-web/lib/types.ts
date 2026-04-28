export type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager";

export type HealthStatus = "online" | "starting" | "offline";

export type DisplayStatus = "provisioning" | "offline" | "available" | "busy" | "blocked";

export interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
  k8sStatus?: "pending" | "provisioning" | "running" | "failed" | "terminated" | null;
  availability?: "available" | "busy" | "blocked";
}

export interface Team {
  id: string;
  name: string;
  identifierPrefix: string;
  icon?: string;
  mission?: string;
  waysOfWorking?: string;
  template?: string;
  createdAt: string;
}



export interface Task {
  id: string;
  title: string;
  plan?: string | null;
  taskList?: string | null;
  executionLog?: string[] | null;
  workSummary?: string | null;
  assignedToId?: string | null;
  updatedAt: string;
}

export type RequestStatus = "created" | "processing" | "responded";

export interface TeamRequest {
  id: string;
  number: number;
  identifier: string;
  teamId: string;
  requesterId: string;
  requesterType: "human" | "agent";
  targetAgentId: string;
  taskId?: string | null;
  inputData?: any | null;
  responseContract?: string | null;
  status: RequestStatus;
  responseStatusCode?: number | null;
  responseMetadata?: any | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "request_created"
  | "request_received"
  | "request_responded"
  | "task_created"
  | "task_updated"
  | "task_blocked"
  | "task_unblocked"
  | "task_finished";

export interface TeamActivity {
  id: string;
  teamId: string;
  actorId: string;
  actorType: "human" | "agent";
  type: ActivityType;
  entityType: string;
  entityId: string;
  payload?: any | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  teamId: string;
  taskId?: string | null;
  actorId: string;
  actorType: "human" | "agent";
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  userId?: string | null;
  title?: string | null;
  metadata?: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any | null;
  createdAt: string;
}
