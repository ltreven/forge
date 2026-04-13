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
  ChevronDown,
  Circle,
  Edit2,
  History,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

// ── Types ──────────────────────────────────────────────────────────────────────

type AgentType =
  | "software_engineer"
  | "software_architect"
  | "product_manager"
  | "project_manager";

type TelegramStatus = "not_configured" | "registering" | "registered" | "complete";
type HealthStatus = "online" | "warning" | "offline";

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
  id: string;
  name: string;
  type: AgentType;
  icon?: string;
  metadata?: AgentMetadata;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  agentId: string;
  counterpartType: "human" | "agent" | "external";
  counterpartId?: string;
  counterpartName: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mock stats data (placeholder until task tracking is wired) ────────────────

function generateDailyData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, tasks: Math.floor(Math.random() * 8) }));
}

function generateTokenData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let base = 20000;
  return days.map((day) => {
    base += Math.floor((Math.random() - 0.3) * 5000);
    return { day, tokens: Math.max(0, base) };
  });
}

const MOCK_CURRENT_TASK =
  "Implement authentication middleware for the REST API";

const MOCK_RECENT: { title: string; date: string }[] = [
  { title: "Write unit tests for UserService", date: "Apr 12" },
  { title: "Fix CORS configuration in Express", date: "Apr 11" },
  { title: "Set up Drizzle schema for Teams", date: "Apr 10" },
  { title: "Configure CI with GitHub Actions", date: "Apr 9" },
  { title: "Add Zod validation to agent routes", date: "Apr 8" },
];

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  "🤖", "🦾", "⚙️", "🧠", "🔬", "🛠️", "🚀", "⚡", "🔮", "🎯",
  "🌐", "💡", "🦊", "🐉", "🦅", "🦁", "🐺", "🦋", "🌊", "🔥",
];

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#ef4444", "#3b82f6", "#84cc16", "#f97316",
];

// ── Health helpers ─────────────────────────────────────────────────────────────

function computeHealth(agent: Agent): HealthStatus {
  const s = agent.metadata?.telegramStatus;
  if (!s || s === "not_configured" || s === "registering") return "warning";
  if (s === "complete") return "online";
  return "warning";
}

function HealthDot({ status }: { status: HealthStatus }) {
  return (
    <span className={cn(
      "relative flex size-2.5 shrink-0 rounded-full",
      status === "online" && "bg-emerald-500",
      status === "warning" && "bg-amber-400",
      status === "offline" && "bg-red-500"
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
  onIconChange: (i: string) => void;
  onColorChange: (c: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emoji</p>
      <div className="mb-3 grid grid-cols-10 gap-1">
        {AVATAR_EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => onIconChange(e)}
            className={cn("flex size-7 items-center justify-center rounded-lg text-base transition-all hover:scale-110", icon === e && "ring-2 ring-primary ring-offset-1")}>
            {e}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</p>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onColorChange(c)}
            style={{ background: c }}
            className={cn("size-6 rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-offset-2 ring-foreground scale-110")} />
        ))}
      </div>
    </div>
  );
}

// ── Placeholder panel (Tools / Security) ─────────────────────────────────────

