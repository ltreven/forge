"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
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

// project_manager excluded from dropdown — it's always the fixed Forge PM row.
const AGENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "team_lead", label: "Team Lead" },
  { value: "software_engineer", label: "Software Engineer" },
  { value: "software_architect", label: "Software Architect" },
  { value: "product_manager", label: "Product Manager" },
];

export default function SetupPage() {
  const { t } = useTranslation();
  const { token, teamId } = useAuth();
  const router = useRouter();

  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingTeamId, setExistingTeamId] = useState<string | null>(teamId);

  // ── Section 1: Team Details ────────────────────────────────────────────────
  const [teamName, setTeamName] = useState("");
  const [mission, setMission] = useState("");
  const [forgePmName, setForgePmName] = useState("Forge PM");
  const [teamAgents, setTeamAgents] = useState<{ id?: string; name: string; type: string }[]>([]);

  // ── Load existing team data on mount ──────────────────────────────────────
  useEffect(() => {
    const loadTeam = async () => {
      const id = teamId;
      if (!id) { setIsLoadingTeam(false); return; }
      try {
        const authHeaders = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [teamRes, agentsRes] = await Promise.all([
          fetch(`${API_BASE}/teams/${id}`, { headers: authHeaders }),
          fetch(`${API_BASE}/agents?teamId=${id}`, { headers: authHeaders }),
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
  const addAgent = () => setTeamAgents((prev) => [...prev, { name: "", type: "software_engineer" }]);
  const removeAgent = (i: number) => setTeamAgents((prev) => prev.filter((_, idx) => idx !== i));
  const updateAgent = (i: number, field: "name" | "type", value: string) =>
    setTeamAgents((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));

  // ── Progress ───────────────────────────────────────────────────────────────
  const section1Complete = teamName.trim().length > 0;
  const canSubmit = section1Complete;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please provide a team name before saving.");
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
        await fetch(`${API_BASE}/teams/${teamId}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ name: teamName, mission }),
        });
      } else {
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
          <Button onClick={() => router.replace("/teams")} className="mt-2 gap-2 font-semibold">
            Go to My Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t.setup.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{t.setup.subtitle}</p>
      </div>

      {/* Existing team banner */}
      {existingTeamId && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2 text-sm text-primary">
          <Check className="size-4 shrink-0" />
          <span>Data pre-loaded from your onboarding session. Review and update as needed.</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* ── Section 1: Team Details ── */}
        <section id="setup-section-team" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
              section1Complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {section1Complete ? <Check className="size-4" /> : "1"}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.setup.section1.title}</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-team-name" className="text-sm font-medium">
                  {t.setup.section1.teamNameLabel}
                </label>
                <Input id="setup-team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)}
                  placeholder={t.setup.section1.teamNamePlaceholder} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="setup-mission" className="text-sm font-medium">
                  {t.setup.section1.missionLabel}
                  <span className="ml-1 font-normal text-muted-foreground/70 text-xs">(optional)</span>
                </label>
                <Input id="setup-mission" value={mission} onChange={(e) => setMission(e.target.value)}
                  placeholder={t.setup.section1.missionPlaceholder} />
              </div>
            </div>

            {/* Agents */}
            <div>
              <p className="mb-3 text-sm font-medium">{t.setup.section1.agentsTitle}</p>
              <div className="flex flex-col gap-2">
                {/* Fixed Forge PM row (project_manager) */}
                <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <span className="text-lg select-none">🤖</span>
                  <Input id="setup-pm-name" value={forgePmName} onChange={(e) => setForgePmName(e.target.value)}
                    className="flex-1 h-8 text-sm border-primary/30 bg-transparent focus-visible:ring-primary/40"
                    placeholder="Forge PM" />
                  <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {t.setup.section1.pmFixedBadge}
                  </span>
                </div>

                {/* Additional agents */}
                {teamAgents.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input id={`setup-agent-name-${i}`} value={agent.name}
                      onChange={(e) => updateAgent(i, "name", e.target.value)}
                      placeholder={t.setup.section1.agentNameLabel} className="flex-1" />
                    <select id={`setup-agent-type-${i}`} value={agent.type}
                      onChange={(e) => updateAgent(i, "type", e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {AGENT_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeAgent(i)}
                      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t.setup.section1.removeAgent}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Button id="setup-add-agent" type="button" variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addAgent}>
                <Plus className="size-3.5" />
                {t.setup.section1.addAgent}
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Button id="setup-create-team" size="lg" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}
          className="w-full font-semibold shadow-md">
          {isSubmitting ? t.setup.creating : existingTeamId ? t.setup.saveChanges : t.setup.createTeam}
        </Button>
      </div>
    </div>
  );
}
