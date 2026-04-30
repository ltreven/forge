"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ListTodo,
  Trash2,
  MessageSquare,
  Users,
  Activity,
  ClipboardList,
  CheckSquare,
  FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { Team, Task, Agent, Comment } from "@/lib/types";
import { Button, CommentsList } from "@/components/shared-ui";

export default function TaskPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const teamId = String(params.id);
  const taskId = String(params.taskId);

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam]         = useState<Team | null>(null);
  const [task, setTask]         = useState<Task | null>(null);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

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
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/tasks/${taskId}/comments`, { headers: headers() }),
    ])
      .then(async ([teamRes, taskRes, agentsRes, commentsRes]) => {
        if (!taskRes.ok) {
          toast.error("Task not found.");
          router.replace(`/teams/${teamId}`);
          return;
        }
        const tm: Team = (await teamRes.json()).data;
        const t: Task = (await taskRes.json()).data;
        const a: Agent[] = (await agentsRes.json()).data ?? [];
        const c: Comment[] = commentsRes.ok ? (await commentsRes.json()).data ?? [] : [];

        setTeam(tm);
        setTask(t);
        setAgents(a);
        setComments(c);
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

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task || !team) return null;

  const assignedAgent = agents.find(a => a.id === task.assignedToId);

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
            <span className="text-[10px] font-mono font-medium text-muted-foreground">ID: {task.id.substring(0, 8)}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 gap-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleDeleteTask}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{task.title}</h1>
            </div>

            {task.plan && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><ListTodo className="size-3.5" /> Plan</div>
                <div className="rounded-xl border border-border bg-card p-5 text-sm whitespace-pre-wrap leading-relaxed">
                  {task.plan}
                </div>
              </div>
            )}

            {task.taskList && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><CheckSquare className="size-3.5" /> Task List</div>
                <div className="rounded-xl border border-border bg-card p-5 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                  {task.taskList}
                </div>
              </div>
            )}

            {task.executionLog && task.executionLog.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><Activity className="size-3.5" /> Execution Log</div>
                <div className="rounded-xl border border-border bg-card p-5 text-sm whitespace-pre-wrap leading-relaxed bg-zinc-950 text-zinc-300 font-mono overflow-x-auto">
                  {task.executionLog.map((log, idx) => (
                    <div key={idx} className="border-b border-white/5 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {task.workSummary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><ClipboardList className="size-3.5" /> Work Summary</div>
                <div className="rounded-xl border border-border bg-card p-5 text-sm whitespace-pre-wrap leading-relaxed">
                  {task.workSummary}
                </div>
              </div>
            )}

            {task.result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest"><FileCheck className="size-3.5" /> Deliverable / Result</div>
                <div className="rounded-xl border border-border bg-card p-5 text-sm whitespace-pre-wrap leading-relaxed bg-primary/5 border-primary/20">
                  {task.result}
                </div>
              </div>
            )}

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
                  <label className="text-xs font-medium text-muted-foreground">Worked On By</label>
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {assignedAgent ? (
                      <>
                        <span>{assignedAgent.icon}</span>
                        <span>{assignedAgent.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
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
