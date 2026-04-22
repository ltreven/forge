export type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager";

export type HealthStatus = "online" | "starting" | "offline";

export interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
  k8sStatus?: "pending" | "provisioning" | "running" | "failed" | "terminated" | null;
  availability?: "available" | "busy" | "blocked";
}

export interface Team {
  id: string;
  name: string;
  icon?: string;
  mission?: string;
  waysOfWorking?: string;
  template?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  shortSummary?: string | null;
  descriptionMarkdown?: string | null;
  descriptionRichText?: any | null;
  status: number;
  priority: number;
  health: string;
  leadId?: string | null;
  updatedAt: string;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  parentIssueId?: string | null;
  title: string;
  shortSummary?: string | null;
  descriptionMarkdown?: string | null;
  descriptionRichText?: any | null;
  status: number;
  priority: number;
  assignedToId?: string | null;
  updatedAt: string;
}

export interface TeamTask {
  id: string;
  title: string;
  parentTaskId?: string | null;
  shortSummary?: string | null;
  descriptionMarkdown?: string | null;
  descriptionRichText?: any | null;
  status: number;
  priority: number;
  assignedToId?: string | null;
  updatedAt: string;
}

export type RequestStatus = "created" | "processing" | "responded";

export interface TeamRequest {
  id: string;
  teamId: string;
  requesterId: string;
  requesterType: "human" | "agent";
  targetAgentId: string;
  teamTaskId?: string | null;
  projectIssueId?: string | null;
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
  | "project_created"
  | "project_updated"
  | "task_created"
  | "project_issue_created"
  | "project_issue_blocked"
  | "project_issue_unblocked"
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
  projectId?: string | null;
  teamTaskId?: string | null;
  projectIssueId?: string | null;
  actorId: string;
  actorType: "human" | "agent";
  content: string;
  createdAt: string;
  updatedAt: string;
}
