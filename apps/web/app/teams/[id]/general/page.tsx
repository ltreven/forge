"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, Check, Loader2, Save, Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType = "team_lead" | "software_engineer" | "software_architect" | "product_manager";

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: { avatarColor?: string };
}

interface Team {
  id: string; name: string; icon?: string;
  mission?: string; waysOfWorking?: string; template?: string;
}

interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_EMOJIS = [
  "🚀","⚡","🔥","🌊","🎯","💡","🧠","🦾","⚙️","🛠️",
  "🌐","📦","🔬","🎨","🏆","🌱","🦋","🔮","🦁","🐉",
  "🏛️","💻","📱","🎸","🌈","🔐","🧩","🎲","✨","🌟",
];

const AVATAR_COLORS: Record<string, string> = {
  team_lead:          "#6366f1",
  software_engineer:  "#3b82f6",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
};

// ── Emoji Picker ──────────────────────────────────────────────────────────────

function EmojiPicker({ selected, onSelect, onClose }: {
  selected: string; onSelect: (e: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Choose team emoji</p>
      <div className="grid grid-cols-10 gap-1">
        {TEAM_EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => { onSelect(e); onClose(); }}
            className={cn("flex size-7 items-center justify-center rounded-lg text-sm transition-all hover:scale-110 hover:bg-muted",
              selected === e && "ring-2 ring-primary ring-offset-1")}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PM Chat ───────────────────────────────────────────────────────────────────

function PmChat({ pm, teamId, token, userName }: {
  pm: Agent; teamId: string; token: string | null; userName: string;
}) {
  const color = pm.metadata?.avatarColor ?? AVATAR_COLORS[pm.type] ?? "#6366f1";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput(""); setSending(true);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((p) => [...p, userMsg]);

    try {
      let cid = convId;
      if (!cid) {
        const r = await fetch(`${API_BASE}/conversations`, {
          method: "POST", headers: headers(),
          body: JSON.stringify({ agentId: pm.id, counterpartType: "human", counterpartName: userName }),
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        cid = d.data.id; setConvId(cid);
      }
      await fetch(`${API_BASE}/conversations/${cid}/messages`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ role: "user", content: text }),
      });
      await new Promise((r) => setTimeout(r, 800));
      const reply: ChatMessage = {
        id: `a-${Date.now()}`, role: "assistant",
        content: `Got it! I'll help you refine the team's Ways of Working. ${text.toLowerCase().includes("ways") ? "Let me suggest some improvements based on what you've shared." : "What specific aspect would you like to work on?"}`,
      };
      setMessages((p) => [...p, reply]);
    } catch {
      toast.error("Failed to send message.");
      setMessages((p) => p.filter((m) => m.id !== userMsg.id));
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4" style={{ background: color + "08" }}>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
          style={{ background: color + "20" }}>
          {pm.icon ?? "🤖"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{pm.name}</p>
          <p className="text-xs text-muted-foreground">Ask me to refine your Ways of Working</p>
        </div>
        <span className="relative flex size-2 shrink-0 rounded-full bg-amber-400">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
        </span>
      </div>

      {/* Messages */}
      <div className="flex h-48 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl text-xl opacity-40"
              style={{ background: color + "18" }}>{pm.icon ?? "🤖"}</div>
            <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">
              Hi! I&apos;m {pm.name}, your team&apos;s coordinator.<br />
              Ask me to help define or refine the team&apos;s <strong>Ways of Working</strong>.
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={cn("flex items-end gap-2", m.role === "user" && "flex-row-reverse")}>
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs"
                  style={m.role === "user" ? { background: "#6366f1", color: "#fff" } : { background: color + "22" }}>
                  {m.role === "user" ? userName.charAt(0).toUpperCase() : (pm.icon ?? "🤖")}
                </div>
                <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-end gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs" style={{ background: color + "22" }}>
                  {pm.icon ?? "🤖"}
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <Input id="pm-chat-input" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${pm.name}…`} className="h-9 flex-1 rounded-xl text-sm" disabled={sending} />
          <Button id="pm-chat-send" type="submit" size="icon" disabled={!input.trim() || sending}
            className="size-9 shrink-0 rounded-xl">
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamGeneralPage() {
  const { token, isLoading: authLoading, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Form state
  const [teamName, setTeamName] = useState("");
  const [teamIcon, setTeamIcon] = useState("🚀");
  const [mission, setMission] = useState("");
  const [waysOfWorking, setWaysOfWorking] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

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
    ]).then(async ([teamRes, agentsRes]) => {
      if (!teamRes.ok) { toast.error("Team not found."); router.replace("/teams"); return; }
      const td = (await teamRes.json()).data as Team;
      setTeam(td);
      setTeamName(td.name ?? "");
      setTeamIcon(td.icon ?? "🚀");
      setMission(td.mission ?? "");
      setWaysOfWorking(td.waysOfWorking ?? "");
      if (agentsRes.ok) {
        const ad = await agentsRes.json();
        setAgents(ad.data ?? []);
      }
    }).catch(() => toast.error("Failed to load team."))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const save = async () => {
    if (!teamName.trim()) { toast.error("Team name is required."); return; }
    setIsSaving(true);
    try {
      const r = await fetch(`${API_BASE}/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: teamName.trim(), icon: teamIcon, mission: mission.trim(), waysOfWorking: waysOfWorking.trim() }),
      });
      if (!r.ok) throw new Error();
      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally { setIsSaving(false); }
  };

  // Find Team Lead to run the Ways of Working chat
  const pm = agents.find((a) => a.type === "team_lead") ?? agents[0] ?? null;

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link href={`/teams/${teamId}`} id="back-to-team"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to {team.name}
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">General Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your team&apos;s identity and norms.</p>
      </div>

      <div className="flex flex-col gap-6">

        {/* ── Identity Card ── */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Identity</h2>

          <div className="flex flex-col gap-4">
            {/* Emoji + Name row */}
            <div className="flex items-start gap-3">
              {/* Emoji picker */}
              <div className="relative shrink-0">
                <button id="team-emoji-btn" type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-muted/30 text-3xl transition-all hover:border-primary/50 hover:bg-muted/60 hover:scale-105 active:scale-95">
                  {teamIcon}
                </button>
                {emojiOpen && (
                  <EmojiPicker selected={teamIcon} onSelect={setTeamIcon} onClose={() => setEmojiOpen(false)} />
                )}
              </div>

              {/* Team name */}
              <div className="flex-1 flex flex-col gap-1.5">
                <label htmlFor="general-team-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Team Name
                </label>
                <Input id="general-team-name" value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Engineering, Research…" className="h-[52px] text-base font-medium" />
              </div>
            </div>

            {/* Mission */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="general-mission" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mission <span className="ml-1 font-normal normal-case text-muted-foreground/60">(optional)</span>
              </label>
              <Input id="general-mission" value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="What does this team exist to accomplish?" className="h-9" />
            </div>

            {/* Ways of Working */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="general-wow" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ways of Working <span className="ml-1 font-normal normal-case text-muted-foreground/60">(optional)</span>
              </label>
              <textarea id="general-wow" value={waysOfWorking}
                onChange={(e) => setWaysOfWorking(e.target.value)}
                placeholder="Describe team norms, processes, rituals, and expectations…"
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Ask your team&apos;s Team Lead or PM below — they know your team best.
              </p>
            </div>
          </div>

          {/* Save */}
          <Button id="general-save" size="sm" disabled={isSaving || !teamName.trim()}
            onClick={save} className="mt-5 w-full gap-2 font-semibold">
            {isSaving
              ? <><Loader2 className="size-3.5 animate-spin" /> Saving…</>
              : <><Save className="size-3.5" /> Save Changes</>}
          </Button>
        </section>

        {/* ── PM Chat ── */}
        {pm ? (
          <section id="general-pm-chat">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Ask your PM
              </h2>
            </div>
            <PmChat pm={pm} teamId={teamId} token={token} userName={user?.name ?? "You"} />
          </section>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-6">
            <Bot className="size-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No agents on this team yet. Add a Team Lead to get help with your Ways of Working.</p>
          </div>
        )}

        {/* Danger zone — placeholder, no destructive actions for now */}
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
          <h2 className="mb-1 text-sm font-semibold text-destructive">Danger Zone</h2>
          <p className="text-xs text-muted-foreground">Deleting a team is permanent and cannot be undone.</p>
          <Button id="general-delete-team" variant="outline" size="sm"
            className="mt-4 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => toast.error("Team deletion coming soon.")}>
            Delete Team
          </Button>
        </section>

      </div>
    </div>
  );
}
