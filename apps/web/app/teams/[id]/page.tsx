"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Crown,
  Layers,
  Loader2,
  Settings2,
  Zap,
  Activity,
  FolderKanban,
  Plus,
  ListTodo,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Circle,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Flame,
  AlertTriangle,
  Flag
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Team, Project, ProjectIssue, TeamTask, Agent, AgentType, HealthStatus, TeamActivity } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

export type DisplayStatus = "provisioning" | "offline" | "available" | "busy" | "blocked";

function computeDisplayStatus(a: Agent): DisplayStatus {
  const k8s = a.k8sStatus;
  if (k8s === "failed" || k8s === "terminated") return "offline";
  if (k8s !== "running") return "provisioning";
  
  return a.availability || "available";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  team_lead:          "#6366f1",
  software_engineer:  "#3b82f6",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
};

const ROLE_LABELS: Record<string, string> = {
  team_lead:          "Team Lead",
  software_engineer:  "Software Engineer",
  software_architect: "Software Architect",
  product_manager:    "Product Manager",
};

const ROLE_EMOJIS: Record<string, string> = {
  team_lead:          "👑",
  software_engineer:  "🛠️",
  software_architect: "🏛️",
  product_manager:    "📋",
};

const STATUS_LABELS: Record<number, string> = {
  0: "Backlog",
  1: "To Do",
  2: "In Progress",
  3: "In Review",
  4: "Done",
  5: "Cancelled",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

// ── Priority Icon ─────────────────────────────────────────────────────────────

function PriorityIcon({ priority, className }: { priority: number; className?: string }) {
  switch (priority) {
    case 0: return <Circle className={cn("size-3 text-muted-foreground/20", className)} />;
    case 1: return <SignalLow className={cn("size-3 text-blue-500/70", className)} />;
    case 2: return <SignalMedium className={cn("size-3 text-amber-500/70", className)} />;
    case 3: return <SignalHigh className={cn("size-3 text-orange-500", className)} />;
    case 4: return <Flame className={cn("size-3 text-red-500 animate-pulse", className)} />;
    default: return null;
  }
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color  = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const isLead = agent.type === "team_lead";
  const status = computeDisplayStatus(agent);

  const statusLabels: Record<DisplayStatus, string> = {
    available: "Available",
    busy: "Processing",
    blocked: "Blocked",
    provisioning: "Provisioning",
    offline: "Offline"
  };
  const statusLabel = statusLabels[status];

  return (
    <button
      id={`agent-card-${agent.id}`}
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm",
        isLead
          ? "border-primary/40 bg-primary/5 hover:border-primary/60"
          : "border-border hover:border-primary/30"
      )}
    >
      <div
        className="relative flex size-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm transition-transform group-hover:scale-105"
        style={{ background: color + "25" }}
      >
        <span>{agent.icon ?? ROLE_EMOJIS[agent.type] ?? "🤖"}</span>
        {isLead && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px]">
            <Crown className="size-2.5 text-primary-foreground" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
          {isLead && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              Team Lead
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[agent.type] ?? agent.type}</p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          Open →
        </span>
        <div className="flex items-center gap-1.5">
          {status === "busy" ? (
            <Loader2 className="size-3 animate-spin text-blue-500" />
          ) : status === "blocked" ? (
            <Flag className="size-3 text-red-500 fill-red-500" />
          ) : (
            <span className={cn(
              "relative flex size-2 shrink-0 rounded-full",
              status === "available"    && "bg-emerald-500",
              status === "provisioning" && "bg-amber-400",
              status === "offline"      && "bg-red-500",
            )}>
              {status === "provisioning" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              )}
            </span>
          )}
          <span className="text-[10px] font-medium text-muted-foreground/70">{statusLabel}</span>
        </div>
      </div>
    </button>
  );
}

// ── Project & Task Cards ──────────────────────────────────────────────────────

// ── Project & Task List Items ────────────────────────────────────────────────

