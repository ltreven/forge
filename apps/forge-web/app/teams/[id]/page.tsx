"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bot, FolderKanban, Plus, Activity, AlertCircle, CheckCircle2, ChevronRight, Crown
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Team, Task, Agent, HealthStatus } from "@/lib/types";
import { StatusIcon, PriorityIcon } from "@/components/shared-ui";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

function computeHealth(a: Agent): HealthStatus {
  const k8s = a.k8sStatus;
  if (k8s === "running") return "online";
  if (k8s === "failed" || k8s === "terminated") return "offline";
  return "starting";
}

export default function TeamDetailPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/agents?teamId=${teamId}`, { headers });
      if (res.ok) {
        const d = await res.json();
        const all: Agent[] = d.data ?? [];
        all.sort((a, b) => (a.type === "team_lead" ? -1 : b.type === "team_lead" ? 1 : 0));
        setAgents(all);
      }
    } catch {}
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}/activities`, { headers });
      if (res.ok) {
        const d = await res.json();
        setActivities(d.data ?? []);
      }
    } catch {}
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers }),
      fetchAgents(),
      fetchActivities(),
      fetch(`${API_BASE}/tasks/by-team/${teamId}`, { headers }),
    ])
      .then(async ([teamRes, _a, _act, tasksRes]) => {
        if (teamRes && teamRes.ok) {
          const d = await teamRes.json();
          setTeam(d.data);
        } else if (teamRes && !teamRes.ok) {
          toast.error("Team not found.");
          router.replace("/teams");
        }
        
        if (tasksRes && tasksRes.ok) {
          const d = await tasksRes.json();
          setTasks(d.data ?? []);
        }
      })
      .finally(() => setIsLoading(false));

    const intervalId = setInterval(() => {
      fetchAgents();
      fetchActivities();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [authLoading]);

  const submitNewTask = async (title: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ teamId, title, status: 1, priority: 1 }),
      });
      if (!res.ok) throw new Error();
      const newTask = (await res.json()).data;
      setTasks(p => [newTask, ...p]);
      toast.success("Task created");
    } catch { toast.error("Failed to create task"); }
    setIsTaskDialogOpen(false);
    setNewTaskTitle("");
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!team) return null;

  const teamLead = agents.find((a) => a.type === "team_lead");
  const otherAgents = agents.filter((a) => a.type !== "team_lead");
  const activeTasks = tasks.filter(t => t.status >= 1 && t.status <= 4).sort((a,b) => b.priority - a.priority);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/teams" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="size-3.5" />
        Back to Teams
      </Link>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
              {team.icon || "🛡️"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          </div>
          {team.mission && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {team.mission}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/teams/${teamId}/settings`}>Settings</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                New Request
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { setNewTaskTitle("[Bug] "); setIsTaskDialogOpen(true); }}>
                <AlertCircle className="mr-2 size-4" />
                Bug Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewTaskTitle("[Feature] "); setIsTaskDialogOpen(true); }}>
                <Plus className="mr-2 size-4" />
                Feature Request
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewTaskTitle("[Investigate] "); setIsTaskDialogOpen(true); }}>
                <Activity className="mr-2 size-4" />
                Investigation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setNewTaskTitle(""); setIsTaskDialogOpen(true); }}>
                <FolderKanban className="mr-2 size-4" />
                Generic Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Manager Actions Area */}
      <section className="mb-8 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Manager Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agents</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{agents.filter(a => computeHealth(a) === "online").length}/{agents.length}</span>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Tasks</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{activeTasks.length}</span>
              <span className="text-xs text-muted-foreground">in pipeline</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">All systems operational</p>
              <p className="text-xs text-muted-foreground">Your squad is ready for tasks.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Team Work */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b px-5 py-4 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <FolderKanban className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Team Work</h3>
              </div>
            </div>
            <div className="divide-y">
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No active tasks in the pipeline.
                </div>
              ) : (
                activeTasks.map(task => (
                  <Link 
                    key={task.id} 
                    href={`/teams/${teamId}/tasks/${task.identifier}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono text-muted-foreground">{task.identifier}</span>
                      <StatusIcon status={task.status} />
                      <span className="text-sm font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 sm:ml-auto">
                      <PriorityIcon priority={task.priority} />
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Agents & Activity */}
        <div className="space-y-6">
          <section className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Squad</h3>
              </div>
              <Link href={`/teams/${teamId}/agents/new`} className="text-xs font-medium text-primary hover:underline">
                Add Agent
              </Link>
            </div>
            <div className="p-2">
              {[teamLead, ...otherAgents].filter(Boolean).map((agent) => {
                if (!agent) return null;
                const health = computeHealth(agent);
                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="relative">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-lg">
                        {agent.icon || "🤖"}
                      </div>
                      <span className={cn(
                        "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card",
                        health === "online" ? "bg-emerald-500" : health === "starting" ? "bg-amber-500 animate-pulse" : "bg-red-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{agent.name}</span>
                        {agent.type === "team_lead" && <Crown className="size-3 text-amber-500" />}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize block truncate">
                        {agent.type.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4 flex items-center gap-2 bg-muted/20">
              <Activity className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Recent Activity</h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                activities.slice(0, 5).map((act) => {
                  const isHuman = act.actorType === "human";
                  const agent = isHuman ? null : agents.find((a) => a.id === act.actorId);
                  const title = act.payload?.title || act.entityId.substring(0, 8);
                  
                  return (
                    <div key={act.id} className="flex gap-3 items-start">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                        {isHuman ? "👤" : (agent?.icon || "🤖")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-tight">
                          <span className="font-medium text-foreground">{isHuman ? "You" : agent?.name || "Agent"}</span>
                          <span className="text-muted-foreground"> updated </span>
                          <span className="font-medium text-foreground">{title}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {isTaskDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg border">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <input 
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  submitNewTask(newTaskTitle);
                } else if (e.key === "Escape") {
                  setIsTaskDialogOpen(false);
                }
              }}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => newTaskTitle.trim() && submitNewTask(newTaskTitle)}>Create Task</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
