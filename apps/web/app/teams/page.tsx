"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users, Bot, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "software_engineer" | "software_architect"
  | "product_manager"   | "project_manager";

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  icon?: string;
  metadata?: { avatarColor?: string };
}

interface Team {
  id: string;
  name: string;
  mission: string;
  createdAt: string;
  agents: Agent[];
  workspace: { id: string; name: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<AgentType, string> = {
  software_engineer:  "#6366f1",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
  project_manager:    "#f59e0b",
};

const DEFAULT_AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#ef4444","#3b82f6","#84cc16","#f97316",
];

// ── Team colour derived from first agent ─────────────────────────────────────

function teamAccent(team: Team): string {
  const customColor = team.agents[0]?.metadata?.avatarColor;
  if (customColor) return customColor;
  const idx = Math.abs(team.id.charCodeAt(0) + team.id.charCodeAt(1)) % DEFAULT_AVATAR_COLORS.length;
  return DEFAULT_AVATAR_COLORS[idx];
}

// ── Agent avatar chip ─────────────────────────────────────────────────────────

function AgentChip({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const icon  = agent.icon ?? "🤖";

  return (
    <button
      id={`agent-chip-${agent.id}`}
      type="button"
      onClick={onClick}
      title={agent.name}
      className="group flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all hover:bg-muted/60 active:scale-95"
    >
      {/* Avatar circle */}
      <div
        className="flex size-10 items-center justify-center rounded-full text-lg shadow-sm ring-2 ring-background transition-transform group-hover:scale-110"
        style={{ background: color }}
      >
        {icon}
      </div>
      {/* Name */}
      <span className="max-w-[72px] truncate text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
        {agent.name}
      </span>
    </button>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, onAgentClick }: {
  team: Team;
  onAgentClick: (agentId: string) => void;
}) {
  const { t } = useTranslation();
  const tp    = t.teamsPage;
  const color = teamAccent(team);

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* Coloured top strip */}
      <div className="h-1 w-full" style={{ background: color }} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Team name + mission */}
        <div>
          <div className="flex items-start gap-3">
            {/* Team icon derived from colour */}
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
              style={{ background: color + "22" }}
            >
              <Users className="size-5" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-foreground">{team.name}</h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{team.mission}</p>
            </div>
          </div>
        </div>

        {/* Agents */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {tp.agents} · {team.agents.length}
          </p>

          {team.agents.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
              <Bot className="size-4 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">{tp.noAgents}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {team.agents.map((agent) => (
                <AgentChip
                  key={agent.id}
                  agent={agent}
                  onClick={() => onAgentClick(agent.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Team Button ───────────────────────────────────────────────────────────

function NewTeamButton({ label, tooltip }: { label: string; tooltip: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      id="new-team-btn"
      type="button"
      disabled
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-2.5 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60 transition-all hover:opacity-80"
    >
      <Plus className="size-4" />
      {label}
      {/* Tooltip */}
      {hovered && (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-normal text-background whitespace-nowrap shadow-lg">
          {tooltip}
        </span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { t }                     = useTranslation();
  const { token, user, isLoading: authLoading } = useAuth();
  const router                    = useRouter();
  const tp                        = t.teamsPage;

  const [teams, setTeams]           = useState<Team[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  useEffect(() => {
    // Wait until the auth context has rehydrated from localStorage.
    if (authLoading) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(`${API_BASE}/teams/mine`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((d) => setTeams(d.data ?? []))
      .catch(() => toast.error("Failed to load teams."))
      .finally(() => setIsLoading(false));
  }, [token, router, authLoading]);

  const workspaceName = teams[0]?.workspace?.name ?? null;
  // While auth is rehydrating from localStorage, show full-page spinner.
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {workspaceName && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {tp.workspaceLabel} · {workspaceName}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{tp.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tp.subtitle}</p>
        </div>

        <NewTeamButton label={tp.newTeam} tooltip={tp.newTeamComingSoon} />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <EmptyState label={tp.noTeams} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onAgentClick={(agentId) => router.push(`/agents/${agentId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Users className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