function StatusIcon({ status }: { status: number }) {
  // 0: Backlog, 1: To Do, 2: In Progress, 3: In Review, 4: Done, 5: Cancelled
  switch (status) {
    case 0: return <Circle className="size-3.5 text-muted-foreground/40" />;
    case 1: return <Circle className="size-3.5 text-muted-foreground" />;
    case 2: return <CircleDot className="size-3.5 text-amber-500 animate-pulse" />;
    case 3: return <CircleDashed className="size-3.5 text-blue-500" />;
    case 4: return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case 5: return <Circle className="size-3.5 text-red-500/50" />;
    default: return <Circle className="size-3.5 text-muted-foreground" />;
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getShorthandId(prefix: string, id: string) {
  return `${prefix}-${id.substring(0, 4).toUpperCase()}`;
}

function ItemRow({ 
  id, prefix, title, status, priority, updatedAt, assignedToId, 
  level = 0, children, agents, href
}: { 
  id: string; prefix: string; title: string; status: number; 
  priority: number; updatedAt: string; assignedToId?: string | null;
  level?: number; children?: React.ReactNode; agents: Agent[]; href?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const assignee = agents.find(a => a.id === assignedToId);
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "group flex items-center gap-2 py-1.5 px-3 hover:bg-muted/40 rounded-lg transition-colors cursor-pointer",
          level > 0 && "ml-4 border-l border-border/50 pl-4"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {hasChildren ? (
            <button className="p-0.5 hover:bg-muted rounded transition-colors" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
              {isExpanded ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
            </button>
          ) : (
            <div className="size-4" />
          )}
          <span className="text-[9px] font-mono font-medium text-muted-foreground/50 w-14 shrink-0">
            {getShorthandId(prefix, id)}
          </span>
        </div>

        <StatusIcon status={status} />
        
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {href ? (
            <Link 
              href={href} 
              className={cn("text-sm font-medium truncate hover:underline", status === 4 ? "text-muted-foreground line-through" : "text-foreground")}
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </Link>
          ) : (
            <p className={cn("text-sm font-medium truncate", status === 4 ? "text-muted-foreground line-through" : "text-foreground")}>
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PriorityIcon priority={priority} />
          
          {assignee && (
            <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px]" title={assignee.name}>
              {assignee.icon || ROLE_EMOJIS[assignee.type] || "🤖"}
            </div>
          )}

          <span className="text-[9px] text-muted-foreground/40 w-10 text-right">
            {formatDate(updatedAt)}
          </span>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </div>
  );
}

function ProjectListItem({ project, issues, agents }: { project: Project, issues: ProjectIssue[], agents: Agent[] }) {
  const projectIssues = issues.filter(i => i.projectId === project.id && !i.parentIssueId);
  const params = useParams();
  const teamId = String(params.id);

  return (
    <ItemRow 
      id={project.id} prefix="PRJ" title={project.title} 
      status={project.status} priority={project.priority} 
      updatedAt={project.updatedAt} assignedToId={project.leadId}
      agents={agents}
      href={`/teams/${teamId}/projects/${project.id}`}
    >
      {projectIssues.map(issue => (
        <IssueItem key={issue.id} issue={issue} allIssues={issues} agents={agents} level={1} />
      ))}
    </ItemRow>
  );
}

function IssueItem({ issue, allIssues, agents, level }: { issue: ProjectIssue, allIssues: ProjectIssue[], agents: Agent[], level: number }) {
  const subIssues = allIssues.filter(i => i.parentIssueId === issue.id);
  const params = useParams();
  const teamId = String(params.id);
  
  return (
    <ItemRow 
      id={issue.id} prefix="ISS" title={issue.title} 
      status={issue.status} priority={issue.priority} 
      updatedAt={issue.updatedAt} assignedToId={issue.assignedToId}
      level={level} agents={agents}
      href={`/teams/${teamId}/projects/${issue.projectId}/issues/${issue.id}`}
    >
      {level < 2 && subIssues.map(sub => (
        <IssueItem key={sub.id} issue={sub} allIssues={allIssues} agents={agents} level={level + 1} />
      ))}
    </ItemRow>
  );
}

function TaskListItem({ task, allTasks, agents, level = 0 }: { task: TeamTask, allTasks: TeamTask[], agents: Agent[], level?: number }) {
  const subTasks = allTasks.filter(t => t.parentTaskId === task.id);
  const params = useParams();
  const teamId = String(params.id);

  return (
    <ItemRow 
      id={task.id} prefix="TSK" title={task.title} 
      status={task.status} priority={task.priority} 
      updatedAt={task.updatedAt} assignedToId={task.assignedToId}
      level={level} agents={agents}
      href={`/teams/${teamId}/tasks/${task.id}`}
    >
      {level < 2 && subTasks.map(sub => (
        <TaskListItem key={sub.id} task={sub} allTasks={allTasks} agents={agents} level={level + 1} />
      ))}
    </ItemRow>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, className }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam]           = useState<Team | null>(null);
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [issues, setIssues]       = useState<ProjectIssue[]>([]);
  const [tasks, setTasks]         = useState<TeamTask[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isTasksCollapsed, setIsTasksCollapsed] = useState(false);
  const [viewFilter, setViewFilter] = useState<"active" | "all">("active");

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const fetchAgents = async () => {
      try {
        const agentsRes = await fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers });
        if (agentsRes.ok) {
          const d = await agentsRes.json();
          const all: Agent[] = d.data ?? [];
          all.sort((a, b) => {
            if (a.type === "team_lead") return -1;
            if (b.type === "team_lead") return 1;
            return 0;
          });
          setAgents(all);
        }
      } catch (err) {
        console.error("Failed to poll agents", err);
      }
    };

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers }),
      fetchAgents(), // Initial fetch
      fetch(`${API_BASE}/teams/${teamId}/projects`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/issues`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/tasks`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/activities`, { headers }),
    ])
      .then(async ([teamRes, _agentsRes, projectsRes, issuesRes, tasksRes, activitiesRes]) => {
        if (teamRes && teamRes.ok) {
          const d = await teamRes.json();
          const t: Team = d.data;
          setTeam(t);
        } else if (teamRes && !teamRes.ok) {
          toast.error("Team not found.");
          router.replace("/teams");
        }
        
        if (projectsRes && projectsRes.ok) {
          const d = await projectsRes.json();
          setProjects(d.data ?? []);
        }
        if (issuesRes && issuesRes.ok) {
          const d = await issuesRes.json();
          setIssues(d.data ?? []);
        }
        if (tasksRes && tasksRes.ok) {
          const d = await tasksRes.json();
          setTasks(d.data ?? []);
        }
        if (activitiesRes && activitiesRes.ok) {
          const d = await activitiesRes.json();
          setActivities(d.data ?? []);
        }
      })
      .catch(() => toast.error("Failed to load team."))
      .finally(() => setIsLoading(false));

    // Polling interval for agents (every 5 seconds)
    const intervalId = setInterval(fetchAgents, 5000);
    return () => clearInterval(intervalId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const handleCreateProject = async () => {
    const title = prompt("Project title:");
    if (!title) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId, title, status: 1, priority: 1 }),
      });
      if (!res.ok) throw new Error();
      const newProj = (await res.json()).data;
      setProjects(p => [...p, newProj]);
      toast.success("Project created");
    } catch { toast.error("Failed to create project"); }
  };

  const handleCreateStandaloneTask = async () => {
    const title = prompt("Task title:");
    if (!title) return;
    try {
      const res = await fetch(`${API_BASE}/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId, title, status: 1, priority: 1 }),
      });
      if (!res.ok) throw new Error();
      const newTask = (await res.json()).data;
      setTasks(p => [...p, newTask]);
      toast.success("Task created");
    } catch { toast.error("Failed to create task"); }
  };

  // ── Guards ────────────────────────────────────────────────────────────────


  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading team…</p>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const teamLead  = agents.find((a) => a.type === "team_lead");
  const otherAgents = agents.filter((a) => a.type !== "team_lead");
  
  const filteredProjects = projects.filter(p => {
    if (viewFilter === "active") return p.status >= 1 && p.status <= 4;
    return true; // "all"
  });

  const filteredTasks = tasks.filter(t => {
    if (viewFilter === "active") return t.status >= 1 && t.status <= 4;
    return true; // "all"
  }).sort((a,b) => b.priority - a.priority);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Back link ──────────────────────────────────────────────────── */}
      <Link href="/teams" id="back-to-teams"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        My Teams
      </Link>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm bg-primary/10">
            {team.icon ?? <Layers className="size-7 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">{team.name}</h1>
            {team.mission && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{team.mission}</p>
            )}
            {team.template && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">
                {team.template === "starter" ? "🧩" : team.template === "engineering" ? "💻" : "🎧"} {team.template}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/teams/${teamId}/general`}
            id="header-nav-general"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-foreground active:scale-95"
          >
            <Settings2 className="size-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <Link
            href={`/teams/${teamId}/integrations`}
            id="header-nav-integrations"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-foreground active:scale-95"
          >
            <Zap className="size-3.5" />
            <span className="hidden sm:inline">Integrations</span>
          </Link>
        </div>
      </div>

      {/* ── Team Agents ────────────────────────────────────────────────── */}
      <section id="team-agents" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={Bot} label="Agents" />
          <Link
            href={`/teams/${teamId}/agents/new`}
            id="new-agent-btn"
            className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md active:scale-95"
          >
            <Plus className="size-3.5" />
            New Agent
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6">
            <Bot className="size-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No agents on this team yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Team lead first, prominent */}
            {teamLead && (
              <AgentCard
                agent={teamLead}
                onClick={() => router.push(`/agents/${teamLead.id}`)}
              />
            )}

            {/* Separator */}
            {teamLead && otherAgents.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {/* Rest of agents */}
            {otherAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => router.push(`/agents/${agent.id}`)}
              />
            ))}
          </div>
        )}
      </section>


      {/* ── Bottom rows: Projects & Activity ──────────────────────────── */}
      <div className="flex flex-col gap-6 mt-6">
        
        {/* TEAM WORK (Combined Projects & Tasks) */}
        <section id="team-projects" className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SectionTitle icon={FolderKanban} label="Team Work" />
            
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
              <button 
                onClick={() => setViewFilter("active")}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  viewFilter === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Active
              </button>
              <button 
                onClick={() => setViewFilter("all")}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  viewFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Statuses
              </button>
            </div>
          </div>
          
          <div className="px-3 pb-6">
            {/* Projects Section */}
            {(filteredProjects.length > 0 || viewFilter === "all") && (
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/30 rounded-lg group"
                  onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
                >
                   <div className="flex items-center gap-2">
                     {isProjectsCollapsed ? <ChevronRight className="size-3 text-muted-foreground/50" /> : <ChevronDown className="size-3 text-muted-foreground/50" />}
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Projects</h3>
                     <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">{filteredProjects.length}</span>
                   </div>
                   <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); handleCreateProject(); }}>
                     <Plus className="size-3.5" />
                   </button>
                </div>
                
                {!isProjectsCollapsed && (
                  <div className="space-y-0.5">
                    {filteredProjects.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground/40 italic">No projects in this view</p>
                    ) : (
                      (showAllProjects ? filteredProjects : filteredProjects.slice(0, 5)).map(p => (
                        <ProjectListItem key={p.id} project={p} issues={issues} agents={agents} />
                      ))
                    )}
                  </div>
                )}
                
                {!isProjectsCollapsed && filteredProjects.length > 5 && (
                  <button 
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="mt-1 w-full py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {showAllProjects ? (
                      <>Show less <ChevronUp className="size-3" /></>
                    ) : (
                      <>See {filteredProjects.length - 5} more projects <ChevronDown className="size-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
            
            {/* Tasks Section */}
            {(filteredTasks.length > 0 || viewFilter === "all") && (
              <div>
                <div 
                  className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/30 rounded-lg group"
                  onClick={() => setIsTasksCollapsed(!isTasksCollapsed)}
                >
                   <div className="flex items-center gap-2">
                     {isTasksCollapsed ? <ChevronRight className="size-3 text-muted-foreground/50" /> : <ChevronDown className="size-3 text-muted-foreground/50" />}
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Tasks</h3>
                     <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">{filteredTasks.length}</span>
                   </div>
                   <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); handleCreateStandaloneTask(); }}>
                     <Plus className="size-3.5" />
                   </button>
                </div>
                
                {!isTasksCollapsed && (
                  <div className="space-y-0.5">
                    {filteredTasks.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground/40 italic">No tasks in this view</p>
                    ) : (
                      (showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)).map(t => (
                        <TaskListItem key={t.id} task={t} allTasks={tasks} agents={agents} />
                      ))
                    )}
                  </div>
                )}
                
                {!isTasksCollapsed && filteredTasks.length > 5 && (
                  <button 
                    onClick={() => setShowAllTasks(!showAllTasks)}
                    className="mt-1 w-full py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {showAllTasks ? (
                      <>Show less <ChevronUp className="size-3" /></>
                    ) : (
                      <>See {filteredTasks.length - 5} more tasks <ChevronDown className="size-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Global Empty State */}
            {filteredProjects.length === 0 && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <FolderKanban className="size-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No work found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try changing the filter to see more items.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section id="team-activity" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionTitle icon={Activity} label="Recent Activity" className="mb-4" />
          <div className="flex flex-col gap-3">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                <Activity className="size-6 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              activities.map((act) => {
                const isHuman = act.actorType === "human";
                const agent = isHuman ? null : agents.find(a => a.id === act.actorId);
                const title = act.payload?.title || act.entityId.substring(0, 8);
                
                let text = "";
                switch (act.type) {
                  case "project_created": text = `created project "${title}"`; break;
                  case "task_created": text = `created task "${title}"`; break;
                  case "project_issue_created": text = `created issue "${title}"`; break;
                  case "request_created": text = `requested a task to be executed`; break;
                  case "request_received": text = `started processing a request`; break;
                  case "request_responded": text = `responded to a request`; break;
                  case "task_blocked": text = `blocked task "${title}"`; break;
                  case "task_unblocked": text = `unblocked task "${title}"`; break;
                  case "task_finished": text = `finished task "${title}"`; break;
                  default: text = `performed ${act.type} on ${act.entityType}`;
                }

                return (
                  <div key={act.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]" title={isHuman ? "Human" : agent?.name}>
                      {isHuman ? "👤" : (agent?.icon || ROLE_EMOJIS[agent?.type || ""] || "🤖")}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{isHuman ? "Team Member" : agent?.name || "Unknown Agent"}</span> {text}
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 shrink-0">
                      {formatDate(act.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
