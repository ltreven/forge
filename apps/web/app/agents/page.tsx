"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  Edit2,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type AgentType =
  | "software_engineer"
  | "software_architect"
  | "product_manager"
  | "project_manager";

type TelegramStatus =
  | "not_configured"
  | "registering"
  | "registered"
  | "complete";

type HealthStatus = "online" | "warning" | "offline";

interface AgentMetadata {
  avatarColor?: string;
  telegramBotToken?: string;
  telegramPairingCode?: string;
  telegramStatus?: TelegramStatus;
}

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  icon?: string;
  metadata?: AgentMetadata;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  "🤖", "🦾", "⚙️", "🧠", "🔬", "🛠️", "🚀", "⚡", "🔮", "🎯",
  "🌐", "💡", "🦊", "🐉", "🦅", "🦁", "🐺", "🦋", "🌊", "🔥",
];

const AVATAR_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#ef4444", // red
  "#3b82f6", // blue
  "#84cc16", // lime
  "#f97316", // orange
];

// ── Helper: compute health for one agent ──────────────────────────────────────

function computeHealth(agent: Agent): HealthStatus {
  const tgStatus = agent.metadata?.telegramStatus;
  if (!tgStatus || tgStatus === "not_configured" || tgStatus === "registering") {
    return "warning";
  }
  if (tgStatus === "complete") return "online";
  return "warning";
}

// ── Helper: obfuscate token ────────────────────────────────────────────────────

function obfuscate(token: string): string {
  if (token.length <= 10) return "•".repeat(token.length);
  return token.slice(0, 6) + "•".repeat(8) + token.slice(-4);
}

// ── Sub-component: HealthDot ───────────────────────────────────────────────────

function HealthDot({ status, label }: { status: HealthStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          "relative flex size-2.5 rounded-full",
          status === "online" && "bg-emerald-500",
          status === "warning" && "bg-amber-400",
          status === "offline" && "bg-red-500"
        )}
      >
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
      </span>
      <span
        className={cn(
          "text-xs font-medium",
          status === "online" && "text-emerald-600 dark:text-emerald-400",
          status === "warning" && "text-amber-600 dark:text-amber-400",
          status === "offline" && "text-red-600 dark:text-red-400"
        )}
      >
        {label}
      </span>
    </span>
  );
}

// ── Sub-component: AvatarPicker ────────────────────────────────────────────────

interface AvatarPickerProps {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
}