function PlaceholderPanel({ title, subtitle, icon, onClose, accentClass }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClose: () => void;
  accentClass: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={cn("flex size-9 items-center justify-center rounded-xl", accentClass)}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Coming soon body */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div className={cn("flex size-16 items-center justify-center rounded-2xl text-2xl", accentClass)}>
            {icon}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Coming soon</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          <div className="w-full rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-8">
            <p className="text-xs text-muted-foreground">This section is under active development.<br />Check back in the next release.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat area ─────────────────────────────────────────────────────────────────

function ChatArea({
  agentId, agentName, agentIcon, agentColor, userName, token,
  activeConversation, onConversationCreated, t,
}: {
  agentId: string; agentName: string; agentIcon: string; agentColor: string;
  userName: string; token: string | null;
  activeConversation: Conversation | null;
  onConversationCreated: (conv: Conversation) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tc = t.agentPage.chat;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(activeConversation);
  const bottomRef = useRef<HTMLDivElement>(null);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    if (!conversation?.id) { setChatMessages([]); return; }
    fetch(`${API_BASE}/conversations/${conversation.id}/messages`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setChatMessages(d.data ?? []))
      .catch(() => {/* silent */});
  }, [conversation?.id, authHeaders]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    setIsSending(true);

    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    setChatMessages((p) => [...p, userMsg]);

    try {
      let convId = conversation?.id;
      if (!convId) {
        const r = await fetch(`${API_BASE}/conversations`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ agentId, counterpartType: "human", counterpartName: userName }),
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        const newConv: Conversation = d.data;
        setConversation(newConv);
        convId = newConv.id;
        onConversationCreated(newConv);
      }

      await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ role: "user", content: text }),
      });

      await new Promise((r) => setTimeout(r, 700));
      const assistantMsg: ChatMessage = {
        id: `tmp-a-${Date.now()}`, role: "assistant",
        content: "I received your message. Agent runtime integration coming soon.",
        createdAt: new Date().toISOString(),
      };
      setChatMessages((p) => [...p, assistantMsg]);

      if (convId) {
        await fetch(`${API_BASE}/conversations/${convId}/messages`, {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ role: "assistant", content: assistantMsg.content }),
        });
      }
    } catch {
      toast.error("Failed to send message.");
      setChatMessages((p) => p.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {chatMessages.length === 0 ? (
          // Empty state — still shows input, just softer prompt
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center select-none pointer-events-none">
            <div className="flex size-14 items-center justify-center rounded-2xl text-3xl opacity-50"
              style={{ background: agentColor + "18" }}>
              {agentIcon}
            </div>
            <p className="text-sm text-muted-foreground/60">{tc.emptySubtitle}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg}
                agentName={agentName} agentIcon={agentIcon} agentColor={agentColor}
                userName={userName} youLabel={tc.you} />
            ))}
            {isSending && <ThinkingBubble agentIcon={agentIcon} agentColor={agentColor} label={tc.thinking} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-background/80 px-5 py-4 backdrop-blur-sm">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
          <Input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={tc.placeholder}
            className="h-10 flex-1 rounded-xl"
            disabled={isSending}
            autoFocus
          />
          <Button id="chat-send-btn" type="submit" size="icon"
            disabled={!input.trim() || isSending}
            className="size-10 shrink-0 rounded-xl">
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg, agentName, agentIcon, agentColor, userName, youLabel }: {
  msg: ChatMessage; agentName: string; agentIcon: string; agentColor: string; userName: string; youLabel: string;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-end gap-2.5", isUser && "flex-row-reverse")}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm"
        style={isUser ? { background: "#6366f1", color: "#fff" } : { background: agentColor + "20" }}>
        {isUser ? userName.charAt(0).toUpperCase() : agentIcon}
      </div>
      <div className={cn("max-w-[80%] flex flex-col gap-1", isUser && "items-end")}>
        <span className="text-[10px] text-muted-foreground">{isUser ? youLabel : agentName}</span>
        <div className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
        )}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ agentIcon, agentColor, label }: { agentIcon: string; agentColor: string; label: string }) {
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: agentColor + "20" }}>{agentIcon}</div>
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

// ── Stats Sidebar ─────────────────────────────────────────────────────────────

function StatsSidebar({ agentColor, t }: {
  agentColor: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const td = t.agentDashboard;
  // Stable chart data per render (use useMemo in real scenario)
  const [dailyData] = useState(generateDailyData);
  const [tokenData] = useState(generateTokenData);

  return (
    <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-muted/10 px-4 py-5">

      {/* Current Task */}
      <section>
        <SidebarSection icon={<Zap className="size-3.5" />} label={td.currentTask} color={agentColor} />
        <div className="mt-2.5 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            </div>
            <p className="text-xs font-medium text-foreground leading-relaxed">{MOCK_CURRENT_TASK}</p>
          </div>
        </div>
      </section>

      {/* Recent Tasks */}
      <section>
        <SidebarSection icon={<CheckCircle2 className="size-3.5" />} label={td.recentTasks} color={agentColor} />
        <div className="mt-2.5 flex flex-col gap-1.5">
          {MOCK_RECENT.map((task, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              <p className="flex-1 text-xs text-foreground leading-snug">{task.title}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">{task.date}</span>
            </div>
          ))}
          <button id="see-more-tasks" className="mt-0.5 text-center text-xs font-medium text-primary hover:underline underline-offset-4">
            {td.seeMore}
          </button>
        </div>
      </section>

      {/* Daily contributions chart */}
      <section>
        <SidebarSection icon={<Circle className="size-3.5" />} label={td.dailyContributions} color={agentColor} />
        <div className="mt-2.5 rounded-xl border border-border bg-card p-3">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dailyData} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={20} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "11px" }}
                formatter={(v) => [`${v} ${td.tasks}`, ""]}
              />
              <Bar dataKey="tasks" fill={agentColor} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Token consumption chart */}
      <section>
        <SidebarSection icon={<Zap className="size-3.5" />} label={td.tokenTimeline} color={agentColor} />
        <div className="mt-2.5 rounded-xl border border-border bg-card p-3">
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={tokenData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "11px" }}
                formatter={(v) => [`${Number(v).toLocaleString()} ${td.tokens}`, ""]}
              />
              <Line type="monotone" dataKey="tokens" stroke={agentColor} strokeWidth={2}
                dot={{ r: 3, fill: agentColor, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </aside>
  );
}

