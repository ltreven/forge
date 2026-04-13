"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  Circle,
  Edit2,
  Gauge,
  History,
  Loader2,
  Send,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BrainModal } from "@/components/agent/brain-modal";
import { ModelSelector, AVAILABLE_MODELS } from "@/components/agent/model-selector";
import { ConversationHistory } from "@/components/agent/conversation-history";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentType =
  | "software_engineer" | "software_architect"
  | "product_manager"   | "project_manager";

type TelegramStatus = "not_configured" | "registering" | "registered" | "complete";
type HealthStatus   = "online" | "warning" | "offline";

interface AgentMetadata {
  avatarColor?: string;
  telegramBotToken?: string;
  telegramPairingCode?: string;
  telegramStatus?: TelegramStatus;
  personality?: string;
  identity?: string;
  longTermMemory?: string;
  model?: string;
}

interface Agent {
  id: string; name: string; type: AgentType;
  icon?: string; metadata?: AgentMetadata;
}

interface ChatMessage {
  id: string; role: "user" | "assistant";
  content: string; createdAt: string;
}

interface Conversation {
  id: string; agentId: string;
  counterpartType: "human" | "agent" | "external";
  counterpartId?: string; counterpartName: string;
  createdAt: string; updatedAt: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function generateDailyData() {
  return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(
    (day) => ({ day, tasks: Math.floor(Math.random() * 8) })
  );
}

function generateTokenData() {
  let base = 20000;
  return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => {
    base += Math.floor((Math.random() - 0.3) * 5000);
    return { day, tokens: Math.max(0, base) };
  });
}

const MOCK_CURRENT_TASK = "Implement authentication middleware for the REST API";
const MOCK_RECENT = [
  { title: "Write unit tests for UserService",       date: "Apr 12" },
  { title: "Fix CORS configuration in Express",      date: "Apr 11" },
  { title: "Set up Drizzle schema for Teams",        date: "Apr 10" },
  { title: "Configure CI with GitHub Actions",       date: "Apr  9" },
  { title: "Add Zod validation to agent routes",     date: "Apr  8" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  "🤖","🦾","⚙️","🧠","🔬","🛠️","🚀","⚡","🔮","🎯",
  "🌐","💡","🦊","🐉","🦅","🦁","🐺","🦋","🌊","🔥",
];
const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#ef4444","#3b82f6","#84cc16","#f97316",
];

// ── Health ────────────────────────────────────────────────────────────────────

function computeHealth(a: Agent): HealthStatus {
  const s = a.metadata?.telegramStatus;
  if (!s || s === "not_configured" || s === "registering") return "warning";
  return s === "complete" ? "online" : "warning";
}

