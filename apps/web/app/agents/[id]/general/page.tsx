"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, Check, ChevronDown, ChevronRight, ExternalLink,
  Loader2, Save, Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  "🤖","🦾","⚙️","🧠","🔬","🛠️","🚀","⚡","🔮","🎯",
  "🌐","💡","🦊","🐉","🦅","🦁","🐺","🦋","🌊","🔥",
  "👑","🎭","🎪","🏆","💎","🌟","🎸","🎯","🧬","🔭",
];

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#ef4444","#3b82f6","#84cc16","#f97316",
];

const ROLE_LABELS: Record<string, string> = {
  team_lead:          "Team Lead",
  software_engineer:  "Software Engineer",
  software_architect: "Software Architect",
  product_manager:    "Product Manager",
};

interface AgentMetadata {
  avatarColor?: string;
  telegramStatus?: string;
  telegramBotToken?: string;
  personality?: string; identity?: string; longTermMemory?: string; model?: string;
}

interface Agent {
  id: string; name: string; type: string;
  icon?: string; metadata?: AgentMetadata;
  teamId?: string;
}

// ── AvatarPicker ──────────────────────────────────────────────────────────────

function AvatarPicker({ icon, color, onIconChange, onColorChange, onClose }: {
  icon: string; color: string;
  onIconChange: (i: string) => void; onColorChange: (c: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Emoji</p>
      <div className="mb-3 grid grid-cols-10 gap-1">
        {AVATAR_EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => onIconChange(e)}
            className={cn("flex size-7 items-center justify-center rounded-lg text-sm transition-all hover:scale-110", icon === e && "ring-2 ring-primary ring-offset-1")}>
            {e}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Color</p>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onColorChange(c)} style={{ background: c }}
            className={cn("size-5 rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-offset-2 ring-foreground scale-110")} />
        ))}
      </div>
    </div>
  );
}

// ── TelegramSetup ─────────────────────────────────────────────────────────────

const BOTFATHER_STEPS = [
  {
    num: 1,
    title: "Open BotFather on Telegram",
    description: "Search for @BotFather in Telegram and start a chat.",
    action: { label: "Open @BotFather", href: "https://t.me/BotFather" },
  },
  {
    num: 2,
    title: "Create a new bot",
    description: 'Send the command /newbot, then choose a name and username for your bot (must end in "bot").',
    action: null,
  },
  {
    num: 3,
    title: "Copy the HTTP API token",
    description: "BotFather will reply with a token like 7123456789:AAF... — copy it.",
    action: null,
  },
  {
    num: 4,
    title: "Paste the token below",
    description: "Paste the token and click Save & Connect. We'll configure your agent automatically.",
    action: null,
  },
];

