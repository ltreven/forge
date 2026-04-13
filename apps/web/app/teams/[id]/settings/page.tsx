"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GitBranch,
  Loader2,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API_BASE } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PmProvider = "linear" | "jira" | "trello";

interface GitHubRepo {
  id?: string; // integration id if persisted
  repoUrl: string;
  appId: string;
  privateKey: string;
  installationId: string;
  webhookSecret: string;
  expanded: boolean;
}

const emptyRepo = (): GitHubRepo => ({
  repoUrl: "", appId: "", privateKey: "",
  installationId: "", webhookSecret: "", expanded: true,
});

// ── PM provider options ───────────────────────────────────────────────────────

const PM_PROVIDERS: { key: PmProvider; label: string; icon: string; available: boolean }[] = [
  { key: "linear",  label: "Linear",  icon: "◆", available: true  },
  { key: "jira",    label: "Jira",    icon: "🔵", available: false },
  { key: "trello",  label: "Trello",  icon: "🟦", available: false },
];

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ number, complete, title, subtitle }: {
  number: number; complete: boolean; title: string; subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
        complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {complete ? <Check className="size-4" /> : number}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamSettingsPage() {
  const { token, isLoading: authLoading } = useAuth();
  const params  = useParams();
  const router  = useRouter();
  const teamId  = String(params.id);

  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isSaving, setIsSaving]           = useState(false);
  const [saved, setSaved]                 = useState(false);

  // § 1 Identity
  const [teamName, setTeamName] = useState("");
  const [mission, setMission]   = useState("");

  // § 2 Project Management
  const [pmProvider, setPmProvider] = useState<PmProvider | null>(null);
  const [pmApiKey, setPmApiKey]     = useState("");
  const [pmIntId, setPmIntId]       = useState<string | null>(null);

  // § 3 GitHub repos
  const [repos, setRepos] = useState<GitHubRepo[]>([emptyRepo()]);

  // § 4 Documentation (Notion)
  const [notionKey, setNotionKey]   = useState("");
  const [notionIntId, setNotionIntId] = useState<string | null>(null);

  // ── Load team data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    Promise.all([
      fetch(`${API_BASE}/teams/${teamId}`, { headers }),
      fetch(`${API_BASE}/teams/${teamId}/integrations`, { headers }),
    ])
      .then(async ([teamRes, intRes]) => {
        if (teamRes.ok) {
          const d = await teamRes.json();
          setTeamName(d.data.name ?? "");
          setMission(d.data.mission ?? "");
        }
        if (intRes.ok) {
          const d = await intRes.json();
          const integrations: { id: string; provider: string; apiKey: string; metadata?: Record<string, string> }[] =
            d.data ?? [];

          // PM
          const pm = integrations.find((i) => ["linear","jira","trello"].includes(i.provider));
          if (pm) { setPmProvider(pm.provider as PmProvider); setPmApiKey(pm.apiKey ?? ""); setPmIntId(pm.id); }

          // GitHub
          const githubs = integrations.filter((i) => i.provider === "github");
          if (githubs.length > 0) {
            setRepos(githubs.map((g) => ({
              id: g.id,
              repoUrl: g.metadata?.repoUrl ?? "",
              appId: g.metadata?.appId ?? "",
              privateKey: g.apiKey ?? "",
              installationId: g.metadata?.installationId ?? "",
              webhookSecret: g.metadata?.webhookSecret ?? "",
              expanded: false,
            })));
          }

          // Notion
          const notion = integrations.find((i) => i.provider === "notion");
          if (notion) { setNotionKey(notion.apiKey ?? ""); setNotionIntId(notion.id); }
        }
      })
      .catch(() => toast.error("Failed to load team settings."))
      .finally(() => setIsLoadingTeam(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // ── GitHub repo helpers ─────────────────────────────────────────────────────

  const addRepo    = () => setRepos((p) => [...p, emptyRepo()]);
  const removeRepo = (i: number) => setRepos((p) => p.filter((_, idx) => idx !== i));
  const updateRepo = <K extends keyof GitHubRepo>(i: number, field: K, val: GitHubRepo[K]) =>
    setRepos((p) => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const toggleRepo = (i: number) =>
    setRepos((p) => p.map((r, idx) => idx === i ? { ...r, expanded: !r.expanded } : r));

  // ── Completion signals ──────────────────────────────────────────────────────

  const s1Complete = teamName.trim().length > 0 && mission.trim().length > 0;
  const s2Complete = pmProvider !== null && pmApiKey.trim().length > 0;
  const s3Complete = repos.length > 0 && repos.every(
    (r) => r.repoUrl.trim() && r.appId.trim() && r.privateKey.trim() && r.installationId.trim()
  );
  const s4Complete = notionKey.trim().length > 0;

  const steps = [
    { label: "Identity",            complete: s1Complete },
    { label: "Project Management",  complete: s2Complete },
    { label: "Code Repository",     complete: s3Complete },
    { label: "Documentation",       complete: s4Complete },
  ];

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!s1Complete) { toast.error("Team name and mission are required."); return; }
    setIsSaving(true);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      // 1. Update identity
      const teamRes = await fetch(`${API_BASE}/teams/${teamId}`, {
        method: "PUT", headers,
        body: JSON.stringify({ name: teamName.trim(), mission: mission.trim() }),
      });
      if (!teamRes.ok) throw new Error("Failed to update team details.");

      // 2. PM integration
      if (pmProvider && pmApiKey.trim()) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST", headers,
          body: JSON.stringify({ provider: pmProvider, apiKey: pmApiKey.trim() }),
        });
      }

      // 3. GitHub repos
      const validRepos = repos.filter((r) => r.repoUrl.trim() && r.appId.trim());
      for (const repo of validRepos) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST", headers,
          body: JSON.stringify({
            provider: "github",
            apiKey: repo.privateKey,
            metadata: {
              repoUrl: repo.repoUrl, appId: repo.appId,
              installationId: repo.installationId, webhookSecret: repo.webhookSecret,
            },
          }),
        });
      }

      // 4. Notion
      if (notionKey.trim()) {
        await fetch(`${API_BASE}/teams/${teamId}/integrations`, {
          method: "POST", headers,
          body: JSON.stringify({ provider: "notion", apiKey: notionKey.trim() }),
        });
      }

      setSaved(true);
      toast.success("Team settings saved.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (authLoading || isLoadingTeam) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Loading team settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link href="/teams" id="back-to-teams"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          My Teams
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">Configure <strong>{teamName}</strong> — identity, integrations, and tooling.</p>
      </div>

      {/* ── Progress tracker ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all",
              s.complete ? "bg-primary text-primary-foreground" : "border-2 border-border text-muted-foreground"
            )}>
              {s.complete ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={cn("hidden text-sm font-medium sm:block", s.complete ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn("hidden h-px w-8 ml-1 sm:block", s.complete ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">

        {/* ── § 1  Identity ───────────────────────────────────────────── */}
        <section id="settings-identity" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader number={1} complete={s1Complete}
            title="Identity"
            subtitle="The name and mission of this engineering team." />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium">Team Name</label>
              <Input id="settings-name" value={teamName} onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Platform Engineering" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-mission" className="text-sm font-medium">Mission</label>
              <Input id="settings-mission" value={mission} onChange={(e) => setMission(e.target.value)}
                placeholder="e.g. Build the core platform infrastructure" />
            </div>
          </div>
        </section>

        {/* ── § 2  Project Management ─────────────────────────────────── */}
        <section id="settings-pm" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader number={2} complete={s2Complete}
            title="Project Management"
            subtitle="Connect a project tracking tool so agents can read and update tickets." />

          <div className="flex flex-col gap-4">
            {/* Provider picker */}
            <div>
              <p className="mb-2 text-sm font-medium">Provider</p>
              <div className="flex gap-3">
                {PM_PROVIDERS.map(({ key, label, icon, available }) => (
                  <button key={key} id={`settings-pm-${key}`} type="button"
                    disabled={!available}
                    onClick={() => available && setPmProvider(key)}
                    className={cn(
                      "relative flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-4 text-sm font-medium transition-all",
                      !available && "cursor-not-allowed opacity-40",
                      pmProvider === key
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : available
                          ? "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          : "border-border text-muted-foreground"
                    )}>
                    <span className="text-xl">{icon}</span>
                    {label}
                    {!available && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* API key */}
            {pmProvider && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-pm-key" className="text-sm font-medium">API Key</label>
                <Input id="settings-pm-key" type="password" value={pmApiKey}
                  onChange={(e) => setPmApiKey(e.target.value)}
                  placeholder="lin_api_••••••••••••••••••••••" />
                {pmProvider === "linear" && (
                  <p className="text-xs text-muted-foreground">
                    Generate a Personal API key at{" "}
                    <a href="https://linear.app/settings/api" target="_blank" rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground">linear.app/settings/api</a>.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── § 3  GitHub Repositories ────────────────────────────────── */}
        <section id="settings-github" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader number={3} complete={s3Complete}
            title={<span className="flex items-center gap-2"><GitBranch className="size-4" />Code Repository</span> as unknown as string}
            subtitle="Connect one or more GitHub repositories via a GitHub App." />

          <div className="flex flex-col gap-3">
            {repos.map((repo, i) => (
              <div key={i} id={`settings-repo-${i}`} className="rounded-xl border border-border bg-background">
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {repo.repoUrl.trim() ? repo.repoUrl : `Repository ${i + 1}`}
                  </span>
                  <button type="button" onClick={() => toggleRepo(i)}
                    className="text-muted-foreground hover:text-foreground">
                    {repo.expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {repos.length > 1 && (
                    <button type="button" onClick={() => removeRepo(i)}
                      className="text-muted-foreground transition-colors hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Expandable fields */}
                {repo.expanded && (
                  <div className="flex flex-col gap-3 border-t border-border px-4 pb-4 pt-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-url-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Repository URL
                      </label>
                      <Input id={`repo-url-${i}`} value={repo.repoUrl}
                        onChange={(e) => updateRepo(i, "repoUrl", e.target.value)}
                        placeholder="https://github.com/org/repo" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`repo-appid-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          GitHub App ID
                        </label>
                        <Input id={`repo-appid-${i}`} value={repo.appId}
                          onChange={(e) => updateRepo(i, "appId", e.target.value)}
                          placeholder="123456" />
                        <p className="text-xs text-muted-foreground">Found in GitHub App settings.</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`repo-install-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Installation ID
                        </label>
                        <Input id={`repo-install-${i}`} value={repo.installationId}
                          onChange={(e) => updateRepo(i, "installationId", e.target.value)}
                          placeholder="78901234" />
                        <p className="text-xs text-muted-foreground">From the app installation URL.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-privkey-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Private Key (PEM)
                      </label>
                      <textarea id={`repo-privkey-${i}`} value={repo.privateKey}
                        onChange={(e) => updateRepo(i, "privateKey", e.target.value)}
                        placeholder={"-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----"}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                      <p className="text-xs text-muted-foreground">Generate & download from GitHub App → Private keys.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`repo-webhook-${i}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Webhook Secret <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
                      </label>
                      <Input id={`repo-webhook-${i}`} type="password" value={repo.webhookSecret}
                        onChange={(e) => updateRepo(i, "webhookSecret", e.target.value)}
                        placeholder="whsec_••••••••" />
                      <p className="text-xs text-muted-foreground">Set during webhook registration.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button id="settings-add-repo" type="button" variant="outline" size="sm"
              className="gap-1.5 self-start" onClick={addRepo}>
              <Plus className="size-3.5" />
              Add Repository
            </Button>
          </div>
        </section>

        {/* ── § 4  Documentation (Notion) ─────────────────────────────── */}
        <section id="settings-docs" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader number={4} complete={s4Complete}
            title={<span className="flex items-center gap-2"><FileText className="size-4" />Documentation</span> as unknown as string}
            subtitle="Connect Notion so agents can read and update your knowledge base." />

          {/* Notion only – others coming soon */}
          <div className="mb-4 flex gap-3">
            {/* Notion button */}
            <button id="settings-docs-notion" type="button"
              className="flex flex-1 max-w-[120px] flex-col items-center gap-1.5 rounded-xl border border-primary bg-primary/5 p-4 text-sm font-medium text-foreground shadow-sm">
              <span className="text-xl">📝</span>
              Notion
            </button>
            {/* Coming soon placeholders */}
            {["Confluence", "Obsidian"].map((name) => (
              <button key={name} type="button" disabled
                className="relative flex flex-1 max-w-[120px] flex-col items-center gap-1.5 rounded-xl border border-border p-4 text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed">
                <span className="text-xl">{name === "Confluence" ? "🔷" : "🪨"}</span>
                {name}
                <span className="absolute -top-2 -right-2 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Soon</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-notion-key" className="text-sm font-medium">Notion API Key</label>
            <Input id="settings-notion-key" type="password" value={notionKey}
              onChange={(e) => setNotionKey(e.target.value)}
              placeholder="secret_••••••••••••••••••••••••••••••" />
            <p className="text-xs text-muted-foreground">
              Create an integration token at{" "}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground">notion.so/my-integrations</a>.
            </p>
          </div>
        </section>

        {/* ── Save button ──────────────────────────────────────────────── */}
        <Button id="settings-save" size="lg" disabled={!s1Complete || isSaving}
          onClick={handleSave} className="w-full font-semibold shadow-md gap-2">
          {isSaving
            ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
            : saved
              ? <><CheckCircle2 className="size-4" /> Saved!</>
              : <><Save className="size-4" /> Save Settings</>}
        </Button>
      </div>
    </div>
  );
}
