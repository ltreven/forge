"use client";

import { useEffect, useState } from "react";
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
  GripVertical
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager";

type HealthStatus = "online" | "starting" | "offline";

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
  k8sStatus?: "pending" | "provisioning" | "running" | "failed" | "terminated" | null;
}

function computeHealth(a: Agent): HealthStatus {
  const k8s = a.k8sStatus;
  if (k8s === "running") return "online";
  if (k8s === "failed" || k8s === "terminated") return "offline";
  return "starting";
}


interface Team {
  id: string; name: string; icon?: string; mission?: string;
  waysOfWorking?: string; template?: string;
  createdAt: string;
}

export interface Project {
  id: string; title: string; shortSummary?: string | null;
  status: number; priority: number; health: string;
  updatedAt: string;
}

export interface TeamTask {
  id: string; title: string; shortSummary?: string | null;
  status: number; priority: number;
  updatedAt: string;
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

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color  = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const isLead = agent.type === "team_lead";
  const health = computeHealth(agent);

  const healthLabels = {
    online: "Online",
    starting: "Provisioning",
    offline: "Offline"
  };
  const healthLabel = healthLabels[health];

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
        <div className="flex items-center gap-1">
          <span className={cn(
            "relative flex size-2 shrink-0 rounded-full",
            health === "online"   && "bg-emerald-500",
            health === "starting" && "bg-amber-400",
            health === "offline"  && "bg-red-500",
          )}>
            {health === "online" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            )}
            {health === "starting" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            )}
          </span>
          <span className="text-[10px] text-muted-foreground/50">{healthLabel}</span>
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

function ProjectListItem({ project }: { project: Project }) {
  return (
    <div className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
      <GripVertical className="size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
      <span className="text-[10px] font-mono font-medium text-muted-foreground w-16 shrink-0">
        {getShorthandId("PRJ", project.id)}
      </span>
      <StatusIcon status={project.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Forge
        </span>
        <span className="text-[10px] text-muted-foreground/60 w-12 text-right">
          {formatDate(project.updatedAt)}
        </span>
        <MoreHorizontal className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function TaskListItem({ task }: { task: TeamTask }) {
  const isHighPriority = task.priority >= 3;
  
  return (
    <div className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
      <GripVertical className="size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
      <span className="text-[10px] font-mono font-medium text-muted-foreground w-16 shrink-0">
        {getShorthandId("TSK", task.id)}
      </span>
      <StatusIcon status={task.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isHighPriority && (
          <span className="hidden sm:inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
            {PRIORITY_LABELS[task.priority]}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60 w-12 text-right">
          {formatDate(task.updatedAt)}
        </span>
        <MoreHorizontal className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
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
  const [tasks, setTasks]         = useState<TeamTask[]>([]);
  
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers }),
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/projects`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/tasks`, { headers }),
    ])
      .then(async ([teamRes, agentsRes, projectsRes, tasksRes]) => {
        if (teamRes.ok) {
          const d = await teamRes.json();
          const t: Team = d.data;
          setTeam(t);
        } else {
          toast.error("Team not found.");
          router.replace("/teams");
        }
        if (agentsRes.ok) {
          const d = await agentsRes.json();
          // Sort: team_lead first
          const all: Agent[] = d.data ?? [];
          all.sort((a, b) => {
            if (a.type === "team_lead") return -1;
            if (b.type === "team_lead") return 1;
            return 0;
          });
          setAgents(all);
        }
        if (projectsRes.ok) {
          const d = await projectsRes.json();
          setProjects(d.data ?? []);
        }
        if (tasksRes.ok) {
          const d = await tasksRes.json();
          setTasks(d.data ?? []);
        }
      })
      .catch(() => toast.error("Failed to load team."))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

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
  
  const activeProjects = projects.filter(p => p.status >= 1 && p.status <= 3);
  const activeTasks = tasks.filter(t => t.status >= 1 && t.status <= 3).sort((a,b) => b.priority - a.priority);

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
        
        {/* Active Work (Combined Projects & Tasks) */}
        <section id="team-projects" className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-6 pb-2">
            <SectionTitle icon={FolderKanban} label="Active Work" />
          </div>
          
          <div className="px-3 pb-6">
            {/* Projects Section */}
            {activeProjects.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between py-2 px-3">
                   <div className="flex items-center gap-2">
                     <ChevronDown className="size-3 text-muted-foreground/50" />
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Projects</h3>
                     <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">{activeProjects.length}</span>
                   </div>
                   <button className="text-muted-foreground hover:text-foreground transition-colors">
                     <Plus className="size-3.5" />
                   </button>
                </div>
                
                <div className="space-y-0.5">
                  {(showAllProjects ? activeProjects : activeProjects.slice(0, 3)).map(p => (
                    <ProjectListItem key={p.id} project={p} />
                  ))}
                </div>
                
                {activeProjects.length > 3 && (
                  <button 
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="mt-1 w-full py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {showAllProjects ? (
                      <>Show less <ChevronUp className="size-3" /></>
                    ) : (
                      <>See {activeProjects.length - 3} more projects <ChevronDown className="size-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}
            
            {/* Tasks Section */}
            {activeTasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between py-2 px-3">
                   <div className="flex items-center gap-2">
                     <ChevronDown className="size-3 text-muted-foreground/50" />
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Tasks</h3>
                     <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">{activeTasks.length}</span>
                   </div>
                   <button className="text-muted-foreground hover:text-foreground transition-colors">
                     <Plus className="size-3.5" />
                   </button>
                </div>
                
                <div className="space-y-0.5">
                  {(showAllTasks ? activeTasks : activeTasks.slice(0, 3)).map(t => (
                    <TaskListItem key={t.id} task={t} />
                  ))}
                </div>
                
                {activeTasks.length > 3 && (
                  <button 
                    onClick={() => setShowAllTasks(!showAllTasks)}
                    className="mt-1 w-full py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {showAllTasks ? (
                      <>Show less <ChevronUp className="size-3" /></>
                    ) : (
                      <>See {activeTasks.length - 3} more tasks <ChevronDown className="size-3" /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Empty State */}
            {activeProjects.length === 0 && activeTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <FolderKanban className="size-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No active work</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Projects and tasks will appear here once your team starts working.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity — placeholder */}
        <section id="team-activity" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionTitle icon={Activity} label="Recent Activity" className="mb-4" />
          <div className="flex flex-col gap-3">
            {/* Skeleton placeholder rows */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
                <div className="size-6 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                  <div className="h-2 rounded bg-muted animate-pulse" style={{ width: `${30 + i * 5}%` }} />
                </div>
                <div className="h-2 w-10 rounded bg-muted animate-pulse" />
              </div>
            ))}
            <p className="text-center text-xs text-muted-foreground/50 pt-1">
              Activity feed coming soon
            </p>
          </div>
        </section>
      </div>

    </div>
  );
}
