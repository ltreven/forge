"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, Brain, ChevronRight, Gauge,
  History, Loader2, Send, Settings, ShieldCheck, Wrench, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ModelSelector, AVAILABLE_MODELS } from "@/components/agent/model-selector";

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthStatus = "online" | "warning" | "offline";

interface AgentMetadata {
  avatarColor?: string;
  telegramStatus?: string;
  personality?: string; identity?: string; longTermMemory?: string;
  model?: string;
}

interface Agent {
  id: string; name: string; type: string;
  icon?: string; metadata?: AgentMetadata;
  teamId?: string;
}

interface ChatMessage {
  id: string; role: "user" | "assistant";
  content: string; createdAt: string;
}

interface Conversation {
  id: string; agentId: string;
  counterpartType: string; counterpartName: string;
  createdAt: string; updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  team_lead:          "#6366f1",
  software_engineer:  "#3b82f6",
  software_architect: "#8b5cf6",
  product_manager:    "#ec4899",
};

const ROLE_LABELS: Record<string, string> = {
  team_lead:          "Team Lead",
  software_engineer:  "Software Engineer",
  software_architect: "Software Architect",
  product_manager:    "Product Manager",
};

// ── Health helpers ────────────────────────────────────────────────────────────

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

// ── Chat ──────────────────────────────────────────────────────────────────────

function ChatArea({ agentId, agentName, agentIcon, agentColor, userName, token, t }: {
  agentId: string; agentName: string; agentIcon: string; agentColor: string;
  userName: string; token: string | null;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const tc = t.agentPage.chat;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [conv, setConv]         = useState<Conversation | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

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
        const nc: Conversation = (await r.json()).data;
        setConv(nc); cid = nc.id;
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
            <div className="flex size-12 items-center justify-center rounded-2xl text-2xl opacity-30"
              style={{ background: agentColor + "18" }}>{agentIcon}</div>
            <p className="text-xs text-muted-foreground/50">{tc.emptySubtitle}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={isUser ? { background: "#6366f1", color: "#fff" } : { background: agentColor + "22" }}>
                    {isUser ? userName.charAt(0).toUpperCase() : agentIcon}
                  </div>
                  <div className={cn("max-w-[78%] flex flex-col gap-0.5", isUser && "items-end")}>
                    <span className="px-1 text-[10px] text-muted-foreground">{isUser ? tc.you : agentName}</span>
                    <div className={cn("rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex items-end gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: agentColor + "22" }}>{agentIcon}</div>
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    <span className="ml-1 text-xs text-muted-foreground">{tc.thinking}</span>
                  </div>
                </div>
              </div>
            )}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { t }           = useTranslation();
  const { token, user } = useAuth();
  const params          = useParams();
  const agentId         = String(params.id);
  const tp              = t.agentPage;

  const [agent, setAgent]         = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAgent(d.data))
      .catch(() => toast.error("Failed to load agent."))
      .finally(() => setIsLoading(false));
  }, [agentId, authHeaders]);

  const patchAgent = useCallback(async (patch: object) => {
    const r = await fetch(`${API_BASE}/agents/${agentId}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(patch) });
    if (!r.ok) throw new Error();
    const d = await r.json(); setAgent(d.data); return d.data as Agent;
  }, [agentId, authHeaders]);

  const handleModelSave = async (model: string) => {
    if (!agent) return;
    await patchAgent({ metadata: { ...(agent.metadata ?? {}), model } });
  };

  // Guards
  if (isLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!agent) return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
      <Bot className="size-10 text-muted-foreground" />
      <p className="font-semibold">{tp.notFound}</p>
      <Link href="/teams" className="text-sm text-primary hover:underline">{tp.backToSquad}</Link>
    </div>
  );

  const icon         = agent.icon ?? "🤖";
  const color        = agent.metadata?.avatarColor ?? ROLE_COLORS[agent.type] ?? "#6366f1";
  const health       = computeHealth(agent);
  const currentModel = agent.metadata?.model ?? AVAILABLE_MODELS[0].model;
  const ta           = t.agents;
  const roleLabel    = ROLE_LABELS[agent.type] ?? agent.type;
  const healthLabel  = health === "online" ? ta.healthOnline : health === "warning" ? ta.healthWarning : ta.healthOffline;
  const backHref     = agent.teamId ? `/teams/${agent.teamId}` : "/teams";

  const NAV_ITEMS = [
    { href: `/agents/${agentId}/general`,   icon: <Settings    className="size-5" />, title: "General Settings",       description: "Name, avatar, and identity.",               accent: "#6366f1" },
    { href: `/agents/${agentId}/brain`,     icon: <Brain       className="size-5" />, title: "Brain",                  description: "Personality, role, and long-term memory.",  accent: "#8b5cf6" },
    { href: `/agents/${agentId}/history`,   icon: <History     className="size-5" />, title: "History",                description: "Past conversations and threads.",            accent: "#3b82f6" },
    { href: `/agents/${agentId}/dashboard`, icon: <Gauge       className="size-5" />, title: "Dashboard",              description: "Task activity and token usage.",             accent: "#06b6d4" },
    { href: `/agents/${agentId}/tools`,     icon: <Wrench      className="size-5" />, title: "Tools",                  description: "MCP servers, APIs, code execution.",         accent: "#f59e0b" },
    { href: `/agents/${agentId}/security`,  icon: <ShieldCheck className="size-5" />, title: "Security",               description: "Approval policies and guardrails.",          accent: "#ef4444" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Back — same style as /teams/[id] ──────────────────────────── */}
      <Link href={backHref} id="back-to-team"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        {tp.backToSquad}
      </Link>

      {/* ── Agent header ────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-4">
        {/* Avatar */}
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
          style={{ background: color + "22" }}>
          {icon}
        </div>
        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{agent.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {roleLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <HealthDot status={health} />
              <span className={cn("text-xs font-medium",
                health === "online"  && "text-emerald-600 dark:text-emerald-400",
                health === "warning" && "text-amber-600 dark:text-amber-400",
                health === "offline" && "text-red-600 dark:text-red-400"
              )}>{healthLabel}</span>
            </div>
            {/* Model selector — inline next to identity */}
            <div className="relative">
              <ModelSelector currentModel={currentModel} onSave={handleModelSave} t={tp.model} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-column layout (same as /teams/[id]) ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── LEFT (col-span-2): Chat ─── */}
        <div className="lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Chat</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Send a message directly to this agent.</p>
            </div>
            <div className="flex h-[520px] flex-col overflow-hidden">
              <ChatArea
                agentId={agentId}
                agentName={agent.name}
                agentIcon={icon}
                agentColor={color}
                userName={user?.name ?? "You"}
                token={token}
                t={t}
              />
            </div>
          </section>
        </div>

        {/* ── RIGHT: Nav cards ─── */}
        <div className="flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{ background: (item.accent) + "18", color: item.accent }}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}

          {/* Quick info card */}
          <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4 text-xs text-muted-foreground flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="font-medium">Type</span>
              <span className="font-bold text-foreground">{roleLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Model</span>
              <span className="font-bold text-foreground">{currentModel === "auto" ? "Auto Route" : currentModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status</span>
              <span className={cn("font-bold",
                health === "online"  && "text-emerald-600",
                health === "warning" && "text-amber-600",
                health === "offline" && "text-red-600"
              )}>{healthLabel}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
