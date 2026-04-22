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
  Target,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Team, TeamTask, Agent, Comment } from "@/lib/types";

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

export default function TaskPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const teamId = String(params.id);
  const taskId = String(params.taskId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [team, setTeam]         = useState<Team | null>(null);
  const [task, setTask]         = useState<TeamTask | null>(null);
  const [subTasks, setSubTasks] = useState<TeamTask[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

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
      fetch(`${API_BASE}/teams/${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/tasks/${taskId}`, { headers: headers() }),
      fetch(`${API_BASE}/teams/${teamId}/tasks`, { headers: headers() }), // To find sub-tasks
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/tasks/${taskId}/comments`, { headers: headers() }),
    ])
      .then(async ([teamRes, taskRes, allTasksRes, agentsRes, commentsRes]) => {
        if (!taskRes.ok) {
          toast.error("Task not found.");
          router.replace(`/teams/${teamId}`);
          return;
        }
        const tm: Team = (await teamRes.json()).data;
        const t: TeamTask = (await taskRes.json()).data;
        const all: TeamTask[] = (await allTasksRes.json()).data ?? [];
        const a: Agent[] = (await agentsRes.json()).data ?? [];
        const c: Comment[] = commentsRes.ok ? (await commentsRes.json()).data ?? [] : [];

        setTeam(tm);
        setTask(t);
        setSubTasks(all.filter(x => x.parentTaskId === t.id));
        setAgents(a);
        setComments(c);
        
        // Populate form
        setTitle(t.title);
        setDescription(t.descriptionMarkdown || "");
        setStatus(t.status);
        setPriority(t.priority);
        setAssignedToId(t.assignedToId || null);
      })
      .catch((err) => {
        console.error("Failed to load task data:", err);
        toast.error("Failed to load task details.");
      })
      .finally(() => setIsLoading(false));
  }, [taskId, teamId, token, headers, router]);
Save,
MoreHorizontal,
Target,
Users,
Trash2
} from "lucide-react";
...
const handleSaveTask = async () => {
  if (!task || isSaving) return;
  setIsSaving(true);
  try {
    const res = await fetch(`${API_BASE}/projects/tasks/${taskId}`, {
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
    setTask(updated);
    toast.success("Task updated successfully");
  } catch {
    toast.error("Failed to save task changes");
  } finally {
    setIsSaving(false);
  }
};

const handleDeleteTask = async () => {
  if (!task) return;
  if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/projects/tasks/${taskId}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) throw new Error();
    toast.success("Task deleted");
    router.replace(`/teams/${teamId}`);
  } catch {
    toast.error("Failed to delete task");
  }
};

  const handleCreateSubTask = async () => {
    const subTitle = prompt("Sub-task title:");
    if (!subTitle) return;

    try {
      const res = await fetch(`${API_BASE}/projects/tasks`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          teamId,
          title: subTitle,
          parentTaskId: taskId,
          status: 1, // To Do
          priority: 1
        }),
      });

      if (!res.ok) throw new Error();
      const newSub = (await res.json()).data;
      setSubTasks(p => [newSub, ...p]);
      toast.success("Sub-task created");
    } catch {
      toast.error("Failed to create sub-task.");
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`${API_BASE}/projects/tasks/${taskId}/comments`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error();
      const c = (await res.json()).data;
      setComments(prev => [...prev, c]);
      setNewComment("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`${API_BASE}/projects/comments/${commentId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error();
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task || !team) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ───────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/teams/${teamId}`} 
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              {team.name}
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">
              TSK-{task.id.substring(0,4).toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" size="sm" 
              className="h-8 gap-2 text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
              onClick={handleDeleteTask}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button 
              variant="primary" size="sm" 
              className="h-8 gap-2 text-xs" 
              onClick={handleSaveTask}
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
                placeholder="Task title..."
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

            {/* Sub-tasks section */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  <Target className="size-3.5" />
                  Sub-tasks
                </div>
                <button onClick={handleCreateSubTask} className="text-muted-foreground hover:text-foreground">
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
                {subTasks.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground/50">No sub-tasks yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {subTasks.map(sub => (
                      <Link 
                        key={sub.id}
                        href={`/teams/${teamId}/tasks/${sub.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors group"
                      >
                        <StatusIcon status={sub.status} />
                        <span className="text-[9px] font-mono text-muted-foreground/50 w-14 shrink-0">
                          TSK-{sub.id.substring(0,4).toUpperCase()}
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

            {/* Comments section */}
            <div className="pt-6 space-y-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                <MoreHorizontal className="size-3.5" />
                Comments
              </div>
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                      {c.actorType === "agent" ? agents.find(a => a.id === c.actorId)?.icon || "🤖" : "👤"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {c.actorType === "agent" ? agents.find(a => a.id === c.actorId)?.name || "Agent" : user?.name || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
                      {user?.id === c.actorId && c.actorType === "human" && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-red-500/70 hover:text-red-500 transition-colors mt-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[80px] w-full resize-none rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    size="sm" 
                    onClick={handlePostComment} 
                    disabled={isPostingComment || !newComment.trim()}
                  >
                    {isPostingComment ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                    Post Comment
                  </Button>
                </div>
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
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Team</h3>
              <div className="flex items-center gap-3 p-2 -m-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground">{team.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono">Team Task</p>
                </div>
              </div>
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
  variant?: "primary" | "outline" | "destructive"; 
  size?: "sm" | "md" 
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50",
        variant === "outline" ? "border border-border bg-background hover:bg-muted" : 
        variant === "destructive" ? "bg-destructive text-destructive-foreground hover:opacity-90" :
        "bg-primary text-primary-foreground hover:opacity-90",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
}
