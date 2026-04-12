"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
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
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  status: "done" | "in_progress" | "todo";
  completedAt?: string;
}

interface DailyContrib {
  day: string;
  tasks: number;
}

interface TokenPoint {
  day: string;
  tokens: number;
}

interface Agent {
  id: string;
  name: string;
  icon?: string;
  metadata?: { avatarColor?: string };
}

// ── Mock data helpers (placeholder until task tracking is wired) ────────────────

function generateDailyContribs(): DailyContrib[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, tasks: Math.floor(Math.random() * 8) }));
}

function generateTokenTimeline(): TokenPoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let base = 20000;
  return days.map((day) => {
    base += Math.floor((Math.random() - 0.3) * 5000);
    return { day, tokens: Math.max(0, base) };
  });
}

const MOCK_CURRENT_TASK: Task = {
  id: "c1",
  title: "Implement authentication middleware for the REST API",
  status: "in_progress",
};

const MOCK_RECENT_TASKS: Task[] = [
  { id: "r1", title: "Write unit tests for UserService", status: "done", completedAt: "2026-04-12" },
  { id: "r2", title: "Fix CORS configuration in Express server", status: "done", completedAt: "2026-04-11" },
  { id: "r3", title: "Set up Drizzle ORM schema for Teams", status: "done", completedAt: "2026-04-10" },
  { id: "r4", title: "Configure CI pipeline with GitHub Actions", status: "done", completedAt: "2026-04-09" },
  { id: "r5", title: "Add Zod validation to agent routes", status: "done", completedAt: "2026-04-08" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentDashboardPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const params = useParams();
  const agentId = String(params.id);
  const td = t.agentDashboard;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dailyData = generateDailyContribs();
  const tokenData = generateTokenTimeline();

  useEffect(() => {
    const load = async () => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(`${API_BASE}/agents/${agentId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAgent(data.data);
        }
      } catch {
        toast.error("Failed to load agent.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [agentId, token]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const agentColor = agent?.metadata?.avatarColor ?? "#6366f1";
  const agentIcon = agent?.icon ?? "🤖";
  const agentName = agent?.name ?? "Agent";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/agents/${agentId}`}
          id="back-to-agent"
          className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={td.backToAgent}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div
          className="flex size-12 items-center justify-center rounded-2xl text-2xl shadow-sm"
          style={{ background: agentColor + "20" }}
        >
          {agentIcon}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{agentName}</h1>
          <p className="text-sm text-muted-foreground">{td.backToAgent}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Current Task ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Zap className="size-4" />} label={td.currentTask} color={agentColor} />
          <div className="mt-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {MOCK_CURRENT_TASK.title}
              </p>
            </div>
          </div>
        </section>

        {/* ── Recent Tasks ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Clock className="size-4" />} label={td.recentTasks} color={agentColor} />
          <div className="mt-3 flex flex-col gap-2">
            {MOCK_RECENT_TASKS.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <p className="flex-1 text-sm text-foreground">{task.title}</p>
                {task.completedAt && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">{task.completedAt}</span>
                )}
              </div>
            ))}
            <button
              id="see-more-tasks"
              className="mt-1 text-sm font-medium text-primary hover:underline underline-offset-4 text-center"
            >
              {td.seeMore}
            </button>
          </div>
        </section>

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Daily contributions */}
          <section>
            <SectionHeader
              icon={<Circle className="size-4" />}
              label={td.dailyContributions}
              color={agentColor}
            />
            <div className="mt-3 rounded-2xl border border-border bg-card p-5">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(v) => [`${v} ${td.tasks}`, ""]}
                  />
                  <Bar dataKey="tasks" fill={agentColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Token consumption */}
          <section>
            <SectionHeader
              icon={<Zap className="size-4" />}
              label={td.tokenTimeline}
              color={agentColor}
            />
            <div className="mt-3 rounded-2xl border border-border bg-card p-5">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={tokenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(v) => [`${Number(v).toLocaleString()} ${td.tokens}`, ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke={agentColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: agentColor, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── SectionHeader helper ──────────────────────────────────────────────────────

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-lg" style={{ color, background: color + "18" }}>
        {icon}
      </span>
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
    </div>
  );
}