function SidebarSection({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex size-5 items-center justify-center rounded-md" style={{ color, background: color + "18" }}>
        {icon}
      </span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  );
}

// ── ActionIcon helper ─────────────────────────────────────────────────────────

function ActionIcon({ id, onClick, title, icon, accent, color }: {
  id?: string; onClick?: () => void; title: string; icon: React.ReactNode;
  accent?: "primary" | "amber" | "rose"; color?: string;
}) {
  return (
    <button id={id} type="button" onClick={onClick} title={title}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl border transition-colors",
        !accent && "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        accent === "primary" && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
        accent === "amber" && "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400 hover:bg-amber-400/20",
        accent === "rose" && "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-400 hover:bg-rose-400/20",
      )}
    >
      {icon}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const params = useParams();
  const agentId = String(params.id);
  const tp = t.agentPage;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Panels
  const [brainOpen, setBrainOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setAgent(d.data); setNameInput(d.data.name); })
      .catch(() => toast.error("Failed to load agent."))
      .finally(() => setIsLoading(false));
  }, [agentId, authHeaders]);

  const patchAgent = useCallback(async (patch: Partial<Agent>) => {
    const r = await fetch(`${API_BASE}/agents/${agentId}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error("Failed to save");
    const d = await r.json();
    setAgent(d.data);
    return d.data as Agent;
  }, [agentId, authHeaders]);

  const handleSaveName = async () => {
    if (!nameInput.trim() || !agent) return;
    setIsSavingName(true);
    try { await patchAgent({ name: nameInput.trim() }); setEditingName(false); }
    catch { toast.error("Failed to save name."); }
    finally { setIsSavingName(false); }
  };

  const handleIconChange = async (newIcon: string) => {
    if (!agent) return;
    setAgent({ ...agent, icon: newIcon });
    try { await patchAgent({ icon: newIcon }); } catch { toast.error("Failed to save avatar."); }
  };

  const handleColorChange = async (newColor: string) => {
    if (!agent) return;
    const newMeta = { ...(agent.metadata ?? {}), avatarColor: newColor };
    setAgent({ ...agent, metadata: newMeta });
    try { await patchAgent({ metadata: newMeta }); } catch { toast.error("Failed to save color."); }
  };

  const handleBrainSave = async (fields: { personality?: string; identity?: string; longTermMemory?: string }) => {
    if (!agent) return;
    await patchAgent({ metadata: { ...(agent.metadata ?? {}), ...fields } });
  };

  const handleModelSave = async (model: string) => {
    if (!agent) return;
    await patchAgent({ metadata: { ...(agent.metadata ?? {}), model } });
  };

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <Bot className="size-12 text-muted-foreground" />
        <p className="text-lg font-semibold">{tp.notFound}</p>
        <Link href="/agents" className="text-sm text-primary hover:underline">{tp.backToSquad}</Link>
      </div>
    );
  }

  const icon = agent.icon ?? "🤖";
  const color = agent.metadata?.avatarColor ?? AVATAR_COLORS[0];
  const health = computeHealth(agent);
  const currentModel = agent.metadata?.model ?? AVAILABLE_MODELS[0].model;
  const ta = t.agents;
  const roleLabel = ta.roleLabels[agent.type as keyof typeof ta.roleLabels] ?? agent.type;
  const healthLabel = health === "online" ? ta.healthOnline : health === "warning" ? ta.healthWarning : ta.healthOffline;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">

          {/* Back */}
          <Link href="/agents" id="back-to-squad"
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={tp.backToSquad}>
            <ArrowLeft className="size-4" />
          </Link>

          {/* Avatar */}
          <div className="relative shrink-0">
            <button id="agent-avatar-btn" type="button"
              onClick={() => setAvatarOpen((v) => !v)}
              title={ta.changeAvatar}
              style={{ background: color }}
              className="flex size-12 items-center justify-center rounded-2xl text-xl shadow-md transition-transform hover:scale-105 active:scale-95">
              {icon}
            </button>
            {avatarOpen && (
              <AvatarPicker icon={icon} color={color}
                onIconChange={handleIconChange} onColorChange={handleColorChange}
                onClose={() => setAvatarOpen(false)} />
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input id="agent-name-input" value={nameInput} autoFocus
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") { setNameInput(agent.name); setEditingName(false); }
                  }}
                  className="h-8 text-sm font-semibold" />
                <button id="agent-name-save" type="button" disabled={isSavingName} onClick={handleSaveName}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {isSavingName ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button type="button" onClick={() => { setNameInput(agent.name); setEditingName(false); }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-1.5">
                <h1 className="truncate text-base font-bold text-foreground">{agent.name}</h1>
                <button id="agent-name-edit" type="button"
                  onClick={() => { setNameInput(agent.name); setEditingName(true); }}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground">
                  <Edit2 className="size-3" />
                </button>
              </div>
            )}
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{roleLabel}</span>
              <div className="flex items-center gap-1.5">
                <HealthDot status={health} />
                <span className={cn("text-[11px] font-medium",
                  health === "online" && "text-emerald-600 dark:text-emerald-400",
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
          <div className="flex shrink-0 items-center gap-1.5">
            <ActionIcon id="open-history-btn" onClick={() => setHistoryOpen(true)}
              title={tp.openHistory} icon={<History className="size-4" />} />
            <ActionIcon id="open-brain-btn" onClick={() => setBrainOpen(true)}
              title={tp.openBrain} icon={<Brain className="size-4" />} accent="primary" />
            <ActionIcon id="open-tools-btn" onClick={() => setToolsOpen(true)}
              title={tp.openTools} icon={<Wrench className="size-4" />} accent="amber" />
            <ActionIcon id="open-security-btn" onClick={() => setSecurityOpen(true)}
              title={tp.openSecurity} icon={<ShieldCheck className="size-4" />} accent="rose" />
          </div>
        </div>
      </header>

      {/* ── Body: Chat + Stats sidebar ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatArea
            agentId={agentId} agentName={agent.name} agentIcon={icon}
            agentColor={color} userName={user?.name ?? "You"} token={token}
            activeConversation={activeConversation}
            onConversationCreated={(conv) => setActiveConversation(conv)}
            t={t}
          />
        </div>

        {/* Stats sidebar (lg+) */}
        <StatsSidebar agentColor={color} t={t} />
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      {brainOpen && (
        <BrainModal agentName={agent.name}
          fields={{ personality: agent.metadata?.personality, identity: agent.metadata?.identity, longTermMemory: agent.metadata?.longTermMemory }}
          onSave={handleBrainSave} onClose={() => setBrainOpen(false)} t={tp.brain} />
      )}
      {historyOpen && (
        <ConversationHistory agentId={agentId}
          onSelectConversation={(conv) => setActiveConversation(conv)}
          onClose={() => setHistoryOpen(false)} t={tp.history} />
      )}
      {toolsOpen && (
        <PlaceholderPanel
          title={tp.openTools}
          subtitle="Connect MCP tools, APIs, and code execution capabilities to this agent."
          icon={<Wrench className="size-5 text-amber-600 dark:text-amber-400" />}
          accentClass="bg-amber-400/10"
          onClose={() => setToolsOpen(false)}
        />
      )}
      {securityOpen && (
        <PlaceholderPanel
          title={tp.openSecurity}
          subtitle="Configure approval policies, guardrails, and access boundaries for this agent."
          icon={<ShieldCheck className="size-5 text-rose-600 dark:text-rose-400" />}
          accentClass="bg-rose-400/10"
          onClose={() => setSecurityOpen(false)}
        />
      )}
    </div>
  );
}
