"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  ListTodo,
  User,
  Save,
  Trash2,
  MessageSquare,
  Users,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Team, Task, Agent, Comment, TaskType, Label } from "@/lib/types";
import { StatusIcon, PriorityIcon, Button, CommentsList } from "@/components/shared-ui";

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const teamId = String(params.id);
  const taskId = String(params.taskId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [team, setTeam]         = useState<Team | null>(null);
  const [task, setTask]         = useState<Task | null>(null);
  const [subTasks, setSubTasks] = useState<Task[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [teamLabels, setTeamLabels] = useState<Label[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(0);
  const [priority, setPriority] = useState(0);
  const [assignedToId, setAssignedToId] = useState<string | null>(null);
  const [taskTypeId, setTaskTypeId] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadData = useCallback(() => {
    if (!token) return;
    setIsLoading(true);

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/tasks/${taskId}`, { headers: headers() }),
      fetch(`${API_BASE}/tasks/by-team/${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/tasks/${taskId}/comments`, { headers: headers() }),
      fetch(`${API_BASE}/teams/${teamId}/task-types`, { headers: headers() }),
      fetch(`${API_BASE}/teams/${teamId}/labels`, { headers: headers() }),
    ])
      .then(async ([teamRes, taskRes, allTasksRes, agentsRes, commentsRes, typesRes, labelsRes]) => {
        if (!taskRes.ok) {
          toast.error("Task not found.");
          router.replace(`/teams/${teamId}`);
          return;
        }
        const tm: Team = (await teamRes.json()).data;
        const t: Task = (await taskRes.json()).data;
        const all: Task[] = (await allTasksRes.json()).data ?? [];
        const a: Agent[] = (await agentsRes.json()).data ?? [];
        const c: Comment[] = commentsRes.ok ? (await commentsRes.json()).data ?? [] : [];
        const types: TaskType[] = typesRes.ok ? (await typesRes.json()).data ?? [] : [];
        const labs: Label[] = labelsRes.ok ? (await labelsRes.json()).data ?? [] : [];

        setTeam(tm);
        setTask(t);
        setSubTasks(all.filter(x => x.parentTaskId === t.id));
        setAgents(a);
        setComments(c);
        setTaskTypes(types);
        setTeamLabels(labs);
        
        setTitle(t.title);
        setDescription(t.descriptionMarkdown || "");
        setStatus(t.status);
        setPriority(t.priority);
        setAssignedToId(t.assignedToId || null);
        setTaskTypeId(t.taskTypeId || null);
        
        // TODO: The backend tasks endpoint doesn't return joined labels yet.
        // We will assume t.labels exists if we updated the backend to return it.
        // For now, if it's there, map it, otherwise empty array.
        setSelectedLabels(t.labels || []);
      })
      .catch((err) => {
        console.error("Failed to load task data:", err);
        toast.error("Failed to load task details.");
      })
      .finally(() => setIsLoading(false));
  }, [taskId, teamId, token, headers, router]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handleSaveTask = async () => {
    if (!task || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          title,
          descriptionMarkdown: description,
          status,
          priority,
          assignedToId,
          taskTypeId,
          labels: selectedLabels
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
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
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
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          teamId,
          title: subTitle,
          parentTaskId: taskId,
          status: 1, 
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
      const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error();
      const comment = (await res.json()).data;
      setComments(prev => [...prev, comment]);
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
      const res = await fetch(`${API_BASE}/tasks/comments/${commentId}`, {
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

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task || !team) return null;

  const currentType = taskTypes.find(t => t.id === taskTypeId);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/teams/${teamId}`} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              {team.name}
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-[10px] font-mono font-medium text-muted-foreground">{task.identifier}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 gap-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleDeleteTask}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
            <Button variant="primary" size="sm" className="h-8 gap-2" onClick={handleSaveTask} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save Changes
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none focus:ring-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><ListTodo className="size-3.5" /> Description</div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[250px] w-full resize-none rounded-xl border border-border bg-card p-4 text-sm outline-none transition-all focus:border-primary/50" />
              </div>
            </div>

            <div className="pt-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  <ListTodo className="size-3.5" /> Subtasks
                </div>
                <Button variant="outline" size="sm" onClick={handleCreateSubTask} className="h-7 text-xs">
                  <Plus className="size-3.5 mr-1" /> Add Subtask
                </Button>
              </div>
              
              {subTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No subtasks yet. Break this work down into smaller pieces.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {subTasks.map(st => (
                    <Link key={st.id} href={`/teams/${teamId}/tasks/${st.identifier}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 group">
                      <StatusIcon status={st.status} className="size-4 shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">{st.identifier}</span>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{st.title}</p>
                      </div>
                      <PriorityIcon priority={st.priority} className="size-3.5 shrink-0 opacity-50" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-10 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><MessageSquare className="size-3.5" /> Comments</div>
              <CommentsList comments={comments} agents={agents} onDelete={handleDeleteComment} />
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="min-h-[80px] w-full resize-none bg-transparent text-sm outline-none" />
                <div className="flex justify-end"><Button size="sm" onClick={handlePostComment} disabled={!newComment.trim() || isPostingComment}>{isPostingComment ? <Loader2 className="size-3.5 animate-spin" /> : "Post Comment"}</Button></div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Properties</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select value={taskTypeId || ""} onChange={(e) => setTaskTypeId(e.target.value || null)} className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer max-w-[120px]">
                    <option value="">No Type</option>
                    {taskTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer">
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer">
                    {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <select value={assignedToId || ""} onChange={(e) => setAssignedToId(e.target.value || null)} className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer max-w-[120px]">
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Labels</label>
                  <div className="flex flex-wrap gap-2">
                    {teamLabels.map(label => {
                      const isActive = selectedLabels.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border",
                            isActive ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-muted"
                          )}
                          style={isActive ? { backgroundColor: label.color } : {}}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
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
