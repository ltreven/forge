"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot, Loader2, Plus, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "team_lead"
  | "software_engineer" | "software_architect"
  | "product_manager"   | "project_manager";

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
}

interface Team {
  id: string; name: string; mission?: string; createdAt: string;
  agents: Agent[];
  workspace: { id: string; name: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  team_lead:          "#6366f1",
  software_engineer:  "#3b82f6",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
  project_manager:    "#f59e0b",
};

const DEFAULT_ACCENT_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#ef4444","#3b82f6","#84cc16","#f97316",
];

function teamAccent(team: Team): string {
  const c = team.agents[0]?.metadata?.avatarColor;
  if (c) return c;
  const idx = (team.id.charCodeAt(0) + team.id.charCodeAt(1)) % DEFAULT_ACCENT_COLORS.length;
  return DEFAULT_ACCENT_COLORS[idx];
}

// ── Agent Chip ────────────────────────────────────────────────────────────────

function AgentChip({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const color = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  return (
    <button id={`agent-chip-${agent.id}`} type="button" onClick={onClick}
      title={agent.name}
      className="group flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:shadow-sm active:scale-95">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: color }}>
        {agent.icon ?? "🤖"}
      </span>
      <span className="max-w-[90px] truncate">{agent.name}</span>
    </button>
  );
}

// ── New Team Button ───────────────────────────────────────────────────────────

function NewTeamButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <button id="new-team-btn" type="button" disabled
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-2.5 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed">
        <Plus className="size-4" />
        New Team
      </button>
      {hovered && (
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 rounded-lg bg-foreground px-3 py-1.5 text-[11px] text-background whitespace-nowrap shadow-lg">
          Coming soon
        </span>
      )}
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, onAgentClick }: {
  team: Team;
  onAgentClick: (agentId: string) => void;
}) {
  const color = teamAccent(team);

  return (
    <Link
      href={`/teams/${team.id}`}
      id={`team-card-${team.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      {/* Colour accent strip */}
      <div className="h-1 w-full transition-all group-hover:h-1.5" style={{ background: color }} />

      <div className="px-6 py-5">
        {/* ── Row 1: team identity ── */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm transition-transform group-hover:scale-105"
            style={{ background: color + "20" }}>
            <Users className="size-5" style={{ color }} />
          </div>

          {/* Name + mission */}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
              {team.name}
            </h2>
            {team.mission && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{team.mission}</p>
            )}
          </div>

          {/* Arrow hint */}
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0">
            Open →
          </span>
        </div>

        {/* ── Row 2: agents chips ── */}
        <div className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Agents · {team.agents.length}
            </span>
          </div>

          {team.agents.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
              <Bot className="size-4 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No agents yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" onClick={(e) => e.preventDefault()}>
              {team.agents.map((agent) => (
                <AgentChip key={agent.id} agent={agent} onClick={() => onAgentClick(agent.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { t }                             = useTranslation();
  const { token, isLoading: authLoading } = useAuth();
  const router                            = useRouter();
  const tp                                = t.teamsPage;

  const [teams, setTeams]         = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    fetch(`${API_BASE}/teams/mine`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTeams(d.data ?? []))
      .catch(() => toast.error("Failed to load teams."))
      .finally(() => setIsLoading(false));
  }, [token, router, authLoading]);

  const workspaceName = teams[0]?.workspace?.name ?? null;

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Header */}
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
        <NewTeamButton />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{tp.noTeams}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onAgentClick={(id) => router.push(`/agents/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
