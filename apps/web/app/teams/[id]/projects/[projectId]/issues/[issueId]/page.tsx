"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  Plus,
  Loader2,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Flame,
  LayoutGrid,
  ListTodo,
  Calendar,
  User,
  Save,
  MoreHorizontal,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Project, ProjectIssue, Agent } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = {
  0: "Backlog",
  1: "To Do",
  2: "In Progress",
  3: "In Review",
  4: "Done",
  5: "Cancelled",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

// ── Shared Components ─────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: number }) {
  switch (status) {
    case 0: return <Circle className="size-3.5 text-muted-foreground/40" />;
    case 1: return <Circle className="size-3.5 text-muted-foreground" />;
    case 2: return <CircleDot className="size-3.5 text-amber-500 animate-pulse" />;
    case 3: return <CircleDashed className="size-3.5 text-blue-500" />;
    case 4: return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case 5: return <Circle className="size-3.5 text-red-500/50" />;
    default: return <Circle className="size-3.5 text-muted-foreground" />;
  }
}

function PriorityIcon({ priority, className }: { priority: number; className?: string }) {
  switch (priority) {
    case 0: return <Circle className={cn("size-3 text-muted-foreground/20", className)} />;
    case 1: return <SignalLow className={cn("size-3 text-blue-500/70", className)} />;
    case 2: return <SignalMedium className={cn("size-3 text-amber-500/70", className)} />;
    case 3: return <SignalHigh className={cn("size-3 text-orange-500", className)} />;
    case 4: return <Flame className={cn("size-3 text-red-500", className)} />;
    default: return null;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IssuePage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const teamId = String(params.id);
  const projectId = String(params.projectId);
  const issueId = String(params.issueId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject]   = useState<Project | null>(null);
  const [issue, setIssue]       = useState<ProjectIssue | null>(null);
  const [subIssues, setSubIssues] = useState<ProjectIssue[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(0);
  const [priority, setPriority] = useState(0);
  const [assignedToId, setAssignedToId] = useState<string | null>(null);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadData = useCallback(() => {
    if (!token) return;
    setIsLoading(true);

    Promise.all([
      fetch(`${API_BASE}/projects/${projectId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/issues/${issueId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/${projectId}/issues`, { headers: headers() }), // To find sub-issues
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers: headers() }),
    ])
      .then(async ([projRes, issueRes, allIssuesRes, agentsRes]) => {
        if (!issueRes.ok) {
          toast.error("Issue not found.");
          router.replace(`/teams/${teamId}/projects/${projectId}`);
          return;
        }
        const p: Project = (await projRes.json()).data;
        const i: ProjectIssue = (await issueRes.json()).data;
        const all: ProjectIssue[] = (await allIssuesRes.json()).data ?? [];
        const a: Agent[] = (await agentsRes.json()).data ?? [];

        setProject(p);
        setIssue(i);
        setSubIssues(all.filter(x => x.parentIssueId === i.id));
        setAgents(a);
        
        // Populate form
        setTitle(i.title);
        setDescription(i.descriptionMarkdown || "");
        setStatus(i.status);
        setPriority(i.priority);
        setAssignedToId(i.assignedToId || null);
      })
      .catch((err) => {
        console.error("Failed to load issue data:", err);
        toast.error("Failed to load issue details.");
      })
      .finally(() => setIsLoading(false));
  }, [projectId, issueId, teamId, token, headers, router]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handleSaveIssue = async () => {
    if (!issue || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/issues/${issueId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          title,
          descriptionMarkdown: description,
          status,
          priority,
          assignedToId
        }),
      });

      if (!res.ok) throw new Error();
      const updated = (await res.json()).data;
      setIssue(updated);
      toast.success("Issue updated successfully");
    } catch {
      toast.error("Failed to save issue changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubIssue = async () => {
    const subTitle = prompt("Sub-issue title:");
    if (!subTitle) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: subTitle,
          parentIssueId: issueId,
          status: 1, // To Do
          priority: 1
        }),
      });

      if (!res.ok) throw new Error();
      const newSub = (await res.json()).data;
      setSubIssues(p => [newSub, ...p]);
      toast.success("Sub-issue created");
    } catch {
      toast.error("Failed to create sub-issue");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!issue || !project) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/teams/${teamId}/projects/${projectId}`} 
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              {project.title}
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">
              ISS-{issue.id.substring(0,4).toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" size="sm" 
              className="h-8 gap-2 text-xs" 
              onClick={handleSaveIssue}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          
          {/* ── Left Column: Details ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Description */}
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title..."
                className="w-full bg-transparent text-3xl font-bold tracking-tight text-foreground outline-none focus:ring-0 placeholder:text-muted-foreground/30"
              />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  <ListTodo className="size-3.5" />
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a detailed description for the agents..."
                  className="min-h-[250px] w-full resize-none rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <p className="text-[10px] text-muted-foreground">Markdown is supported.</p>
              </div>
            </div>

            {/* Sub-issues section */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  <Target className="size-3.5" />
                  Sub-issues
                </div>
                <button onClick={handleCreateSubIssue} className="text-muted-foreground hover:text-foreground">
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
                {subIssues.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground/50">No sub-issues yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {subIssues.map(sub => (
                      <Link 
                        key={sub.id}
                        href={`/teams/${teamId}/projects/${projectId}/issues/${sub.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors group"
                      >
                        <StatusIcon status={sub.status} />
                        <span className="text-[9px] font-mono text-muted-foreground/50 w-14 shrink-0">
                          ISS-{sub.id.substring(0,4).toUpperCase()}
                        </span>
                        <p className={cn("text-sm flex-1 truncate", sub.status === 4 && "line-through text-muted-foreground")}>
                          {sub.title}
                        </p>
                        <PriorityIcon priority={sub.priority} />
                        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px]">
                          {agents.find(a => a.id === sub.assignedToId)?.icon || "🤖"}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Sidebar ───────────────────────────────────── */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Properties</h3>
              
              <div className="space-y-4">
                {/* Status Picker */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Picker */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-px bg-border my-2" />

                {/* Assignee Picker */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <select 
                    value={assignedToId || ""}
                    onChange={(e) => setAssignedToId(e.target.value || null)}
                    className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer max-w-[120px]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Updated</label>
                  <span className="text-xs font-semibold text-foreground">
                    {new Date(issue.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Project</h3>
              <Link 
                href={`/teams/${teamId}/projects/${projectId}`}
                className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground">{project.title}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">PRJ-{project.id.substring(0,4)}</p>
                </div>
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── UI Components (Mocked from Shadcn) ─────────────────────────────────────────

function Button({ 
  className, variant, size, ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "outline"; 
  size?: "sm" | "md" 
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50",
        variant === "outline" ? "border border-border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}
