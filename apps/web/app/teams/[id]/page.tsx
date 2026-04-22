"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  ChevronUp,
  ChevronRight,
  GripVertical,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Flame,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Team, Project, ProjectIssue, TeamTask, Agent, AgentType, HealthStatus } from "@/lib/types";
import { StatusIcon, PriorityIcon } from "@/components/shared-ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeHealth(a: Agent): HealthStatus {
  const k8s = a.k8sStatus;
  if (k8s === "running") return "online";
  if (k8s === "failed" || k8s === "terminated") return "offline";
  return "starting";
}

const ROLE_COLORS: Record<string, string> = {
  team_lead:          "#6366f1",
  software_engineer:  "#3b82f6",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
};

const ROLE_LABELS: Record<string, string> = {
  team_lead:          "Team Lead",
  software_engineer:  "Engineer",
  software_architect: "Architect",
  product_manager:    "PM",
};

const ROLE_EMOJIS: Record<string, string> = {
  team_lead:          "👑",
  software_engineer:  "💻",
  software_architect: "🏛️",
  product_manager:    "🎨",
};

const STATUS_LABELS: Record<number, string> = {
  0: "Backlog",
  1: "To Do",
  2: "In Progress",
  3: "In Review",
  4: "Done",
  5: "Cancelled",
};

function getShorthandId(prefix: string, id: string) {
  return `${prefix}-${id.substring(0, 4).toUpperCase()}`;
}

// ── Components ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color  = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const isLead = agent.type === "team_lead";
  const health = computeHealth(agent);
  const healthLabel = health.charAt(0).toUpperCase() + health.slice(1);

  return (
    <div 
      onClick={onClick}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
         <Settings2 className="size-3.5 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div 
            className="flex size-12 items-center justify-center rounded-2xl text-2xl shadow-inner border border-white/10"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {agent.icon || ROLE_EMOJIS[agent.type] || "🤖"}
          </div>
          <span className={cn(
            "absolute -bottom-1 -right-1 block size-3.5 rounded-full border-2 border-card",
            health === "online"   ? "bg-emerald-500" :
            health === "starting" ? "bg-amber-500 animate-pulse" : "bg-red-500"
          )} />
          {isLead && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px]">
              <Crown className="size-2.5 text-primary-foreground" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold tracking-tight text-foreground">{agent.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {ROLE_LABELS[agent.type]}
            </span>
            <div className="size-1 rounded-full bg-border" />
            <span className={cn(
              "text-[10px] font-medium",
              health === "online"   && "text-emerald-600",
              health === "starting" && "text-amber-600",
              health === "offline"  && "text-red-600"
            )}>{healthLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
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
            {new Date(updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
  const [activities, setActivities] = useState<any[]>([]);
  
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isTasksCollapsed, setIsTasksCollapsed] = useState(false);
  const [viewFilter, setViewFilter] = useState<"active" | "all">("active");

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

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/activities`, { headers });
      if (res.ok) {
        const d = await res.json();
        setActivities(d.data ?? []);
      }
    } catch (err) {
      console.error("Failed to poll activities", err);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers }),
      fetchAgents(),
      fetchActivities(),
      fetch(`${API_BASE}/teams/${teamId}/projects`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/issues`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/tasks`, { headers }),
    ])
      .then(async ([teamRes, _agentsRes, _actRes, projectsRes, issuesRes, tasksRes]) => {
        if (teamRes && teamRes.ok) {
          const d = await teamRes.json();
          setTeam(d.data);
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
      })
      .catch(() => toast.error("Failed to load team."))
      .finally(() => setIsLoading(false));

    const intervalId = setInterval(() => {
      fetchAgents();
      fetchActivities();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [authLoading]);

  const handleCreateProject = async () => {
    const title = prompt("Project title:");
    if (!title) return;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers,
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
        headers,
        body: JSON.stringify({ teamId, title, status: 1, priority: 1 }),
      });
      if (!res.ok) throw new Error();
      const newTask = (await res.json()).data;
      setTasks(p => [...p, newTask]);
      toast.success("Task created");
    } catch { toast.error("Failed to create task"); }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) return null;

  const teamLead  = agents.find((a) => a.type === "team_lead");
  const otherAgents = agents.filter((a) => a.type !== "team_lead");
  
  const filteredProjects = projects.filter(p => {
    if (viewFilter === "active") return p.status >= 1 && p.status <= 4;
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (viewFilter === "active") return t.status >= 1 && t.status <= 4;
    return true;
  }).sort((a,b) => b.priority - a.priority);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/teams" id="back-to-teams"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Teams
      </Link>

      <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
              {team.icon || "🛡️"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{team.name}</h1>
          </div>
          {team.mission && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {team.mission}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            {team.template && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {team.template === "engineering" ? "💻" : "🎧"} {team.template}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/teams/${teamId}/general`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-muted px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
            Settings
          </Link>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-8">
          <section id="agents-grid">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle icon={Bot} label="Agents" />
              <Link
                href={`/teams/${teamId}/agents/new`}
                className="flex size-6 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teamLead && (
                <AgentCard agent={teamLead} onClick={() => router.push(`/agents/${teamLead.id}`)} />
              )}
              {otherAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onClick={() => router.push(`/agents/${agent.id}`)} />
              ))}
            </div>
          </section>

          <section id="team-projects" className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <SectionTitle icon={FolderKanban} label="Team Work" />
              <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
                <button onClick={() => setViewFilter("active")}
                  className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    viewFilter === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  Active
                </button>
                <button onClick={() => setViewFilter("all")}
                  className={cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    viewFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  All Statuses
                </button>
              </div>
            </div>
            
            <div className="px-3 pb-6">
              <div className="mb-4">
                <div className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/30 rounded-lg group"
                  onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}>
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
                    {filteredProjects.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground/40 italic">No projects</p> :
                      (showAllProjects ? filteredProjects : filteredProjects.slice(0, 5)).map(p => <ProjectListItem key={p.id} project={p} issues={issues} agents={agents} />)}
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/30 rounded-lg group"
                  onClick={() => setIsTasksCollapsed(!isTasksCollapsed)}>
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
                    {filteredTasks.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground/40 italic">No tasks</p> :
                      (showAllTasks ? filteredTasks : filteredTasks.slice(0, 5)).map(t => <TaskListItem key={t.id} task={t} allTasks={tasks} agents={agents} />)}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section id="team-activity" className="lg:col-span-1">
          <SectionTitle icon={Activity} label="Recent Activity" className="mb-4" />
          <div className="flex flex-col gap-4">
            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
                <p className="text-xs text-muted-foreground/40 italic">No activity yet</p>
              </div>
            ) : (
              activities.slice(0, 10).map((act) => {
                const isHuman = act.actorType === "human";
                const agent = isHuman ? null : agents.find((a) => a.id === act.actorId);
                const title = act.payload?.title || act.entityId.substring(0, 8);

                let text = "";
                switch (act.type) {
                  case "project_created": text = `created project "${title}"`; break;
                  case "project_updated": text = `updated project "${title}"`; break;
                  case "task_created": text = `created task "${title}"`; break;
                  case "project_issue_created": text = `created issue "${title}"`; break;
                  default: text = `performed ${act.type} on ${act.entityType}`;
                }

                return (
                  <div key={act.id} className="flex gap-3 items-start">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px]">
                      {isHuman ? "👤" : (agent?.icon || "🤖")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] leading-tight text-foreground">
                        <span className="font-bold">{isHuman ? "You" : agent?.name || "Agent"}</span> {text}
                      </p>
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
