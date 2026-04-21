export type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager";

export type HealthStatus = "online" | "starting" | "offline";

export interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
  k8sStatus?: "pending" | "provisioning" | "running" | "failed" | "terminated" | null;
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