function AvatarPicker({ icon, color, onIconChange, onColorChange, onClose }: AvatarPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-xl"
    >
      {/* Emoji grid */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Emoji
      </p>
      <div className="mb-3 grid grid-cols-10 gap-1">
        {AVATAR_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onIconChange(e)}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg text-base transition-all hover:scale-110",
              icon === e && "ring-2 ring-primary ring-offset-1"
            )}
          >
            {e}
          </button>
        ))}
      </div>
      {/* Color swatches */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Color
      </p>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            style={{ background: c }}
            className={cn(
              "size-6 rounded-full transition-transform hover:scale-110",
              color === c && "ring-2 ring-offset-2 ring-foreground scale-110"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sub-component: TelegramSetup ───────────────────────────────────────────────

interface TelegramSetupProps {
  agentId: string;
  metadata: AgentMetadata;
  onMetadataChange: (m: AgentMetadata) => void;
  onSave: (m: AgentMetadata) => Promise<void>;
  t: ReturnType<typeof useTranslation>["t"];
}

function TelegramSetup({ agentId, metadata, onMetadataChange, onSave, t }: TelegramSetupProps) {
  const tg = t.agents.telegram;
  const status = metadata.telegramStatus ?? "not_configured";
  const [tokenInput, setTokenInput] = useState("");
  const [pairingInput, setPairingInput] = useState("");
  const [editingToken, setEditingToken] = useState(false);

  // Step 1 — submit token
  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) return;
    const next: AgentMetadata = {
      ...metadata,
      telegramBotToken: tokenInput.trim(),
      telegramStatus: "registering",
    };
    onMetadataChange(next);
    await onSave(next);
    setTokenInput("");

    // Simulate registration delay
    await new Promise((res) => setTimeout(res, 2500));
    const registered: AgentMetadata = { ...next, telegramStatus: "registered" };
    onMetadataChange(registered);
    await onSave(registered);
  };

  // Step 3 — submit pairing code
  const handlePairingSubmit = async () => {
    if (!pairingInput.trim()) return;
    const next: AgentMetadata = {
      ...metadata,
      telegramPairingCode: pairingInput.trim(),
      telegramStatus: "complete",
    };
    onMetadataChange(next);
    await onSave(next);
    setPairingInput("");
    toast.success("Agent paired via Telegram!");
  };

  // Change token
  const handleChangeToken = () => {
    setEditingToken(true);
    setTokenInput("");
    const reset: AgentMetadata = {
      ...metadata,
      telegramBotToken: undefined,
      telegramPairingCode: undefined,
      telegramStatus: "not_configured",
    };
    onMetadataChange(reset);
  };

  if (status === "complete" && !editingToken) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="font-medium">{tg.complete}</span>
        </div>
        <button
          type="button"
          onClick={handleChangeToken}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {tg.changeToken}
        </button>
      </div>
    );
  }

  if (status === "registering") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{tg.registering}</span>
      </div>
    );
  }

  if ((status === "registered" || (status === "complete" && editingToken)) && !editingToken) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
        {/* Step 2 checkmark */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3" />
          </span>
          {tg.step2Title}
        </div>
        <p className="text-xs text-muted-foreground">{tg.step2Hint}</p>

        {/* Obfuscated token row */}
        {metadata.telegramBotToken && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            <span className="flex-1 truncate">{obfuscate(metadata.telegramBotToken)}</span>
            <button
              type="button"
              onClick={handleChangeToken}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={tg.changeToken}
            >
              <Edit2 className="size-3" />
            </button>
          </div>
        )}

        {/* Pairing code */}
        <div className="flex gap-2">
          <Input
            id={`tg-pairing-${agentId}`}
            value={pairingInput}
            onChange={(e) => setPairingInput(e.target.value)}
            placeholder={tg.pairingCodePlaceholder}
            className="flex-1 font-mono tracking-widest"
            maxLength={20}
          />
          <Button
            id={`tg-pairing-save-${agentId}`}
            size="sm"
            disabled={!pairingInput.trim()}
            onClick={handlePairingSubmit}
          >
            {tg.pairingCodeSave}
          </Button>
        </div>
      </div>
    );
  }

  // status === "not_configured" (or editing token)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-xs font-bold text-muted-foreground">
          1
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{tg.step1Title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tg.step1Hint}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          id={`tg-token-${agentId}`}
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder={tg.botTokenPlaceholder}
          className="flex-1 font-mono text-sm"
          type="password"
        />
        <Button
          id={`tg-token-save-${agentId}`}
          size="sm"
          disabled={!tokenInput.trim()}
          onClick={handleTokenSubmit}
        >
          {tg.botTokenSave}
        </Button>
      </div>
    </div>
  );
}

// ── Sub-component: AgentCard ───────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent;
  onUpdate: (updated: Agent) => void;
  token: string | null;
  t: ReturnType<typeof useTranslation>["t"];
}

