"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Cpu, Eye, EyeOff, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type Template = "starter" | "engineering";

// Engineering roles
type RoleKey = "engineer" | "architect" | "pm";

const AGENT_TYPE_MAP: Record<RoleKey, string> = {
  engineer: "software_engineer",
  architect: "software_architect",
  pm: "product_manager",
};

const ROLE_EMOJIS: Record<RoleKey, string> = {
  engineer: "🛠️",
  architect: "🏛️",
  pm: "📋",
};

// Total signup steps per template
// Starter: 1 (account) + 2 (workspace) + 3 (template) + 4 (starter config) = 4
// Engineering: same but step 4 is engineering squad
const TOTAL_STEPS = 4;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}

function QuantityControl({ value, onChange, id }: { value: number; onChange: (v: number) => void; id: string }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" id={`${id}-decrease`} aria-label="Decrease" disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
        <Minus className="size-3.5" />
      </button>
      <span className={cn("w-6 text-center text-sm font-semibold tabular-nums", value > 0 ? "text-primary" : "text-muted-foreground")}>
        {value}
      </span>
      <button type="button" id={`${id}-increase`} aria-label="Increase" disabled={value >= 5}
        onClick={() => onChange(Math.min(5, value + 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export default function SignupPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 — Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — Workspace
  const [workspaceName, setWorkspaceName] = useState("");

  // Step 3 — Template selector
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Step 4 — Starter config
  const [starterTeamName, setStarterTeamName] = useState("");
  const [starterTeamLead, setStarterTeamLead] = useState("");

  // Step 4 — Engineering config
  const [forgePmName, setForgePmName] = useState("Forge PM");
  const [quantities, setQuantities] = useState<Record<RoleKey, number>>({ engineer: 1, architect: 0, pm: 0 });
  const [agentNames, setAgentNames] = useState<Record<RoleKey, string[]>>({ engineer: ["Alice"], architect: [], pm: [] });

  const roles: RoleKey[] = ["engineer", "architect", "pm"];
  const totalAgents = Object.values(quantities).reduce((a, b) => a + b, 0) + 1;

  const stepLabels = [t.signup.steps.account, t.signup.steps.workspace, t.signup.steps.team, selectedTemplate === "starter" ? "Forge Starter" : "Engineering"];

  const updateQuantity = (role: RoleKey, qty: number) => {
    setQuantities((prev) => ({ ...prev, [role]: qty }));
    setAgentNames((prev) => {
      const current = prev[role];
      if (qty > current.length) return { ...prev, [role]: [...current, ...Array(qty - current.length).fill("")] };
      return { ...prev, [role]: current.slice(0, qty) };
    });
  };

  const buildEngineeringAgents = () => {
    const result: { name: string; type: string }[] = [{ name: forgePmName || "Forge PM", type: "project_manager" }];
    roles.forEach((role) => {
      for (let i = 0; i < quantities[role]; i++) {
        result.push({ name: agentNames[role][i] || `${t.signup.step4Engineering.roles[role].title} ${i + 1}`, type: AGENT_TYPE_MAP[role] });
      }
    });
    return result;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const agents =
        selectedTemplate === "starter"
          ? [{ name: starterTeamLead || "Team Lead", type: "team_lead" }]
          : buildEngineeringAgents();

      const teamName =
        selectedTemplate === "starter" ? starterTeamName : workspaceName;

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          workspaceName,
          teamName,
          template: selectedTemplate,
          agents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(apiErrorMessage(data.error, "Signup failed. Please try again."));
        return;
      }

      login(data.data.token, data.data.user, data.data.teamId ?? null);
      toast.success("Team created! Redirecting…");
      router.replace("/teams");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Cpu className="size-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.signup.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.signup.subtitle}</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-0">
          {stepLabels.slice(0, step < 4 ? 3 : 4).map((label, i) => {
            const idx = i + 1;
            const isDone = step > idx;
            const isCurrent = step === idx;
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isDone ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent ? "border-primary bg-background text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}>
                    {isDone ? <Check className="size-4" /> : idx}
                  </div>
                  <span className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.slice(0, step < 4 ? 3 : 4).length - 1 && (
                  <div className={cn("mx-2 mb-5 h-px w-10 transition-colors", step > idx ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4" id="signup-step-1">
              <h2 className="font-semibold text-foreground">{t.signup.step1.title}</h2>

              <div className="flex flex-col gap-3">
                <Button id="signup-google" variant="outline" className="w-full gap-2 font-medium"
                  onClick={() => toast.info(t.signup.ssoComingSoon)} type="button">
                  <GoogleIcon /> {t.login.google}
                </Button>
                <Button id="signup-microsoft" variant="outline" className="w-full gap-2 font-medium"
                  onClick={() => toast.info(t.signup.ssoComingSoon)} type="button">
                  <MicrosoftIcon /> {t.login.microsoft}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">{t.signup.step1.orSignUpWith}</span>
                <Separator className="flex-1" />
              </div>

              <form className="flex flex-col gap-3" onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || !email.trim() || password.length < 8) {
                  toast.error("Please fill in all fields. Password must be at least 8 characters.");
                  return;
                }
                setStep(2);
              }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-name" className="text-sm font-medium">{t.signup.step1.nameLabel}</label>
                  <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.signup.step1.namePlaceholder} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-email" className="text-sm font-medium">{t.signup.step1.emailLabel}</label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.signup.step1.emailPlaceholder} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-password" className="text-sm font-medium">{t.signup.step1.passwordLabel}</label>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder={t.signup.step1.passwordPlaceholder}
                      className="pr-10" required minLength={8} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <Button id="signup-step1-next" type="submit" className="w-full font-semibold mt-1">
                  {t.signup.step1.next}
                </Button>
              </form>
            </div>
          )}

          {/* ── Step 2: Workspace ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4" id="signup-step-2">
              <h2 className="font-semibold text-foreground">{t.signup.step2.title}</h2>
              <form className="flex flex-col gap-3" onSubmit={(e) => {
                e.preventDefault();
                if (!workspaceName.trim()) { toast.error("Workspace name is required."); return; }
                setStep(3);
              }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-workspace" className="text-sm font-medium">{t.signup.step2.workspaceLabel}</label>
                  <Input id="signup-workspace" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder={t.signup.step2.workspacePlaceholder} required />
                </div>
                <div className="flex gap-2 mt-1">
                  <Button id="signup-step2-back" type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>{t.signup.step2.back}</Button>
                  <Button id="signup-step2-next" type="submit" className="flex-1 font-semibold">{t.signup.step2.next}</Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 3: Template Selector ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4" id="signup-step-3">
              <div>
                <h2 className="font-semibold text-foreground">{t.signup.step3.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.signup.step3.subtitle}</p>
              </div>

              <div className="flex flex-col gap-3">
                {(["starter", "engineering", "customer_support"] as const).map((key) => {
                  const tmpl = t.signup.step3.templates[key];
                  const isComingSoon = "comingSoon" in tmpl && tmpl.comingSoon;
                  const isSelected = selectedTemplate === key;
                  return (
                    <button key={key} id={`signup-template-${key}`} type="button" disabled={isComingSoon}
                      onClick={() => !isComingSoon && setSelectedTemplate(key as Template)}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                        isComingSoon ? "border-border opacity-50 cursor-not-allowed"
                          : isSelected ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40"
                      )}>
                      <span className="text-2xl select-none">{tmpl.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                            {tmpl.title}
                          </p>
                          {isComingSoon && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Coming Soon</span>
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
                <Button id="signup-step3-back" type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>{t.signup.step3.back}</Button>
                <Button id="signup-step3-next" type="button" className="flex-1 font-semibold"
                  disabled={!selectedTemplate}
                  onClick={() => selectedTemplate && setStep(4)}>
                  {t.signup.step3.next}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4a: Forge Starter Config ── */}
          {step === 4 && selectedTemplate === "starter" && (
            <div className="flex flex-col gap-4" id="signup-step-4-starter">
              <div>
                <h2 className="font-semibold text-foreground">{t.signup.step4Starter.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.signup.step4Starter.subtitle}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="starter-team-name" className="text-sm font-medium">{t.signup.step4Starter.teamNameLabel}</label>
                  <Input id="starter-team-name" value={starterTeamName} onChange={(e) => setStarterTeamName(e.target.value)}
                    placeholder={t.signup.step4Starter.teamNamePlaceholder} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="starter-team-lead" className="text-sm font-medium">{t.signup.step4Starter.teamLeadLabel}</label>
                  <Input id="starter-team-lead" value={starterTeamLead} onChange={(e) => setStarterTeamLead(e.target.value)}
                    placeholder={t.signup.step4Starter.teamLeadPlaceholder} />
                  <p className="text-xs text-muted-foreground">{t.signup.step4Starter.teamLeadHint}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <Button id="signup-step4-starter-back" type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>{t.signup.step4Starter.back}</Button>
                <Button id="signup-launch-starter" type="button" className="flex-1 font-semibold" disabled={isLoading || !starterTeamName.trim()} onClick={handleSubmit}>
                  {isLoading ? t.signup.creatingAccount : t.signup.step4Starter.launch}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4b: Engineering Squad Config ── */}
          {step === 4 && selectedTemplate === "engineering" && (
            <div className="flex flex-col gap-4" id="signup-step-4-engineering">
              <div>
                <h2 className="font-semibold text-foreground">{t.signup.step4Engineering.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.signup.step4Engineering.subtitle}</p>
              </div>

              {/* Fixed Forge Project Manager */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.signup.step4Engineering.forgePmTitle}</p>
                    <p className="text-xs text-muted-foreground">{t.signup.step4Engineering.forgePmHint}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    {t.signup.step4Engineering.pmFixedBadge}
                  </span>
                </div>
                <Input id="signup-pm-name" value={forgePmName} onChange={(e) => setForgePmName(e.target.value)}
                  placeholder="Forge PM" className="h-8 text-sm" />
              </div>

              {/* Optional roles */}
              <div className="flex flex-col gap-3">
                {roles.map((role) => {
                  const roleData = t.signup.step4Engineering.roles[role];
                  const qty = quantities[role];
                  const isSelected = qty > 0;
                  return (
                    <div key={role} className="flex flex-col gap-2">
                      <div id={`signup-role-${role}`} className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 transition-all",
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40"
                      )}>
                        <span className="text-2xl select-none">{ROLE_EMOJIS[role]}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>{roleData.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{roleData.description}</p>
                        </div>
                        <QuantityControl id={`role-${role}`} value={qty} onChange={(v) => updateQuantity(role, v)} />
                      </div>
                      {qty > 0 && (
                        <div className="flex flex-col gap-2 pl-4">
                          {Array.from({ length: qty }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                              <Input id={`agent-name-${role}-${i}`} value={agentNames[role][i] ?? ""}
                                onChange={(e) => {
                                  const newNames = [...agentNames[role]];
                                  newNames[i] = e.target.value;
                                  setAgentNames((prev) => ({ ...prev, [role]: newNames }));
                                }}
                                placeholder={`${roleData.title} name`} className="h-8 text-sm" />
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
                <span className="text-sm font-bold text-primary">{totalAgents} {t.signup.step4Engineering.agentsLabel}</span>
              </div>

              <div className="flex gap-2 mt-1">
                <Button id="signup-step4-eng-back" type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>
                  {t.signup.step4Engineering.back}
                </Button>
                <Button id="signup-launch-engineering" type="button" className="flex-1 font-semibold" disabled={isLoading} onClick={handleSubmit}>
                  {isLoading ? t.signup.creatingAccount : t.signup.step4Engineering.launch}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.signup.haveAccount}{" "}
          <Link href="/login" id="signup-signin-link" className="font-medium text-primary hover:underline">
            {t.signup.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
