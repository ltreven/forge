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
  FolderKanban
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Project, ProjectIssue, Agent, Comment } from "@/lib/types";
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

export default function ProjectPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  
  const teamId = String(params.id);
  const projectId = String(params.projectId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject]   = useState<Project | null>(null);
  const [issues, setIssues]     = useState<ProjectIssue[]>([]);
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(0);
  const [priority, setPriority] = useState(0);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadData = useCallback(() => {
    if (!token) return;
    setIsLoading(true);

    Promise.all([
      fetch(`${API_BASE}/projects/${projectId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/${projectId}/issues`, { headers: headers() }),
      fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers: headers() }),
      fetch(`${API_BASE}/projects/${projectId}/comments`, { headers: headers() }),
    ])
      .then(async ([projRes, issuesRes, agentsRes, commentsRes]) => {
        if (!projRes.ok) {
          toast.error("Project not found.");
          router.replace(`/teams/${teamId}`);
          return;
        }
        const p: Project = (await projRes.json()).data;
        const i: ProjectIssue[] = (await issuesRes.json()).data ?? [];
        const a: Agent[] = (await agentsRes.json()).data ?? [];
        const c: Comment[] = commentsRes.ok ? (await commentsRes.json()).data ?? [] : [];

        setProject(p);
        setIssues(i);
        setAgents(a);
        setComments(c);
        
        setTitle(p.title);
        setDescription(p.descriptionMarkdown || "");
        setStatus(p.status);
        setPriority(p.priority);
      })
      .catch((err) => {
        console.error("Failed to load project data:", err);
        toast.error("Failed to load project details.");
      })
      .finally(() => setIsLoading(false));
  }, [projectId, teamId, token, headers, router]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handleSaveProject = async () => {
    if (!project || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          title,
          descriptionMarkdown: description,
          status,
          priority
        }),
      });

      if (!res.ok) throw new Error();
      const updated = (await res.json()).data;
      setProject(updated);
      toast.success("Project updated successfully");
    } catch {
      toast.error("Failed to save project changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error();
      toast.success("Project deleted");
      router.replace(`/teams/${teamId}`);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleCreateIssue = async (targetStatus: number) => {
    const issueTitle = prompt("Issue title:");
    if (!issueTitle) return;

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/issues`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: issueTitle,
          status: targetStatus,
          priority: 1 
        }),
      });

      if (!res.ok) throw new Error();
      const newIssue = (await res.json()).data;
      setIssues(p => [newIssue, ...p]);
      toast.success("Issue created");
    } catch {
      toast.error("Failed to create issue");
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/comments`, {
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

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/teams/${teamId}`} 
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5" />
              Back to Team
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">
              PRJ-{project.id.substring(0,4).toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" size="sm" 
              className="h-8 gap-2 text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
              onClick={handleDeleteProject}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button 
              variant="primary" size="sm" 
              className="h-8 gap-2 text-xs" 
              onClick={handleSaveProject}
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
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title..."
                className="w-full bg-transparent text-4xl font-bold tracking-tight text-foreground outline-none focus:ring-0 placeholder:text-muted-foreground/30"
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
                  className="min-h-[300px] w-full resize-none rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="pt-10 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                <MessageSquare className="size-3.5" />
                Comments
              </div>
              
              <CommentsList 
                comments={comments} 
                agents={agents} 
                onDelete={handleDeleteComment} 
              />

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a comment for the team..."
                  className="min-h-[80px] w-full resize-none bg-transparent text-sm outline-none"
                />
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={handlePostComment}
                    disabled={!newComment.trim() || isPostingComment}
                  >
                    {isPostingComment ? <Loader2 className="size-3.5 animate-spin" /> : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Properties</h3>
              <div className="space-y-4">
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
                  <label className="text-xs font-medium text-muted-foreground">Updated</label>
                  <span className="text-xs font-semibold text-foreground">{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-16 space-y-8">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <FolderKanban className="size-5 text-primary" />
               <h2 className="text-xl font-bold tracking-tight">Project Issues</h2>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map(statusVal => {
              const statusIssues = issues.filter(i => i.status === statusVal);
              return (
                <div key={statusVal} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{STATUS_LABELS[statusVal]}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground/60">{statusIssues.length}</span>
                    </div>
                    <button onClick={() => handleCreateIssue(statusVal)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {statusIssues.map(issue => (
                      <Link key={issue.id} href={`/teams/${teamId}/projects/${projectId}/issues/${issue.id}`}
                        className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[8px] font-mono font-medium text-muted-foreground/50">ISS-{issue.id.substring(0,4).toUpperCase()}</span>
                          <PriorityIcon priority={issue.priority} />
                        </div>
                        <p className={cn("text-xs font-medium text-foreground", issue.status === 4 && "text-muted-foreground line-through")}>{issue.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
