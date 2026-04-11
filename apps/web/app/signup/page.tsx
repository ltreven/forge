"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Cpu, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

type RoleKey = "engineer" | "architect" | "pm";

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

function QuantityControl({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        id={`${id}-decrease`}
        aria-label="Decrease"
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="size-3.5" />
      </button>
      <span
        className={cn(
          "w-8 text-center text-sm font-bold tabular-nums transition-colors",
          value > 0 ? "text-primary" : "text-muted-foreground"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        id={`${id}-increase`}
        aria-label="Increase"
        onClick={() => onChange(Math.min(10, value + 1))}
        className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export default function SignupPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [quantities, setQuantities] = useState<Record<RoleKey, number>>({
    engineer: 1,
    architect: 0,
    pm: 0,
  });

  const totalAgents = Object.values(quantities).reduce((a, b) => a + b, 0);
  const canLaunch = totalAgents > 0;

  const stepLabels = [
    t.signup.steps.account,
    t.signup.steps.workspace,
    t.signup.steps.team,
  ];

  const roles: { key: RoleKey; emoji: string }[] = [
    { key: "engineer", emoji: "⚙️" },
    { key: "architect", emoji: "🏗️" },
    { key: "pm", emoji: "📋" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md"
          >
            <Cpu className="size-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.signup.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.signup.subtitle}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center">
          {stepLabels.map((label, i) => {
            const idx = i + 1;
            const isDone = step > idx;
            const isCurrent = step === idx;
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      isDone ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : idx}
                  </div>
                  <span className={cn("text-xs font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div className={cn("mx-2 mb-5 h-px w-12 transition-colors", step > idx ? "bg-primary" : "bg-border")} />
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
                <Button id="signup-google" variant="outline" className="w-full gap-2 font-medium">
                  <GoogleIcon />{t.login.google}
                </Button>
                <Button id="signup-microsoft" variant="outline" className="w-full gap-2 font-medium">
                  <MicrosoftIcon />{t.login.microsoft}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">{t.signup.step1.orSignUpWith}</span>
                <Separator className="flex-1" />
              </div>
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-name" className="text-sm font-medium">{t.signup.step1.nameLabel}</label>
                  <Input id="signup-name" placeholder={t.signup.step1.namePlaceholder} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-email" className="text-sm font-medium">{t.signup.step1.emailLabel}</label>
                  <Input id="signup-email" type="email" placeholder={t.signup.step1.emailPlaceholder} />
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
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-workspace" className="text-sm font-medium">{t.signup.step2.workspaceLabel}</label>
                  <Input id="signup-workspace" placeholder={t.signup.step2.workspacePlaceholder} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-cluster" className="text-sm font-medium">{t.signup.step2.clusterLabel}</label>
                  <Input id="signup-cluster" placeholder={t.signup.step2.clusterPlaceholder} />
                </div>
                <div className="flex gap-2 mt-1">
                  <Button id="signup-step2-back" type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    {t.signup.step2.back}
                  </Button>
                  <Button id="signup-step2-next" type="submit" className="flex-1 font-semibold">
                    {t.signup.step2.next}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 3: Agent Squad ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4" id="signup-step-3">
              <div>
                <h2 className="font-semibold text-foreground">{t.signup.step3.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.signup.step3.subtitle}</p>
              </div>

              <div className="flex flex-col gap-3">
                {roles.map(({ key, emoji }) => {
                  const role = t.signup.step3.roles[key];
                  const qty = quantities[key];
                  const isSelected = qty > 0;
                  return (
                    <div
                      key={key}
                      id={`signup-role-${key}`}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border p-4 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-primary/40"
                      )}
                    >
                      <span className="text-2xl select-none">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                          {role.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {role.description}
                        </p>
                      </div>
                      <QuantityControl
                        id={`role-${key}`}
                        value={qty}
                        onChange={(v) => setQuantities((prev) => ({ ...prev, [key]: v }))}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Total summary */}
              {totalAgents > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total squad size</span>
                  <span className="text-sm font-bold text-primary">
                    {totalAgents} {t.signup.step3.agentsLabel}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <Button
                  id="signup-step3-back"
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  {t.signup.step3.back}
                </Button>
                <Button
                  id="signup-launch"
                  type="button"
                  className="flex-1 font-semibold"
                  disabled={!canLaunch}
                  onClick={() => {}}
                >
                  {t.signup.step3.launch}
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
