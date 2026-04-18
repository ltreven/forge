"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";

interface Conversation {
  id: string; agentId: string;
  counterpartType: string; counterpartName: string;
  createdAt: string; updatedAt: string;
}

export default function AgentHistoryPage() {
  const { token }  = useAuth();
  const params     = useParams();
  const agentId    = String(params.id);

  const [agentName, setAgentName]         = useState("Agent");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading]         = useState(true);

  const authHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/agents/${agentId}`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/conversations?agentId=${agentId}`, { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([agentData, convData]) => {
        setAgentName(agentData.data?.name ?? "Agent");
        setConversations(convData.data ?? []);
      })
      .catch(() => toast.error("Failed to load history."))
      .finally(() => setIsLoading(false));
  }, [agentId, authHeaders]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href={`/agents/${agentId}`} id="history-back"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to {agentName}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Conversation History</h1>
        <p className="mt-1 text-sm text-muted-foreground">All past conversations with {agentName}.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Bot className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conv) => (
            <div key={conv.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{conv.counterpartName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
