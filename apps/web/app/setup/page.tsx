"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type PmProvider = "linear" | "jira" | "trello";

const PM_PROVIDERS: { key: PmProvider; label: string; icon: string }[] = [
  { key: "linear", label: "Linear", icon: "◆" },
  { key: "jira", label: "Jira", icon: "🔵" },
  { key: "trello", label: "Trello", icon: "🟦" },
];

// project_manager excluded from dropdown — it's always the fixed Forge PM row.
const AGENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "software_engineer", label: "Software Engineer" },
  { value: "software_architect", label: "Software Architect" },
  { value: "product_manager", label: "Product Manager" },
];

interface GitHubRepo {
  repoUrl: string;
  appId: string;
  privateKey: string;
  installationId: string;
  webhookSecret: string;
  expanded: boolean;
}

const emptyRepo = (): GitHubRepo => ({
  repoUrl: "",
  appId: "",
  privateKey: "",
  installationId: "",
  webhookSecret: "",
  expanded: true,
});

export default function SetupPage() {
  const { t } = useTranslation();
  const { token, teamId } = useAuth();
  const router = useRouter();

  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // If a team already exists (from signup wizard), we PUT instead of POST
  const [existingTeamId, setExistingTeamId] = useState<string | null>(teamId);

  // ── Section 1: Team Details ────────────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [mission, setMission] = useState("");
  const [forgePmName, setForgePmName] = useState("Forge PM");
  const [teamAgents, setTeamAgents] = useState<{ id?: string; name: string; type: string }[]>([]);

  // ── Section 2: PM Integration ──────────────────────────────────────────────
  const [pmProvider, setPmProvider] = useState<PmProvider | null>(null);
  const [pmApiKey, setPmApiKey] = useState("");

  // ── Section 3: GitHub ──────────────────────────────────────────────────────
  const [repos, setRepos] = useState<GitHubRepo[]>([emptyRepo()]);

  // ── Load existing team data on mount ──────────────────────────────────────
  useEffect(() => {
    const loadTeam = async () => {
      const id = teamId;
      if (!id) {
        setIsLoadingTeam(false);
        return;
      }
      try {
        const authHeaders = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Parallel fetch: team data + agents + integrations
        const [teamRes, agentsRes, integrationsRes] = await Promise.all([
          fetch(`${API_BASE}/teams/${id}`, { headers: authHeaders }),
          fetch(`${API_BASE}/agents?teamId=${id}`, { headers: authHeaders }),
          fetch(`${API_BASE}/teams/${id}/integrations`, { headers: authHeaders }),
        ]);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          const team = teamData.data;
          setTeamName(team.name ?? "");
          setMission(team.mission ?? "");
          setExistingTeamId(team.id);
        }

        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          const allAgents: { id: string; name: string; type: string }[] = agentsData.data ?? [];
          const pm = allAgents.find((a) => a.type === "project_manager");
          const others = allAgents.filter((a) => a.type !== "project_manager");
          if (pm) setForgePmName(pm.name);
          setTeamAgents(others);
        }

        if (integrationsRes.ok) {
          const intData = await integrationsRes.json();
          const integrations: { provider: string; apiKey: string; metadata?: Record<string, string> }[] =
            intData.data ?? [];

          // Restore PM integration
          const pm = integrations.find((i) =>
            ["linear", "jira", "trello"].includes(i.provider)
          );
          if (pm) {
            setPmProvider(pm.provider as PmProvider);
            setPmApiKey(pm.apiKey ?? "");
          }

          // Restore GitHub integrations
          const githubs = integrations.filter((i) => i.provider === "github");
          if (githubs.length > 0) {
            setRepos(
              githubs.map((g) => ({
                repoUrl: g.metadata?.repoUrl ?? "",
                appId: g.metadata?.appId ?? "",
                privateKey: g.apiKey ?? "",
                installationId: g.metadata?.installationId ?? "",
                webhookSecret: g.metadata?.webhookSecret ?? "",
                expanded: false,
              }))
            );
          }
        }
      } catch {
        // Non-fatal — user can still fill the form manually
      } finally {
        setIsLoadingTeam(false);
      }
    };

    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Agents helpers ─────────────────────────────────────────────────────────
  const addAgent = () =>
    setTeamAgents((prev) => [...prev, { name: "", type: "software_engineer" }]);
  const removeAgent = (i: number) =>
    setTeamAgents((prev) => prev.filter((_, idx) => idx !== i));
  const updateAgent = (i: number, field: "name" | "type", value: string) =>
    setTeamAgents((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
    );

  // ── Repo helpers ───────────────────────────────────────────────────────────
  const addRepo = () => setRepos((prev) => [...prev, emptyRepo()]);
  const removeRepo = (i: number) =>
    setRepos((prev) => prev.filter((_, idx) => idx !== i));
  const updateRepo = <K extends keyof GitHubRepo>(
    i: number,
    field: K,
    value: GitHubRepo[K]
  ) =>
    setRepos((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  const toggleRepo = (i: number) =>
    setRepos((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, expanded: !r.expanded } : r))
    );

  // ── Progress ───────────────────────────────────────────────────────────────
  const section1Complete = teamName.trim().length > 0 && mission.trim().length > 0;
  const section2Complete = pmProvider !== null && pmApiKey.trim().length > 0;
  const section3Complete =
    repos.length > 0 &&
    repos.every(
      (r) =>
        r.repoUrl.trim() &&
        r.appId.trim() &&
        r.privateKey.trim() &&
        r.installationId.trim()
    );

  const steps = [
    { label: t.setup.section1.title, complete: section1Complete },
    { label: t.setup.section2.title, complete: section2Complete },
    { label: t.setup.section3.title, complete: section3Complete },
  ];

  const canSubmit = section1Complete;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please complete at least team details before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const authHeaders = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const allAgents = [
        { name: forgePmName || "Forge PM", type: "project_manager" },
        ...teamAgents.filter((a) => a.name.trim()),
      ];

      let teamId = existingTeamId;

      if (teamId) {
        // Team already exists — update it
        await fetch(`${API_BASE}/teams/${teamId}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ name: teamName, mission }),
        });
      } else {
        // Create a brand new team
        const teamRes = await fetch(`${API_BASE}/teams`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ name: teamName, mission, agents: allAgents }),
        });
        const teamData = await teamRes.json();
        if (!teamRes.ok) {
          toast.error(apiErrorMessage(teamData.error, "Failed to create team."));
          return;
        }
        teamId = teamData.data.team.id as string;
        setExistingTeamId(teamId);
      }

      // Save PM integration
      if (pmProvider && pmApiKey.trim()) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ provider: pmProvider, apiKey: pmApiKey }),
        });
      }

      // Save GitHub integrations — one per repo
      const validRepos = repos.filter((r) => r.repoUrl.trim() && r.appId.trim());
      for (const repo of validRepos) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            provider: "github",
            apiKey: repo.privateKey,
            metadata: {
              repoUrl: repo.repoUrl,
              appId: repo.appId,
              installationId: repo.installationId,
              webhookSecret: repo.webhookSecret,
            },
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoadingTeam) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading your team data…</p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
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
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t.setup.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{t.setup.subtitle}</p>
      </div>

      {/* Existing team banner */}
      {existingTeamId && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2 text-sm text-primary">
          <Check className="size-4 shrink-0" />
          <span>
            Data pre-loaded from your onboarding session. Review and update as needed.
          </span>
        </div>
      )}

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
            <span
              className={cn(
                "text-sm font-medium hidden sm:block",
                s.complete ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "hidden sm:block h-px w-8 ml-1",
                  s.complete ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Section 1: Team Details ── */}
        <section
          id="setup-section-team"
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
                section1Complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {section1Complete ? <Check className="size-4" /> : "1"}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {t.setup.section1.title}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-team-name" className="text-sm font-medium">
                  {t.setup.section1.teamNameLabel}
                </label>
                <Input
                  id="setup-team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={t.setup.section1.teamNamePlaceholder}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-mission" className="text-sm font-medium">
                  {t.setup.section1.missionLabel}
                </label>
                <Input
                  id="setup-mission"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder={t.setup.section1.missionPlaceholder}
                />
              </div>
            </div>

            {/* Agents */}
            <div>
              <p className="mb-3 text-sm font-medium">{t.setup.section1.agentsTitle}</p>
              <div className="flex flex-col gap-2">
                {/* Fixed Forge PM row (project_manager) */}
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <span className="text-lg select-none">🤖</span>
                  <Input
                    id="setup-pm-name"
                    value={forgePmName}
                    onChange={(e) => setForgePmName(e.target.value)}
                    className="flex-1 h-8 text-sm border-primary/30 bg-transparent focus-visible:ring-primary/40"
                    placeholder="Forge PM"
                  />
                  <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {t.setup.section1.pmFixedBadge}
                  </span>
                </div>

                {/* Additional agents */}
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
                      {AGENT_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAgent(i)}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t.setup.section1.removeAgent}
                    >
                      <Trash2 className="size-4" />
                    </button>
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
        <section
          id="setup-section-pm"
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
                section2Complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {section2Complete ? <Check className="size-4" /> : "2"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t.setup.section2.title}
              </h2>
              <p className="text-sm text-muted-foreground">{t.setup.section2.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
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
                <label htmlFor="setup-pm-apikey" className="text-sm font-medium">
                  {t.setup.section2.apiKeyLabel}
                </label>
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
        <section
          id="setup-section-github"
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
                section3Complete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
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

          <div className="flex flex-col gap-3">
            {repos.map((repo, i) => (
              <div
                key={i}
                id={`setup-repo-card-${i}`}
                className="rounded-xl border border-border bg-background"
              >
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {repo.repoUrl.trim()
                      ? repo.repoUrl
                      : `${t.setup.section3.repoCardDefault} ${i + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleRepo(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {repo.expanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                  {repos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRepo(i)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={t.setup.section3.removeRepo}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Expandable fields */}
                {repo.expanded && (
                  <div className="flex flex-col gap-3 border-t border-border px-4 pb-4 pt-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-url-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.setup.section3.repoUrlLabel}
                      </label>
                      <Input
                        id={`repo-url-${i}`}
                        value={repo.repoUrl}
                        onChange={(e) => updateRepo(i, "repoUrl", e.target.value)}
                        placeholder={t.setup.section3.repoPlaceholder}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`repo-appid-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t.setup.section3.appIdLabel}
                        </label>
                        <Input
                          id={`repo-appid-${i}`}
                          value={repo.appId}
                          onChange={(e) => updateRepo(i, "appId", e.target.value)}
                          placeholder={t.setup.section3.appIdPlaceholder}
                        />
                        <p className="text-xs text-muted-foreground">{t.setup.section3.appIdHint}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`repo-installation-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t.setup.section3.installationIdLabel}
                        </label>
                        <Input
                          id={`repo-installation-${i}`}
                          value={repo.installationId}
                          onChange={(e) => updateRepo(i, "installationId", e.target.value)}
                          placeholder={t.setup.section3.installationIdPlaceholder}
                        />
                        <p className="text-xs text-muted-foreground">{t.setup.section3.installationIdHint}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-privkey-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.setup.section3.privateKeyLabel}
                      </label>
                      <textarea
                        id={`repo-privkey-${i}`}
                        value={repo.privateKey}
                        onChange={(e) => updateRepo(i, "privateKey", e.target.value)}
                        placeholder={t.setup.section3.privateKeyPlaceholder}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      />
                      <p className="text-xs text-muted-foreground">{t.setup.section3.privateKeyHint}</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-webhook-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.setup.section3.webhookSecretLabel}
                        <span className="ml-1 font-normal normal-case text-muted-foreground/70">
                          ({t.setup.section3.optional})
                        </span>
                      </label>
                      <Input
                        id={`repo-webhook-${i}`}
                        value={repo.webhookSecret}
                        onChange={(e) => updateRepo(i, "webhookSecret", e.target.value)}
                        placeholder={t.setup.section3.webhookSecretPlaceholder}
                        type="password"
                      />
                      <p className="text-xs text-muted-foreground">{t.setup.section3.webhookSecretHint}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button
              id="setup-add-repo"
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 self-start"
              onClick={addRepo}
            >
              <Plus className="size-3.5" />
              {t.setup.section3.addRepo}
            </Button>
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
          {isSubmitting
            ? t.setup.creating
            : existingTeamId
            ? t.setup.saveChanges
            : t.setup.createTeam}
        </Button>
      </div>
    </div>
  );
}
