"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Cpu, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Template = "starter" | "engineering";
type RoleKey  = "engineer" | "architect" | "pm";

const AGENT_TYPE_MAP: Record<RoleKey, string> = {
  engineer: "software_engineer",
  architect: "software_architect",
  pm:        "product_manager",
};

const ROLE_EMOJIS: Record<RoleKey, string> = {
  engineer: "🛠️",
  architect: "🏛️",
  pm:        "📋",
};

const ROLES: { key: RoleKey; title: string; description: string }[] = [
  { key: "engineer",  title: "Software Engineer",   description: "Codes features, fixes bugs, writes tests and reviews PRs." },
  { key: "architect", title: "Software Architect",  description: "Designs systems, guards technical standards, makes key tech decisions." },
  { key: "pm",        title: "Product Manager",     description: "Owns the roadmap, writes specs, coordinates delivery with the team." },
];

const TEMPLATES = [
  {
    key:        "starter" as Template,
    icon:       "🧩",
    title:      "Forge Starter",
    description: "Just a Team Lead to get you going. Simple and flexible.",
  },
  {
    key:        "engineering" as Template,
    icon:       "💻",
    title:      "Engineering",
    description: "Full software delivery squad with SDLC discipline.",
  },
  {
    key:        "customer_support",
    icon:       "🎧",
    title:      "Customer Support",
    description: "Automated support team.",
    comingSoon: true,
  },
];

// ── Quantity Control (same as signup) ─────────────────────────────────────────

