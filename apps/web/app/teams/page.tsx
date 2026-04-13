"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot, Check, Code2, FileText,
  Loader2, Pencil, Plus, Settings2, Users, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "software_engineer" | "software_architect"
  | "product_manager"   | "project_manager";

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
}

interface Team {
  id: string; name: string; mission: string; createdAt: string;
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

// ── Tool definitions (kept for reference) ───────────────────────────────────
// Full tool configuration lives in /teams/[id]/settings

// ── Agent chip ────────────────────────────────────────────────────────────────

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

// ── Edit Team Modal ───────────────────────────────────────────────────────────

function EditTeamModal({ team, token, onSaved, onClose }: {
  team: Team; token: string | null;
  onSaved: (updated: Team) => void; onClose: () => void;
}) {
  const [name, setName]       = useState(team.name);
  const [mission, setMission] = useState(team.mission);
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!name.trim() || !mission.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim(), mission: mission.trim() }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      onSaved({ ...team, ...d.data });
      toast.success("Team updated.");
    } catch {
      toast.error("Failed to update team.");
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Edit Team</h2>
          <button type="button" onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Team name</label>
            <Input id="edit-team-name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Platform Engineering" className="h-9" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Mission</label>
            <Input id="edit-team-mission" value={mission} onChange={(e) => setMission(e.target.value)}
              placeholder="e.g. Build the core platform" className="h-9" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
          <Button id="edit-team-save" onClick={save} disabled={saving || !name.trim() || !mission.trim()} size="sm">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Team Tools Panel (removed — now a full settings page) ────────────────────
// Navigate to /teams/[id]/settings instead

// ── Team Card (full-width) ────────────────────────────────────────────────────

function TeamCard({ team, onAgentClick, onEditSaved }: {
  team: Team;
  onAgentClick: (agentId: string) => void;
  onEditSaved: (updated: Team) => void;
}) {
  const { token } = useAuth();
  const router    = useRouter();
  const color     = teamAccent(team);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Colour accent strip */}
        <div className="h-1 w-full" style={{ background: color }} />

        <div className="px-6 py-5">
          {/* ── Row 1: team identity + action buttons ── */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
              style={{ background: color + "20" }}>
              <Users className="size-5" style={{ color }} />
            </div>

            {/* Name + mission */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground leading-tight">{team.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{team.mission}</p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Edit */}
              <button id={`edit-team-${team.id}`} type="button"
                onClick={() => setEditOpen(true)}
                title="Edit team"
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                <Pencil className="size-3.5" />
                Edit
              </button>
              {/* Tools → full settings page */}
              <Link href={`/teams/${team.id}/settings`}
                id={`tools-team-${team.id}`}
                title="Team Settings"
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/5 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors hover:bg-violet-500/10">
                <Settings2 className="size-3.5" />
                Settings
              </Link>
            </div>
          </div>

          {/* ── Row 2: agents ── */}
          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Agents · {team.agents.length}
              </span>
              {/* Add agent — coming soon */}
              <button id={`add-agent-${team.id}`} type="button" disabled
                title="Coming soon"
                className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                <Plus className="size-3" />
                Add Agent
              </button>
            </div>

            {team.agents.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
                <Bot className="size-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">No agents yet.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {team.agents.map((agent) => (
                  <AgentChip key={agent.id} agent={agent} onClick={() => onAgentClick(agent.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditTeamModal
          team={team} token={token}
          onSaved={(updated) => { onEditSaved(updated); setEditOpen(false); }}
          onClose={() => setEditOpen(false)} />
      )}
    </>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { t }                             = useTranslation();
  const { token, isLoading: authLoading } = useAuth();
  const router                            = useRouter();
  const tp                                = t.teamsPage;

  const [teams, setTeams]             = useState<Team[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

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

  const handleTeamSaved = useCallback((updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  }, []);

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
              onEditSaved={handleTeamSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