function HealthDot({ status }: { status: HealthStatus }) {
  return (
    <span className={cn(
      "relative flex size-2 shrink-0 rounded-full",
      status === "online"  && "bg-emerald-500",
      status === "warning" && "bg-amber-400",
      status === "offline" && "bg-red-500",
    )}>
      {status === "online" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
    </span>
  );
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
    <div ref={ref} className="absolute left-0 top-full z-30 mt-2 w-60 rounded-2xl border border-border bg-card p-3 shadow-xl">
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

// ── Side panel container ──────────────────────────────────────────────────────

function SidePanel({ title, subtitle, icon, accentClass, onClose, children }: {
  title: string; subtitle?: string;
  icon: React.ReactNode; accentClass: string;
  onClose: () => void; children?: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-xl", accentClass)}>{icon}</div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Panel ───────────────────────────────────────────────────────────

function DashboardPanel({ agentColor, onClose, t }: {
  agentColor: string; onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const td = t.agentDashboard;
  const [dailyData] = useState(generateDailyData);
  const [tokenData] = useState(generateTokenData);

  return (
    <SidePanel
      title={td.backToAgent.replace("Back to", "").trim() || "Dashboard"}
      subtitle="Activity summary and performance metrics"
      icon={<Gauge className="size-4 text-cyan-600 dark:text-cyan-400" />}
      accentClass="bg-cyan-400/10"
      onClose={onClose}
    >
      <div className="flex flex-col gap-6 px-6 py-5">
        {/* Current task */}
        <section>
          <PanelLabel icon={<Zap className="size-3.5" />} label={td.currentTask} color={agentColor} />
          <div className="mt-2 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">{MOCK_CURRENT_TASK}</p>
            </div>
          </div>
        </section>

        {/* Recent tasks */}
        <section>
          <PanelLabel icon={<CheckCircle2 className="size-3.5" />} label={td.recentTasks} color={agentColor} />
          <div className="mt-2 flex flex-col gap-1">
            {MOCK_RECENT.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <p className="flex-1 text-xs text-foreground leading-snug">{t.title}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{t.date}</span>
              </div>
            ))}
            <button id="see-more-tasks" className="mt-1 text-center text-xs font-medium text-primary hover:underline underline-offset-4">
              {td.seeMore}
            </button>
          </div>
        </section>

        {/* Daily contributions */}
        <section>
          <PanelLabel icon={<Circle className="size-3.5" />} label={td.dailyContributions} color={agentColor} />
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={dailyData} barSize={16} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={22} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: "11px" }}
                  formatter={(v) => [`${v} ${td.tasks}`, ""]}
                />
                <Bar dataKey="tasks" fill={agentColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Token timeline */}
        <section>
          <PanelLabel icon={<Zap className="size-3.5" />} label={td.tokenTimeline} color={agentColor} />
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={tokenData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: "11px" }}
                  formatter={(v) => [`${Number(v).toLocaleString()} ${td.tokens}`, ""]}
                />
                <Line type="monotone" dataKey="tokens" stroke={agentColor} strokeWidth={2.5}
                  dot={{ r: 3, fill: agentColor, strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </SidePanel>
  );
}

function PanelLabel({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex size-5 items-center justify-center rounded-md" style={{ color, background: color + "18" }}>{icon}</span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  );
}

// ── Placeholder panel ─────────────────────────────────────────────────────────

function PlaceholderPanel({ title, subtitle, icon, accentClass, onClose }: {
  title: string; subtitle: string;
  icon: React.ReactNode; accentClass: string; onClose: () => void;
}) {
  return (
    <SidePanel title={title} subtitle={subtitle} icon={icon} accentClass={accentClass} onClose={onClose}>
      <div className="flex flex-col items-center justify-center gap-5 px-8 py-16 text-center">
        <div className={cn("flex size-16 items-center justify-center rounded-2xl text-2xl", accentClass)}>{icon}</div>
        <div>
          <p className="text-base font-semibold text-foreground">Coming soon</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <div className="w-full rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-8">
          <p className="text-xs text-muted-foreground">This section is under active development.<br />Check back in the next release.</p>
        </div>
      </div>
    </SidePanel>
  );
}

// ── Chat area ─────────────────────────────────────────────────────────────────

function ChatArea({ agentId, agentName, agentIcon, agentColor, userName, token,
  activeConversation, onConversationCreated, t }: {
  agentId: string; agentName: string; agentIcon: string; agentColor: string;
  userName: string; token: string | null;
  activeConversation: Conversation | null;
  onConversationCreated: (c: Conversation) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tc = t.agentPage.chat;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [conv, setConv]         = useState<Conversation | null>(activeConversation);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    if (!conv?.id) { setMessages([]); return; }
    fetch(`${API_BASE}/conversations/${conv.id}/messages`, { headers: headers() })
      .then((r) => r.json()).then((d) => setMessages(d.data ?? []))
      .catch(() => {/* silent */});
  }, [conv?.id, headers]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput(""); setSending(true);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);

    try {
      let cid = conv?.id;
      if (!cid) {
        const r = await fetch(`${API_BASE}/conversations`, {
          method: "POST", headers: headers(),
          body: JSON.stringify({ agentId, counterpartType: "human", counterpartName: userName }),
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        const nc: Conversation = d.data;
        setConv(nc); cid = nc.id; onConversationCreated(nc);
      }
      await fetch(`${API_BASE}/conversations/${cid}/messages`, { method: "POST", headers: headers(), body: JSON.stringify({ role: "user", content: text }) });
      await new Promise((r) => setTimeout(r, 700));
      const aMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", content: "I received your message. Agent runtime integration coming soon.", createdAt: new Date().toISOString() };
      setMessages((p) => [...p, aMsg]);
      await fetch(`${API_BASE}/conversations/${cid}/messages`, { method: "POST", headers: headers(), body: JSON.stringify({ role: "assistant", content: aMsg.content }) });
    } catch {
      toast.error("Failed to send message.");
      setMessages((p) => p.filter((m) => m.id !== userMsg.id));
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 select-none pointer-events-none">
            <div className="flex size-12 items-center justify-center rounded-2xl text-2xl opacity-40"
              style={{ background: agentColor + "18" }}>{agentIcon}</div>
            <p className="text-xs text-muted-foreground/50">{tc.emptySubtitle}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((m) => <Bubble key={m.id} msg={m} agentName={agentName} agentIcon={agentIcon} agentColor={agentColor} userName={userName} youLabel={tc.you} />)}
            {sending && <ThinkingBubble agentIcon={agentIcon} agentColor={agentColor} label={tc.thinking} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <Input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={tc.placeholder} className="h-10 flex-1 rounded-xl" disabled={sending} autoFocus />
          <Button id="chat-send-btn" type="submit" size="icon" disabled={!input.trim() || sending} className="size-10 shrink-0 rounded-xl">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ msg, agentName, agentIcon, agentColor, userName, youLabel }: {
  msg: ChatMessage; agentName: string; agentIcon: string;
  agentColor: string; userName: string; youLabel: string;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={isUser ? { background: "#6366f1", color: "#fff" } : { background: agentColor + "22" }}>
        {isUser ? userName.charAt(0).toUpperCase() : agentIcon}
      </div>
      <div className={cn("max-w-[78%] flex flex-col gap-0.5", isUser && "items-end")}>
        <span className="px-1 text-[10px] text-muted-foreground">{isUser ? youLabel : agentName}</span>
        <div className={cn("rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ agentIcon, agentColor, label }: { agentIcon: string; agentColor: string; label: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs" style={{ background: agentColor + "22" }}>{agentIcon}</div>
      <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          <span className="ml-1 text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ── ActionIcon ────────────────────────────────────────────────────────────────

function ActionIcon({ id, onClick, title, icon, accent }: {
  id?: string; onClick?: () => void; title: string;
  icon: React.ReactNode;
  accent?: "primary" | "amber" | "rose" | "cyan";
}) {
  return (
    <button id={id} type="button" onClick={onClick} title={title}
      className={cn(
        "flex size-8 items-center justify-center rounded-xl border transition-colors",
        !accent        && "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        accent === "primary" && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
        accent === "amber"   && "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400 hover:bg-amber-400/20",
        accent === "rose"    && "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-400 hover:bg-rose-400/20",
        accent === "cyan"    && "border-cyan-400/30 bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-400/20",
      )}>
      {icon}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { t }            = useTranslation();
  const { token, user }  = useAuth();
  const params           = useParams();
  const agentId          = String(params.id);
  const tp               = t.agentPage;

  const [agent, setAgent]           = useState<Agent | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]   = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Panels
  const [brainOpen,     setBrainOpen]     = useState(false);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [toolsOpen,     setToolsOpen]     = useState(false);
  const [securityOpen,  setSecurityOpen]  = useState(false);

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Load agent
  useEffect(() => {
    fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setAgent(d.data); setNameInput(d.data.name); })
      .catch(() => toast.error("Failed to load agent."))
      .finally(() => setIsLoading(false));
  }, [agentId, authHeaders]);

  const patchAgent = useCallback(async (patch: Partial<Agent>) => {
    const r = await fetch(`${API_BASE}/agents/${agentId}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(patch) });
    if (!r.ok) throw new Error();
    const d = await r.json(); setAgent(d.data); return d.data as Agent;
  }, [agentId, authHeaders]);

  const handleSaveName = async () => {
    if (!nameInput.trim() || !agent) return;
    setIsSavingName(true);
    try { await patchAgent({ name: nameInput.trim() }); setEditingName(false); }
    catch { toast.error("Failed to save name."); }
    finally { setIsSavingName(false); }
  };

  const handleIconChange  = async (i: string) => { if (!agent) return; setAgent({ ...agent, icon: i }); try { await patchAgent({ icon: i }); } catch { toast.error("Failed to save avatar."); } };
  const handleColorChange = async (c: string) => { if (!agent) return; const m = { ...(agent.metadata ?? {}), avatarColor: c }; setAgent({ ...agent, metadata: m }); try { await patchAgent({ metadata: m }); } catch { toast.error("Failed to save color."); } };
  const handleBrainSave   = async (f: { personality?: string; identity?: string; longTermMemory?: string }) => { if (!agent) return; await patchAgent({ metadata: { ...(agent.metadata ?? {}), ...f } }); };
  const handleModelSave   = async (model: string) => { if (!agent) return; await patchAgent({ metadata: { ...(agent.metadata ?? {}), model } }); };

  // Guards
  if (isLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!agent)    return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Bot className="size-10 text-muted-foreground" />
      <p className="font-semibold">{tp.notFound}</p>
      <Link href="/agents" className="text-sm text-primary hover:underline">{tp.backToSquad}</Link>
    </div>
  );

  const icon         = agent.icon ?? "🤖";
  const color        = agent.metadata?.avatarColor ?? AVATAR_COLORS[0];
  const health       = computeHealth(agent);
  const currentModel = agent.metadata?.model ?? AVAILABLE_MODELS[0].model;
  const ta           = t.agents;
  const roleLabel    = ta.roleLabels[agent.type as keyof typeof ta.roleLabels] ?? agent.type;
  const healthLabel  = health === "online" ? ta.healthOnline : health === "warning" ? ta.healthWarning : ta.healthOffline;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">

          {/* Back */}
          <Link href="/agents" id="back-to-squad" title={tp.backToSquad}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </Link>

          {/* Avatar */}
          <div className="relative shrink-0">
            <button id="agent-avatar-btn" type="button"
              onClick={() => setAvatarOpen((v) => !v)} title={ta.changeAvatar}
              style={{ background: color }}
              className="flex size-11 items-center justify-center rounded-2xl text-xl shadow-sm transition-transform hover:scale-105 active:scale-95">
              {icon}
            </button>
            {avatarOpen && <AvatarPicker icon={icon} color={color} onIconChange={handleIconChange} onColorChange={handleColorChange} onClose={() => setAvatarOpen(false)} />}
          </div>

          {/* Name & meta */}
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input id="agent-name-input" value={nameInput} autoFocus
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setNameInput(agent.name); setEditingName(false); } }}
                  className="h-7 text-sm font-semibold" />
                <button id="agent-name-save" type="button" disabled={isSavingName} onClick={handleSaveName}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSavingName ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                </button>
                <button type="button" onClick={() => { setNameInput(agent.name); setEditingName(false); }}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-1.5">
                <h1 className="truncate text-sm font-bold text-foreground">{agent.name}</h1>
                <button id="agent-name-edit" type="button"
                  onClick={() => { setNameInput(agent.name); setEditingName(true); }}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground">
                  <Edit2 className="size-2.5" />
                </button>
              </div>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{roleLabel}</span>
              <div className="flex items-center gap-1">
                <HealthDot status={health} />
                <span className={cn("text-[10px] font-medium",
                  health === "online"  && "text-emerald-600 dark:text-emerald-400",
                  health === "warning" && "text-amber-600 dark:text-amber-400",
                  health === "offline" && "text-red-600 dark:text-red-400"
                )}>{healthLabel}</span>
              </div>
            </div>
          </div>

          {/* Model selector */}
          <div className="relative hidden sm:block">
            <ModelSelector currentModel={currentModel} onSave={handleModelSave} t={tp.model} />
          </div>

          {/* Action icons */}
          <div className="flex shrink-0 items-center gap-1">
            <ActionIcon id="open-history-btn"   onClick={() => setHistoryOpen(true)}   title={tp.openHistory}   icon={<History      className="size-3.5" />} />
            <ActionIcon id="open-brain-btn"      onClick={() => setBrainOpen(true)}     title={tp.openBrain}     icon={<Brain        className="size-3.5" />} accent="primary" />
            <ActionIcon id="open-dashboard-btn"  onClick={() => setDashboardOpen(true)} title={tp.openDashboard} icon={<Gauge        className="size-3.5" />} accent="cyan" />
            <ActionIcon id="open-tools-btn"      onClick={() => setToolsOpen(true)}     title={tp.openTools}     icon={<Wrench       className="size-3.5" />} accent="amber" />
            <ActionIcon id="open-security-btn"   onClick={() => setSecurityOpen(true)}  title={tp.openSecurity}  icon={<ShieldCheck  className="size-3.5" />} accent="rose" />
          </div>
        </div>
      </header>

      {/* ── Chat (max-width constrained) ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden">
          <ChatArea
            agentId={agentId} agentName={agent.name} agentIcon={icon}
            agentColor={color} userName={user?.name ?? "You"} token={token}
            activeConversation={activeConv}
            onConversationCreated={(c) => setActiveConv(c)}
            t={t}
          />
        </div>
      </div>

      {/* ── Overlays ────────────────────────────────────────────────── */}
      {historyOpen && (
        <ConversationHistory agentId={agentId}
          onSelectConversation={(c) => setActiveConv(c)}
          onClose={() => setHistoryOpen(false)} t={tp.history} />
      )}
      {brainOpen && (
        <BrainModal agentName={agent.name}
          fields={{ personality: agent.metadata?.personality, identity: agent.metadata?.identity, longTermMemory: agent.metadata?.longTermMemory }}
          onSave={handleBrainSave} onClose={() => setBrainOpen(false)} t={tp.brain} />
      )}
      {dashboardOpen && (
        <DashboardPanel agentColor={color} onClose={() => setDashboardOpen(false)} t={t} />
      )}
      {toolsOpen && (
        <PlaceholderPanel
          title={tp.openTools}
          subtitle="Connect MCP tools, APIs, and code execution capabilities to this agent."
          icon={<Wrench className="size-4 text-amber-600 dark:text-amber-400" />}
          accentClass="bg-amber-400/10"
          onClose={() => setToolsOpen(false)} />
      )}
      {securityOpen && (
        <PlaceholderPanel
          title={tp.openSecurity}
          subtitle="Configure approval policies, guardrails, and access boundaries for this agent."
          icon={<ShieldCheck className="size-4 text-rose-600 dark:text-rose-400" />}
          accentClass="bg-rose-400/10"
          onClose={() => setSecurityOpen(false)} />
      )}
    </div>
  );
}
