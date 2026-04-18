"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, Save } from "lucide-react";
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgentGeneralPage() {
  const { token }  = useAuth();
  const params     = useParams();
  const agentId    = String(params.id);

  const [agent, setAgent]       = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

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

  if (isLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!agent) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Bot className="size-10 text-muted-foreground" />
      <p className="font-semibold">Agent not found</p>
    </div>
  );

  const backHref = `/agents/${agentId}`;

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
        <p className="mt-1 text-sm text-muted-foreground">Update this agent&apos;s name, avatar, and visual identity.</p>
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

        {/* Name */}
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

        {/* Save */}
        <Button id="general-save-btn" onClick={save} disabled={isSaving || !name.trim()} className="w-full font-semibold">
          {isSaving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : <><Save className="size-4 mr-2" />Save Changes</>}
        </Button>
      </div>
    </div>
  );
}