function AgentCard({ agent, onUpdate, token, t }: AgentCardProps) {
  const ta = t.agents;
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(agent.name);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const metadata = agent.metadata ?? {};
  const icon = agent.icon ?? "🤖";
  const color = metadata.avatarColor ?? AVATAR_COLORS[0];
  const health = computeHealth(agent);

  const authHeaders = token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };

  const patchAgent = useCallback(
    async (patch: Partial<Agent>) => {
      try {
        const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
          method: "PUT",
          headers: authHeaders as HeadersInit,
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Failed to save");
        const data = await res.json();
        onUpdate(data.data);
      } catch {
        toast.error("Failed to save changes.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agent.id, token]
  );

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSavingName(true);
    await patchAgent({ name: nameInput.trim() });
    setEditingName(false);
    setIsSavingName(false);
  };

  const handleIconChange = async (newIcon: string) => {
    const updated = { ...agent, icon: newIcon };
    onUpdate(updated);
    await patchAgent({ icon: newIcon });
  };

  const handleColorChange = async (newColor: string) => {
    const newMeta = { ...metadata, avatarColor: newColor };
    const updated = { ...agent, metadata: newMeta };
    onUpdate(updated);
    await patchAgent({ metadata: newMeta });
  };

  const handleMetadataChange = (newMeta: AgentMetadata) => {
    onUpdate({ ...agent, metadata: newMeta });
  };

  const handleSaveMetadata = async (newMeta: AgentMetadata) => {
    await patchAgent({ metadata: newMeta });
  };

  const roleLabel =
    ta.roleLabels[agent.type as keyof typeof ta.roleLabels] ?? agent.type;

  const healthLabel =
    health === "online"
      ? ta.healthOnline
      : health === "warning"
      ? ta.healthWarning
      : ta.healthOffline;

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card shadow-sm transition-all duration-200",
        health === "online" && "border-border",
        health === "warning" && "border-amber-400/40",
        health === "offline" && "border-red-400/40"
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <button
            id={`agent-avatar-btn-${agent.id}`}
            type="button"
            onClick={() => setAvatarOpen((v) => !v)}
            title={ta.changeAvatar}
            style={{ background: color }}
            className="flex size-14 items-center justify-center rounded-2xl text-2xl shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            {icon}
          </button>
          {avatarOpen && (
            <AvatarPicker
              icon={icon}
              color={color}
              onIconChange={handleIconChange}
              onColorChange={handleColorChange}
              onClose={() => setAvatarOpen(false)}
            />
          )}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                id={`agent-name-input-${agent.id}`}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameInput(agent.name);
                    setEditingName(false);
                  }
                }}
                className="h-8 text-base font-semibold"
                autoFocus
              />
              <button
                id={`agent-name-save-${agent.id}`}
                type="button"
                disabled={isSavingName}
                onClick={handleSaveName}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSavingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(agent.name);
                  setEditingName(false);
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">
                {agent.name}
              </h2>
              <button
                id={`agent-name-edit-${agent.id}`}
                type="button"
                onClick={() => {
                  setNameInput(agent.name);
                  setEditingName(true);
                }}
                className="opacity-0 group-hover:opacity-100 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground"
                title={ta.editName}
              >
                <Edit2 className="size-3" />
              </button>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {roleLabel}
            </span>
            <HealthDot status={health} label={healthLabel} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {(health === "online" || health === "warning") && (
            <Button
              id={`agent-send-msg-${agent.id}`}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <MessageCircle className="size-3.5" />
              {ta.sendMessage}
            </Button>
          )}
          <button
            id={`agent-telegram-toggle-${agent.id}`}
            type="button"
            onClick={() => setTelegramOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              metadata.telegramStatus === "complete"
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              telegramOpen && "bg-muted"
            )}
          >
            <Send className="size-3.5" />
            Telegram
            {metadata.telegramStatus === "complete" && (
              <CheckCircle2 className="size-3 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Telegram panel */}
      {telegramOpen && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <TelegramSetup
            agentId={agent.id}
            metadata={metadata}
            onMetadataChange={handleMetadataChange}
            onSave={handleSaveMetadata}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { t } = useTranslation();
  const { token, teamId } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ta = t.agents;

  useEffect(() => {
    const load = async () => {
      if (!teamId) {
        setIsLoading(false);
        return;
      }
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAgents(data.data ?? []);
        }
      } catch {
        toast.error("Failed to load agents.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = (updated: Agent) => {
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // ── Team health ─────────────────────────────────────────────────────────────
  const healths = agents.map(computeHealth);
  const teamStatus: HealthStatus = healths.some((h) => h === "offline")
    ? "offline"
    : healths.some((h) => h === "warning")
    ? "warning"
    : "online";

  const teamStatusLabel =
    teamStatus === "online"
      ? ta.teamReady
      : teamStatus === "warning"
      ? ta.teamWarning
      : ta.teamCritical;

  const teamStatusHint =
    teamStatus === "online"
      ? ta.teamReadyHint
      : teamStatus === "warning"
      ? ta.teamWarningHint
      : ta.teamCriticalHint;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading your agents…</p>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (agents.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Bot className="size-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">No agents yet</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the team setup to configure your agent squad.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/setup">Go to Team Setup</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {ta.title}
          </h1>
          <p className="mt-1.5 text-muted-foreground">{ta.subtitle}</p>
        </div>

        {/* Team health badge */}
        <div
          className={cn(
            "shrink-0 rounded-2xl border px-4 py-2.5 text-right",
            teamStatus === "online" &&
              "border-emerald-500/30 bg-emerald-500/5",
            teamStatus === "warning" &&
              "border-amber-400/30 bg-amber-400/5",
            teamStatus === "offline" && "border-red-400/30 bg-red-400/5"
          )}
        >
          <div className="flex items-center gap-2">
            <HealthDot status={teamStatus} label={teamStatusLabel} />
          </div>
          <p
            className={cn(
              "mt-0.5 text-xs",
              teamStatus === "online" && "text-emerald-600/70 dark:text-emerald-400/70",
              teamStatus === "warning" && "text-amber-600/70 dark:text-amber-400/70",
              teamStatus === "offline" && "text-red-600/70 dark:text-red-400/70"
            )}
          >
            {teamStatusHint}
          </p>
        </div>
      </div>

      {/* ── Agent list ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onUpdate={handleUpdate}
            token={token}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
