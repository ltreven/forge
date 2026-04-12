"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Edit2,
  Gauge,
  History,
  Loader2,
  Send,
  Settings,
  X,
} from "lucide-react";
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
  const tgStatus = agent.metadata?.telegramStatus;
  if (!tgStatus || tgStatus === "not_configured" || tgStatus === "registering") return "warning";
  if (tgStatus === "complete") return "online";
  return "warning";
}

// ── HealthDot ─────────────────────────────────────────────────────────────────

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

function AvatarPicker({
  icon, color, onIconChange, onColorChange, onClose,
}: {
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
            className={cn("size-6 rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-offset-2 ring-foreground scale-110")}
          />
        ))}
      </div>
    </div>
  );
}

// ── ChatArea ──────────────────────────────────────────────────────────────────

function ChatArea({
  agentId, agentName, agentIcon, agentColor, userName, token,
  activeConversation, onConversationCreated,
  t,
}: {
  agentId: string;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  userName: string;
  token: string | null;
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

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation?.id) {
      setChatMessages([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setChatMessages(data.data ?? []);
        }
      } catch { /* silent */ }
    };
    load();
  }, [conversation?.id, authHeaders]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    setIsSending(true);

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      let convId = conversation?.id;

      // Create conversation if none exists
      if (!convId) {
        const convRes = await fetch(`${API_BASE}/conversations`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            agentId,
            counterpartType: "human",
            counterpartName: userName,
          }),
        });
        if (!convRes.ok) throw new Error("Failed to create conversation");
        const convData = await convRes.json();
        const newConv: Conversation = convData.data;
        setConversation(newConv);
        convId = newConv.id;
        onConversationCreated(newConv);
      }

      // Persist user message
      await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ role: "user", content: text }),
      });

      // Simulate assistant response (placeholder until real agent integration)
      await new Promise((r) => setTimeout(r, 800));
      const assistantMsg: ChatMessage = {
        id: `tmp-assistant-${Date.now()}`,
        role: "assistant",
        content: "I received your message. Agent runtime integration coming soon.",
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      // Persist assistant message
      if (convId) {
        await fetch(`${API_BASE}/conversations/${convId}/messages`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ role: "assistant", content: assistantMsg.content }),
        });
      }
    } catch {
      toast.error("Failed to send message.");
      setChatMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {chatMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl text-4xl"
              style={{ background: agentColor + "20" }}>
              {agentIcon}
            </div>
            <div>
              <p className="font-semibold text-foreground">{tc.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tc.emptySubtitle}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {chatMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                agentName={agentName}
                agentIcon={agentIcon}
                agentColor={agentColor}
                userName={userName}
                youLabel={tc.you}
              />
            ))}
            {isSending && <ThinkingBubble agentIcon={agentIcon} agentColor={agentColor} label={tc.thinking} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-end gap-3"
        >
          <div className="relative flex-1">
            <Input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={tc.placeholder}
              className="pr-12 rounded-xl h-11"
              disabled={isSending}
            />
          </div>
          <Button
            id="chat-send-btn"
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending}
            className="size-11 rounded-xl shrink-0"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  msg, agentName, agentIcon, agentColor, userName, youLabel,
}: {
  msg: ChatMessage; agentName: string; agentIcon: string; agentColor: string; userName: string; youLabel: string;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-end gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm")}
        style={isUser ? { background: "#6366f1", color: "#fff" } : { background: agentColor + "20" }}
      >
        {isUser ? userName.charAt(0).toUpperCase() : agentIcon}
      </div>
      {/* Bubble */}
      <div className={cn("max-w-[75%] flex flex-col gap-1", isUser && "items-end")}>
        <span className="text-[11px] text-muted-foreground">{isUser ? youLabel : agentName}</span>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ agentIcon, agentColor, label }: { agentIcon: string; agentColor: string; label: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: agentColor + "20" }}>
        {agentIcon}
      </div>
      <div className="flex flex-col gap-1">
        <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            <span className="ml-1 text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const params = useParams();
  const agentId = String(params.id);
  const tp = t.agentPage;

  // ── Agent state ────────────────────────────────────────────────────────────
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Inline editing ─────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  // ── Panels ─────────────────────────────────────────────────────────────────
  const [brainOpen, setBrainOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Conversation ───────────────────────────────────────────────────────────
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // ── Load agent ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setAgent(data.data);
          setNameInput(data.data.name);
        }
      } catch {
        toast.error("Failed to load agent.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [agentId, authHeaders]);

  // ── Patch helper ───────────────────────────────────────────────────────────
  const patchAgent = useCallback(async (patch: Partial<Agent>) => {
    const res = await fetch(`${API_BASE}/agents/${agentId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Failed to save");
    const data = await res.json();
    setAgent(data.data);
    return data.data as Agent;
  }, [agentId, authHeaders]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!nameInput.trim() || !agent) return;
    setIsSavingName(true);
    try {
      await patchAgent({ name: nameInput.trim() });
      setEditingName(false);
    } catch { toast.error("Failed to save name."); }
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
    const newMeta = { ...(agent.metadata ?? {}), ...fields };
    await patchAgent({ metadata: newMeta });
  };

  const handleModelSave = async (model: string) => {
    if (!agent) return;
    const newMeta = { ...(agent.metadata ?? {}), model };
    await patchAgent({ metadata: newMeta });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
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
        <Link href="/agents" className="text-sm text-primary hover:underline">
          {tp.backToSquad}
        </Link>
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
      {/* ── Agent Header ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          {/* Back to squad */}
          <Link
            href="/agents"
            id="back-to-squad"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={tp.backToSquad}
          >
            <ArrowLeft className="size-4" />
          </Link>

          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              id="agent-avatar-btn"
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

          {/* Name + role + status */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  id="agent-name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") { setNameInput(agent.name); setEditingName(false); }
                  }}
                  className="h-8 text-base font-semibold"
                  autoFocus
                />
                <button
                  id="agent-name-save"
                  type="button"
                  disabled={isSavingName}
                  onClick={handleSaveName}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSavingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setNameInput(agent.name); setEditingName(false); }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="truncate text-lg font-bold text-foreground">{agent.name}</h1>
                <button
                  id="agent-name-edit"
                  type="button"
                  onClick={() => { setNameInput(agent.name); setEditingName(true); }}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                >
                  <Edit2 className="size-3" />
                </button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {roleLabel}
              </span>
              <div className="flex items-center gap-1.5">
                <HealthDot status={health} />
                <span className={cn(
                  "text-xs font-medium",
                  health === "online" && "text-emerald-600 dark:text-emerald-400",
                  health === "warning" && "text-amber-600 dark:text-amber-400",
                  health === "offline" && "text-red-600 dark:text-red-400"
                )}>{healthLabel}</span>
              </div>
            </div>
          </div>

          {/* Model selector */}
          <div className="relative hidden sm:block">
            <ModelSelector
              currentModel={currentModel}
              onSave={handleModelSave}
              t={tp.model}
            />
          </div>

          {/* Action icons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <ActionIcon
              id="open-history-btn"
              onClick={() => setHistoryOpen(true)}
              title={tp.openHistory}
              icon={<History className="size-4" />}
            />
            <ActionIcon
              id="open-brain-btn"
              onClick={() => setBrainOpen(true)}
              title={tp.openBrain}
              icon={<Brain className="size-4" />}
              accent
            />
            <Link href={`/agents/${agentId}/dashboard`}>
              <ActionIcon
                id="open-dashboard-btn"
                title={tp.openDashboard}
                icon={<Gauge className="size-4" />}
              />
            </Link>
            <Link href="/agents">
              <ActionIcon
                id="open-settings-btn"
                title={tp.openSettings}
                icon={<Settings className="size-4" />}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Chat Area ────────────────────────────────────────────────────────── */}
      <ChatArea
        agentId={agentId}
        agentName={agent.name}
        agentIcon={icon}
        agentColor={color}
        userName={user?.name ?? "You"}
        token={token}
        activeConversation={activeConversation}
        onConversationCreated={(conv) => setActiveConversation(conv)}
        t={t}
      />

      {/* ── Brain Modal ──────────────────────────────────────────────────────── */}
      {brainOpen && (
        <BrainModal
          agentName={agent.name}
          fields={{
            personality: agent.metadata?.personality,
            identity: agent.metadata?.identity,
            longTermMemory: agent.metadata?.longTermMemory,
          }}
          onSave={handleBrainSave}
          onClose={() => setBrainOpen(false)}
          t={tp.brain}
        />
      )}

      {/* ── History Drawer ───────────────────────────────────────────────────── */}
      {historyOpen && (
        <ConversationHistory
          agentId={agentId}
          onSelectConversation={(conv) => setActiveConversation(conv)}
          onClose={() => setHistoryOpen(false)}
          t={tp.history}
        />
      )}
    </div>
  );
}

// ── ActionIcon helper ─────────────────────────────────────────────────────────

function ActionIcon({
  id, onClick, title, icon, accent,
}: {
  id?: string;
  onClick?: () => void;
  title: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl border transition-colors",
        accent
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
    </button>
  );
}