function QuantityControl({ value, onChange, id }: {
  value: number; onChange: (v: number) => void; id: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" id={`${id}-decrease`} disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
        <Minus className="size-3.5" />
      </button>
      <span className={cn("w-6 text-center text-sm font-semibold tabular-nums", value > 0 ? "text-primary" : "text-muted-foreground")}>
        {value}
      </span>
      <button type="button" id={`${id}-increase`} disabled={value >= 5}
        onClick={() => onChange(Math.min(5, value + 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ step, steps }: { step: number; steps: string[] }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const idx      = i + 1;
        const isDone   = step > idx;
        const isCurrent = step === idx;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                isDone    ? "border-primary bg-primary text-primary-foreground"
                : isCurrent ? "border-primary bg-background text-primary"
                : "border-border bg-background text-muted-foreground"
              )}>
                {isDone ? <Check className="size-4" /> : idx}
              </div>
              <span className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("mx-2 mb-5 h-px w-10 transition-colors", step > idx ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NewTeamPage() {
  const { token }   = useAuth();
  const router      = useRouter();

  // Step state: starter = 2 steps, engineering = 3 steps
  const [step, setStep]                   = useState(1);
  const [selected, setSelected]           = useState<Template | null>(null);
  const [teamName, setTeamName]           = useState("");
  const [teamLeadName, setTeamLeadName]   = useState("Forge Team Lead");
  const [isCreating, setIsCreating]       = useState(false);

  // Engineering squad state
  const [quantities, setQuantities] = useState<Record<RoleKey, number>>({ engineer: 1, architect: 0, pm: 0 });
  const [agentNames, setAgentNames] = useState<Record<RoleKey, string[]>>({ engineer: ["Alice"], architect: [], pm: [] });

  const totalSteps = selected === "engineering" ? 3 : 2;
  const totalAgents = Object.values(quantities).reduce((a, b) => a + b, 0) + 1; // +1 for team lead

  const stepLabels =
    selected === "engineering"
      ? ["Template", "Details", "Squad"]
      : ["Template", "Details"];

  const updateQuantity = useCallback((role: RoleKey, qty: number) => {
    setQuantities((prev) => ({ ...prev, [role]: qty }));
    setAgentNames((prev) => {
      const current = prev[role];
      if (qty > current.length) return { ...prev, [role]: [...current, ...Array(qty - current.length).fill("")] };
      return { ...prev, [role]: current.slice(0, qty) };
    });
  }, []);

  const buildAgents = () => {
    if (selected === "starter") {
      return [{ name: teamLeadName || "Forge Team Lead", type: "team_lead" }];
    }
    // Engineering
    const result: { name: string; type: string }[] = [
      { name: teamLeadName || "Forge Team Lead", type: "team_lead" },
    ];
    (["engineer", "architect", "pm"] as RoleKey[]).forEach((role) => {
      for (let i = 0; i < quantities[role]; i++) {
        const roleDef = ROLES.find((r) => r.key === role)!;
        result.push({
          name: agentNames[role][i] || `${roleDef.title} ${i + 1}`,
          type: AGENT_TYPE_MAP[role],
        });
      }
    });
    return result;
  };

  const handleCreate = async () => {
    if (!teamName.trim()) { toast.error("Team name is required."); return; }
    if (!selected || !token) return;
    setIsCreating(true);
    try {
      const r = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: teamName.trim(),
          template: selected,
          agents: buildAgents(),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error(err?.error?.message ?? "Failed to create team.");
        return;
      }
      const d = await r.json();
      toast.success("Team created!");
      router.push(`/teams/${d.data?.team?.id ?? d.data?.id}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps) as 1 | 2 | 3);
  const goBack = () => {
    if (step === 1) { router.push("/teams"); return; }
    setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Cpu className="size-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create a New Team</h1>
            <p className="mt-1 text-sm text-muted-foreground">Set up your agent team in a few steps.</p>
          </div>
        </div>

        {/* Stepper — show after template is chosen */}
        {step > 1 && <Stepper step={step} steps={stepLabels} />}

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

          {/* ── Step 1: Template picker ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4" id="newteam-step-1">
              <div>
                <h2 className="font-semibold text-foreground">Choose a template</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick the type of team you want to create.</p>
              </div>

              <div className="flex flex-col gap-3">
                {TEMPLATES.map((tmpl) => {
                  const isSelected  = selected === tmpl.key;
                  const isAvailable = !tmpl.comingSoon;
                  return (
                    <button key={tmpl.key}
                      id={`newteam-template-${tmpl.key}`}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && setSelected(tmpl.key as Template)}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        !isAvailable ? "border-border opacity-40 cursor-not-allowed"
                          : isSelected  ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40"
                      )}>
                      <span className="text-2xl select-none">{tmpl.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {tmpl.title}
                          </p>
                          {tmpl.comingSoon && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Soon</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tmpl.description}</p>
                      </div>
                      {isSelected && <Check className="size-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={goBack}>
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>
                <Button id="newteam-step1-next" type="button" className="flex-1 font-semibold"
                  disabled={!selected} onClick={goNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Team details ── */}
          {step === 2 && selected && (
            <div className="flex flex-col gap-4" id="newteam-step-2">
              <div>
                <h2 className="font-semibold text-foreground">
                  {selected === "starter" ? "Forge Starter — Team Setup" : "Engineering — Team Setup"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give your team a name and name your Team Lead.
                </p>
              </div>

              {/* Team name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newteam-name" className="text-sm font-medium">Team name</label>
                <Input id="newteam-name" value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Operations, Research, Platform…"
                  autoFocus />
              </div>

              {/* Forge Team Lead */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Forge Team Lead</p>
                    <p className="text-xs text-muted-foreground">Coordinates the team and owns delivery.</p>
                  </div>
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    Required
                  </span>
                </div>
                <Input id="newteam-lead-name" value={teamLeadName}
                  onChange={(e) => setTeamLeadName(e.target.value)}
                  placeholder="Forge Team Lead" className="h-8 text-sm" />
              </div>

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={goBack}>Back</Button>
                {selected === "starter" ? (
                  <Button id="newteam-launch-starter" type="button" className="flex-1 font-semibold"
                    disabled={isCreating || !teamName.trim()} onClick={handleCreate}>
                    {isCreating ? "Creating…" : "🚀 Launch Team"}
                  </Button>
                ) : (
                  <Button id="newteam-step2-next" type="button" className="flex-1 font-semibold"
                    disabled={!teamName.trim()} onClick={goNext}>
                    Next: Squad →
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Engineering squad builder ── */}
          {step === 3 && selected === "engineering" && (
            <div className="flex flex-col gap-4" id="newteam-step-3">
              <div>
                <h2 className="font-semibold text-foreground">Engineering Squad</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose how many of each role you want on the team.
                </p>
              </div>

              {/* Fixed Team Lead reminder */}
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <span className="text-xl">🤖</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{teamLeadName || "Forge Team Lead"}</p>
                  <p className="text-xs text-muted-foreground">Team Lead · always included</p>
                </div>
                <span className="text-xs font-bold text-primary">×1</span>
              </div>

              {/* Role pickers */}
              <div className="flex flex-col gap-3">
                {ROLES.map((role) => {
                  const qty        = quantities[role.key];
                  const isSelected = qty > 0;
                  return (
                    <div key={role.key} className="flex flex-col gap-2">
                      <div id={`newteam-role-${role.key}`}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border p-4 transition-all",
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40"
                        )}>
                        <span className="text-2xl select-none">{ROLE_EMOJIS[role.key]}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {role.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{role.description}</p>
                        </div>
                        <QuantityControl id={`role-${role.key}`} value={qty}
                          onChange={(v) => updateQuantity(role.key, v)} />
                      </div>

                      {/* Name inputs for each agent of this role */}
                      {qty > 0 && (
                        <div className="flex flex-col gap-2 pl-4">
                          {Array.from({ length: qty }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                              <Input
                                id={`agent-name-${role.key}-${i}`}
                                value={agentNames[role.key][i] ?? ""}
                                onChange={(e) => {
                                  const newNames = [...agentNames[role.key]];
                                  newNames[i] = e.target.value;
                                  setAgentNames((prev) => ({ ...prev, [role.key]: newNames }));
                                }}
                                placeholder={`${role.title} name`}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total squad size</span>
                <span className="text-sm font-bold text-primary">{totalAgents} agents</span>
              </div>

              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={goBack}>Back</Button>
                <Button id="newteam-launch-engineering" type="button" className="flex-1 font-semibold"
                  disabled={isCreating} onClick={handleCreate}>
                  {isCreating ? "Creating…" : "🚀 Launch Team"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Back to teams link */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Changed your mind?{" "}
          <Link href="/teams" id="newteam-cancel" className="font-medium text-primary hover:underline">
            Back to My Teams
          </Link>
        </p>
      </div>
    </div>
  );
}
