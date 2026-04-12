"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, GitBranch, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

type PmProvider = "linear" | "jira" | "trello";

const PM_PROVIDERS: { key: PmProvider; label: string; icon: string }[] = [
  { key: "linear", label: "Linear", icon: "◆" },
  { key: "jira", label: "Jira", icon: "🔵" },
  { key: "trello", label: "Trello", icon: "🟦" },
];

const ROLE_LABELS: Record<string, string> = {
  software_engineer: "Software Engineer",
  software_architect: "Software Architect",
  product_manager: "Product Manager",
  project_manager: "Project Manager",
};

export default function SetupPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ── Section 1: Team Details ────────────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [mission, setMission] = useState("");
  const [waysOfWorking, setWaysOfWorking] = useState(
    "We follow trunk-based development with short-lived feature branches. All PRs require one human review. Tests are mandatory for every change. We document decisions in ADRs and keep the main branch always deployable."
  );
  const [teamAgents, setTeamAgents] = useState([
    { name: "Alice", type: "software_engineer" },
  ]);

  // ── Section 2: PM Integration ──────────────────────────────────────────────
  const [pmProvider, setPmProvider] = useState<PmProvider | null>(null);
  const [pmApiKey, setPmApiKey] = useState("");

  // ── Section 3: GitHub ──────────────────────────────────────────────────────
  const [githubPat, setGithubPat] = useState("");
  const [repos, setRepos] = useState([""]);

  const addAgent = () => setTeamAgents((prev) => [...prev, { name: "", type: "software_engineer" }]);
  const removeAgent = (i: number) => setTeamAgents((prev) => prev.filter((_, idx) => idx !== i));
  const updateAgent = (i: number, field: "name" | "type", value: string) => {
    setTeamAgents((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    );
  };

  const addRepo = () => setRepos((prev) => [...prev, ""]);
  const removeRepo = (i: number) => setRepos((prev) => prev.filter((_, idx) => idx !== i));
  const updateRepo = (i: number, value: string) => setRepos((prev) => prev.map((r, idx) => (idx === i ? value : r)));

  // Progress indicator
  const section1Complete = teamName.trim().length > 0 && mission.trim().length > 0;
  const section2Complete = pmProvider !== null && pmApiKey.trim().length > 0;
  const section3Complete = githubPat.trim().length > 0 && repos.some((r) => r.trim().length > 0);

  const steps = [
    { label: t.setup.section1.title, complete: section1Complete },
    { label: t.setup.section2.title, complete: section2Complete },
    { label: t.setup.section3.title, complete: section3Complete },
  ];

  const canSubmit = section1Complete;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please complete at least team details before creating.");
      return;
    }

    setIsSubmitting(true);
    try {
      const authHeaders = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Create team
      const teamRes = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: teamName,
          mission,
          waysOfWorking,
          agents: teamAgents.filter((a) => a.name.trim()),
        }),
      });

      const teamData = await teamRes.json();
      if (!teamRes.ok) {
        toast.error(teamData.error ?? "Failed to create team.");
        return;
      }

      const teamId = teamData.data.team.id as string;

      // Save PM integration
      if (pmProvider && pmApiKey.trim()) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ provider: pmProvider, apiKey: pmApiKey }),
        });
      }

      // Save GitHub integration
      if (githubPat.trim()) {
        const validRepos = repos.filter((r) => r.trim());
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            provider: "github",
            apiKey: githubPat,
            metadata: { repos: validRepos },
          }),
        });
      }

      setIsSuccess(true);
      toast.success(t.setup.successTitle);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
            <CheckCircle2 className="size-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.setup.successTitle}</h1>
            <p className="mt-2 text-muted-foreground">{t.setup.successSubtitle}</p>
          </div>
          <Button onClick={() => router.replace("/")} variant="outline" className="mt-2">
            Back to homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.setup.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.setup.subtitle}</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all",
                s.complete
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-border text-muted-foreground"
              )}
            >
              {s.complete ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium hidden sm:block", s.complete ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn("hidden sm:block h-px w-8 ml-1", s.complete ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Section 1: Team Details ── */}
        <section id="setup-section-team" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-lg text-sm font-bold",
              section1Complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {section1Complete ? <Check className="size-4" /> : "1"}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.setup.section1.title}</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-team-name" className="text-sm font-medium">{t.setup.section1.teamNameLabel}</label>
                <Input
                  id="setup-team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={t.setup.section1.teamNamePlaceholder}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-mission" className="text-sm font-medium">{t.setup.section1.missionLabel}</label>
                <Input
                  id="setup-mission"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder={t.setup.section1.missionPlaceholder}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="setup-wow" className="text-sm font-medium">{t.setup.section1.waysOfWorkingLabel}</label>
              <textarea
                id="setup-wow"
                value={waysOfWorking}
                onChange={(e) => setWaysOfWorking(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Agents */}
            <div>
              <p className="mb-3 text-sm font-medium">{t.setup.section1.agentsTitle}</p>
              <div className="flex flex-col gap-2">
                {teamAgents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      id={`setup-agent-name-${i}`}
                      value={agent.name}
                      onChange={(e) => updateAgent(i, "name", e.target.value)}
                      placeholder={t.setup.section1.agentNameLabel}
                      className="flex-1"
                    />
                    <select
                      id={`setup-agent-type-${i}`}
                      value={agent.type}
                      onChange={(e) => updateAgent(i, "type", e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    {teamAgents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAgent(i)}
                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t.setup.section1.removeAgent}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                id="setup-add-agent"
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={addAgent}
              >
                <Plus className="size-3.5" />
                {t.setup.section1.addAgent}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Section 2: PM Integration ── */}
        <section id="setup-section-pm" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-lg text-sm font-bold",
              section2Complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {section2Complete ? <Check className="size-4" /> : "2"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t.setup.section2.title}</h2>
              <p className="text-sm text-muted-foreground">{t.setup.section2.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Provider picker */}
            <div>
              <p className="mb-2 text-sm font-medium">{t.setup.section2.providerLabel}</p>
              <div className="flex gap-3">
                {PM_PROVIDERS.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    id={`setup-pm-${key}`}
                    type="button"
                    onClick={() => setPmProvider(key)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-4 text-sm font-medium transition-all",
                      pmProvider === key
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <span className="text-xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {pmProvider && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-pm-apikey" className="text-sm font-medium">{t.setup.section2.apiKeyLabel}</label>
                <Input
                  id="setup-pm-apikey"
                  value={pmApiKey}
                  onChange={(e) => setPmApiKey(e.target.value)}
                  placeholder={t.setup.section2.apiKeyPlaceholder}
                  type="password"
                />
                <p className="text-xs text-muted-foreground">
                  {pmProvider === "linear" && t.setup.section2.linearHint}
                  {pmProvider === "jira" && t.setup.section2.jiraHint}
                  {pmProvider === "trello" && t.setup.section2.trelloHint}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: GitHub Integration ── */}
        <section id="setup-section-github" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-lg text-sm font-bold",
              section3Complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {section3Complete ? <Check className="size-4" /> : "3"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <GitBranch className="size-4" />
                {t.setup.section3.title}
              </h2>
              <p className="text-sm text-muted-foreground">{t.setup.section3.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="setup-github-pat" className="text-sm font-medium">{t.setup.section3.patLabel}</label>
              <Input id="setup-github-pat" value={githubPat} onChange={(e) => setGithubPat(e.target.value)} placeholder={t.setup.section3.patPlaceholder} type="password" />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t.setup.section3.reposLabel}</p>
              <div className="flex flex-col gap-2">
                {repos.map((repo, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      id={`setup-repo-${i}`}
                      value={repo}
                      onChange={(e) => updateRepo(i, e.target.value)}
                      placeholder={t.setup.section3.repoPlaceholder}
                      className="flex-1"
                    />
                    {repos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRepo(i)}
                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t.setup.section3.removeRepo}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                id="setup-add-repo"
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={addRepo}
              >
                <Plus className="size-3.5" />
                {t.setup.section3.addRepo}
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Button
          id="setup-create-team"
          size="lg"
          disabled={!canSubmit || isSubmitting}
          onClick={handleSubmit}
          className="w-full font-semibold shadow-md"
        >
          {isSubmitting ? t.setup.creating : t.setup.createTeam}
        </Button>
      </div>
    </div>
  );
}
