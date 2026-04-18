"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Crown,
  Layers,
  Loader2,
  Settings2,
  Zap,
  Activity,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager";

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
}

interface Team {
  id: string; name: string; icon?: string; mission?: string;
  waysOfWorking?: string; template?: string;
  createdAt: string;
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

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color  = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const isLead = agent.type === "team_lead";

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
          <span className="size-2 rounded-full bg-muted-foreground/30" title="Offline (not configured)" />
          <span className="text-[10px] text-muted-foreground/50">Offline</span>
        </div>
      </div>
    </button>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
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
    ])
      .then(async ([teamRes, agentsRes]) => {
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Back link ──────────────────────────────────────────────────── */}
      <Link href="/teams" id="back-to-teams"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        My Teams
      </Link>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm bg-primary/10">
          {team.icon ?? <Layers className="size-7 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{team.name}</h1>
          {team.mission && (
            <p className="mt-1 text-sm text-muted-foreground">{team.mission}</p>
          )}
          {team.template && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">
              {team.template === "starter" ? "🧩" : team.template === "engineering" ? "💻" : "🎧"} {team.template}
            </span>
          )}
        </div>
      </div>

      {/* ── 3-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── LEFT COLUMN: Agents + placeholders ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Agents section */}
          <section id="team-agents" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <SectionTitle icon={Bot} label="Agents" />

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

          {/* Active Projects — placeholder */}
          <section id="team-projects" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <SectionTitle icon={FolderKanban} label="Active Projects" />
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 py-10 text-center">
              <FolderKanban className="size-8 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No active projects</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Projects will appear here once your team starts working.</p>
              </div>
            </div>
          </section>

          {/* Recent Activity — placeholder */}
          <section id="team-activity" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <SectionTitle icon={Activity} label="Recent Activity" />
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

        {/* ── RIGHT COLUMN: Nav cards ── */}
        <div className="flex flex-col gap-4">

          {/* General Settings card */}
          <Link href={`/teams/${teamId}/general`} id="nav-general-settings"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
              <Settings2 className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">General Settings</p>
              <p className="text-xs text-muted-foreground mt-0.5">Name, emoji, mission, ways of working</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Integrations card */}
          <Link href={`/teams/${teamId}/integrations`} id="nav-integrations"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
              <Zap className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Integrations</p>
              <p className="text-xs text-muted-foreground mt-0.5">GitHub, Linear, Jira, Notion and more</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Quick info card */}
          <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 text-xs text-muted-foreground flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="font-medium">Agents</span>
              <span className="font-bold text-foreground">{agents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Template</span>
              <span className="font-bold text-foreground capitalize">{team.template ?? "starter"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Created</span>
              <span className="font-bold text-foreground">
                {new Date(team.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