function TelegramSetup({
  initialToken,
  onSave,
  isSaving,
}: {
  initialToken: string;
  onSave: (token: string) => void;
  isSaving: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const isConnected = Boolean(initialToken);

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
      {/* Step-by-step guide */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Setup Guide</p>
      <ol className="mb-5 flex flex-col gap-3">
        {BOTFATHER_STEPS.map((step) => (
          <li key={step.num} className="flex gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {step.num}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              {step.action && (
                <a
                  href={step.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {step.action.label}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* Token input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="telegram-bot-token" className="text-sm font-medium text-foreground">
          Bot Token
        </label>
        <div className="flex gap-2">
          <Input
            id="telegram-bot-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="7123456789:AAF_your_telegram_bot_token_here"
            className="flex-1 font-mono text-xs"
            type="password"
            autoComplete="off"
          />
          <Button
            id="telegram-save-btn"
            onClick={() => onSave(token.trim())}
            disabled={isSaving || !token.trim() || token.trim() === initialToken}
            size="sm"
            className="shrink-0 gap-1.5"
          >
            {isSaving ? (
              <><Loader2 className="size-3.5 animate-spin" />Connecting…</>
            ) : isConnected && token.trim() === initialToken ? (
              <><Check className="size-3.5" />Connected</>
            ) : (
              <><Send className="size-3.5" />Save & Connect</>
            )}
          </Button>
        </div>
        {isConnected && token.trim() === initialToken && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="size-3" />
            Telegram bot is configured. Paste a new token to update.
          </p>
        )}
      </div>
    </div>
  );
}

// ── ChannelRow ────────────────────────────────────────────────────────────────

function ChannelRow({
  icon,
  name,
  enabled,
  comingSoon,
  active,
  onToggle,
}: {
  icon: string;
  name: string;
  enabled: boolean;
  comingSoon?: boolean;
  active?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          {comingSoon && (
            <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">Coming Soon</p>
          )}
        </div>
      </div>

      {comingSoon ? (
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
          Soon
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          id={`channel-toggle-${name.toLowerCase()}`}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            enabled ? "bg-primary" : "bg-muted-foreground/30"
          )}
          role="switch"
          aria-checked={enabled}
        >
          <span className={cn(
            "pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-4" : "translate-x-0"
          )} />
        </button>
      )}

      {!comingSoon && (
        <ChevronDown className={cn(
          "ml-2 size-3.5 text-muted-foreground/50 transition-transform",
          active && "rotate-180"
        )} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentGeneralPage() {
  const { token }  = useAuth();
  const params     = useParams();
  const agentId    = String(params.id);

  const [agent, setAgent]         = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);

  // local editable state
  const [name, setName]   = useState("");
  const [icon, setIcon]   = useState("🤖");
  const [color, setColor] = useState("#6366f1");

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const a: Agent = d.data;
        setAgent(a);
        setName(a.name);
        setIcon(a.icon ?? "🤖");
        setColor(a.metadata?.avatarColor ?? "#6366f1");
        // Auto-expand Telegram if already configured
        if (a.metadata?.telegramBotToken) setTelegramOpen(true);
      })
      .catch(() => toast.error("Failed to load agent."))
      .finally(() => setIsLoading(false));
  }, [agentId, authHeaders]);

  const save = async () => {
    if (!name.trim() || !agent) return;
    setIsSaving(true);
    try {
      const r = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          icon,
          metadata: { ...(agent.metadata ?? {}), avatarColor: color },
        }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setAgent(d.data);
      toast.success("Agent settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally { setIsSaving(false); }
  };

  const saveTelegramToken = async (newToken: string) => {
    if (!agent) return;
    setIsSavingTelegram(true);
    try {
      const r = await fetch(`${API_BASE}/agents/${agentId}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          metadata: {
            ...(agent.metadata ?? {}),
            telegramBotToken: newToken,
          },
        }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setAgent(d.data);
      toast.success("Telegram bot connected! Agent is restarting to apply the new token…", { duration: 5000 });
    } catch {
      toast.error("Failed to save Telegram token.");
    } finally { setIsSavingTelegram(false); }
  };

  if (isLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!agent) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Bot className="size-10 text-muted-foreground" />
      <p className="font-semibold">Agent not found</p>
    </div>
  );

  const backHref = `/agents/${agentId}`;
  const hasTelegramToken = Boolean(agent.metadata?.telegramBotToken);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Back */}
      <Link href={backHref} id="general-back"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to {agent.name}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">General Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update this agent&apos;s name, avatar, and communication channels.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Avatar section */}
        <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Avatar</p>
          <div className="flex items-center gap-5">
            <div className="relative">
              <button id="general-avatar-btn" type="button" onClick={() => setAvatarOpen((v) => !v)}
                className="flex size-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: color + "22" }}>
                {icon}
              </button>
              {avatarOpen && (
                <AvatarPicker icon={icon} color={color}
                  onIconChange={(i) => setIcon(i)}
                  onColorChange={(c) => setColor(c)}
                  onClose={() => setAvatarOpen(false)} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{agent.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[agent.type] ?? agent.type}</p>
              <p className="text-xs text-muted-foreground mt-2">Click the avatar to change emoji and color.</p>
            </div>
          </div>
        </div>

        {/* Name / Identity */}
        <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Identity</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="general-agent-name" className="text-sm font-medium text-foreground">
              Agent name
            </label>
            <Input
              id="general-agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice, Max, Forge Lead…"
            />
            <p className="text-xs text-muted-foreground">The name this agent will use when communicating.</p>
          </div>
        </div>

        {/* ── Communication Channels ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
          <div className="mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Communication Channels</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect your agent to messaging platforms so users can interact with it directly.
            </p>
          </div>

          <div className="mt-4 divide-y divide-border/60">
            {/* Telegram — enabled */}
            <div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">✈️</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Telegram</p>
                    {hasTelegramToken ? (
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-0.5">
                        <Check className="size-2.5" /> Connected
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Not configured</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTelegramOpen((v) => !v)}
                    id="channel-toggle-telegram"
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      (telegramOpen || hasTelegramToken) ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    role="switch"
                    aria-checked={telegramOpen || hasTelegramToken}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform",
                      (telegramOpen || hasTelegramToken) ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-muted-foreground/50 transition-transform duration-200",
                      telegramOpen && "rotate-90"
                    )}
                  />
                </div>
              </div>
              {telegramOpen && (
                <div className="pb-3">
                  <TelegramSetup
                    initialToken={agent.metadata?.telegramBotToken ?? ""}
                    onSave={saveTelegramToken}
                    isSaving={isSavingTelegram}
                  />
                </div>
              )}
            </div>

            {/* Coming soon channels */}
            {[
              { icon: "💬", name: "WhatsApp" },
              { icon: "🟢", name: "WeChat" },
              { icon: "🔷", name: "Slack" },
              { icon: "🎮", name: "Discord" },
            ].map((ch) => (
              <div key={ch.name} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ch.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground/60">{ch.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide">Coming Soon</p>
                  </div>
                </div>
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <Button id="general-save-btn" onClick={save} disabled={isSaving || !name.trim()} className="w-full font-semibold">
          {isSaving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : <><Save className="size-4 mr-2" />Save Changes</>}
        </Button>
      </div>
    </div>
  );
}
