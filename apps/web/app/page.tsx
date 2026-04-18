"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  Cpu,
  GitMerge,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const pillarIcons: Record<string, React.ElementType> = {
  TrendingUp,
  Activity,
  ShieldCheck,
  GitMerge,
};

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const signupHref = user ? "/teams" : "/signup";

  return (
    <div className="flex flex-col">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background px-4 py-24 text-center"
      >
        {/* Mesh grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] [background-size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]"
        />
        {/* Glow blobs */}
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -right-60 size-[500px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-7 max-w-4xl mx-auto">
          <Badge
            id="hero-badge"
            variant="secondary"
            className="gap-1.5 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase"
          >
            <span className="size-1.5 rounded-full bg-primary inline-block" />
            {t.hero.badge}
          </Badge>

          <h1 className="whitespace-pre-line text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05]">
            {t.hero.headline.split("\n").map((line, i) =>
              i === 0 ? (
                <span key={i} className="block">{line}</span>
              ) : (
                <span key={i} className="block text-primary">{line}</span>
              )
            )}
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
            {t.hero.subheadline}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link href={signupHref} id="hero-cta-primary">
              <Button size="lg" className="gap-2 font-semibold shadow-md px-6">
                {t.hero.ctaPrimary}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="#contact" id="hero-cta-secondary">
              <Button size="lg" variant="outline" className="font-medium px-6">
                {t.hero.ctaSecondary}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TEMPLATES ────────────────────────────────────────────────── */}
      <section id="templates" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest">
              {t.templates.sectionBadge}
            </Badge>
            <h2 className="whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">
              {t.templates.sectionTitle}
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              {t.templates.sectionSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {t.templates.items.map((tmpl, i) => {
              const isComingSoon = tmpl.badge === "Coming Soon" || tmpl.badge === "即将推出";
              return (
                <div
                  key={i}
                  id={`template-card-${tmpl.key}`}
                  className={`group relative flex flex-col rounded-2xl border bg-card p-7 shadow-sm transition-all duration-200 ${
                    isComingSoon
                      ? "border-border opacity-60 cursor-not-allowed"
                      : "border-border hover:shadow-md hover:border-primary/40"
                  }`}
                >
                  {tmpl.badge && (
                    <span className={`absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isComingSoon
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {tmpl.badge}
                    </span>
                  )}
                  <div className="mb-5 text-4xl">{tmpl.icon}</div>
                  <h3 className="mb-2 text-xl font-bold text-foreground">{tmpl.title}</h3>
                  <p className="flex-1 text-sm text-muted-foreground leading-relaxed mb-6">
                    {tmpl.description}
                  </p>
                  {isComingSoon ? (
                    <Button variant="outline" disabled className="w-full font-medium">
                      {tmpl.cta}
                    </Button>
                  ) : (
                    <Link href={signupHref} id={`template-cta-${tmpl.key}`}>
                      <Button className="w-full gap-2 font-semibold group-hover:shadow-sm">
                        {tmpl.cta}
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────── */}
      <section id="stats" className="border-y border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {t.stats.items.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHAOS vs FORGE WAY ───────────────────────────────────────── */}
      <section id="about" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest">
              {t.chaos.sectionBadge}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.chaos.sectionTitle}
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              {t.chaos.sectionSubtitle}
            </p>
          </div>

          {/* Comparison — two premium cards */}
          <div className="grid gap-5 sm:grid-cols-2">

            {/* ── Ad Hoc card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
              {/* Gradient stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-destructive/60 via-rose-400/60 to-destructive/20" />
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-destructive/10">
                <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10">
                  <X className="size-4 text-destructive" />
                </div>
                <div>
                  <p className="text-base font-bold text-destructive">{t.chaos.oldWayTitle}</p>
                  <p className="text-xs text-destructive/60">The status quo</p>
                </div>
              </div>
              {/* Items */}
              <ul className="flex flex-col divide-y divide-destructive/10 px-6 py-3">
                {t.chaos.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 py-3.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <X className="size-2.5 text-destructive" />
                    </span>
                    <p className="text-sm text-muted-foreground leading-snug">{item.old}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Forge Way card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 shadow-sm">
              {/* Gradient stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-400 to-primary/40" />
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-primary/10">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
                  <Check className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-primary">{t.chaos.forgeWayTitle}</p>
                  <p className="text-xs text-primary/50">Governed, structured, measurable</p>
                </div>
              </div>
              {/* Items */}
              <ul className="flex flex-col divide-y divide-primary/10 px-6 py-3">
                {t.chaos.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 py-3.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="size-2.5 text-primary" />
                    </span>
                    <p className="text-sm text-foreground font-medium leading-snug">{item.forge}</p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ─── PILLARS ──────────────────────────────────────────────────── */}
      <section id="features" className="bg-muted/30 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest">
              {t.pillars.sectionBadge}
            </Badge>
            <h2 className="whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">
              {t.pillars.sectionTitle}
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              {t.pillars.sectionSubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {t.pillars.items.map((pillar, i) => {
              const Icon = pillarIcons[pillar.icon] ?? Cpu;
              return (
                <div
                  key={i}
                  className="group relative rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CONTROL PLANE ────────────────────────────────────────────── */}
      <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <div className="flex flex-col gap-5">
              <Badge variant="outline" className="w-fit text-xs font-semibold uppercase tracking-widest">
                {t.controlPlane.sectionBadge}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t.controlPlane.sectionTitle}
              </h2>
              <p className="text-muted-foreground">
                {t.controlPlane.sectionSubtitle}
              </p>
              <ul className="flex flex-col gap-3 mt-2">
                {t.controlPlane.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" />
                    </span>
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Link href={signupHref} id="control-plane-cta">
                  <Button className="gap-2 font-semibold">
                    {t.hero.ctaPrimary}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Fake dashboard UI */}
            <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              {/* Window bar */}
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3 bg-muted/30">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-yellow-400" />
                <span className="size-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-muted-foreground font-medium">Forge Control Plane</span>
              </div>
              {/* Dashboard content */}
              <div className="p-5 flex flex-col gap-4">
                {/* Health score */}
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Health Score</span>
                    <span className="text-2xl font-bold text-primary">94</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[94%] rounded-full bg-primary transition-all" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Velocity ↑12%</span>
                    <span>Output quality 87%</span>
                    <span>0 blockers</span>
                  </div>
                </div>
                {/* Agent cards */}
                {[
                  { role: "Team Lead", status: "Active", task: "Coordinating sprint review", color: "text-violet-500" },
                  { role: "Software Engineer", status: "In Progress", task: "feat: add JWT auth middleware", color: "text-blue-500" },
                  { role: "Support Agent", status: "Done", task: "Resolved 12 tickets today", color: "text-green-500" },
                ].map((agent, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">{agent.role}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">{agent.task}</span>
                    </div>
                    <span className={`text-xs font-medium ${agent.color}`}>{agent.status}</span>
                  </div>
                ))}
                {/* Approval pending */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">⏳ Approval Required</p>
                    <p className="text-xs text-muted-foreground">Deploy to production — FOR-46</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs">Approve</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/30 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest">
              {t.howItWorks.sectionBadge}
            </Badge>
            <h2 className="whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">
              {t.howItWorks.sectionTitle}
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-3">
            {t.howItWorks.steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i < t.howItWorks.steps.length - 1 && (
                  <div className="absolute top-6 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] border-t border-dashed border-border md:block" />
                )}
                <div className="relative z-10 flex size-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary font-bold text-sm">
                  {step.number}
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────── */}
      <section
        id="contact"
        className="relative overflow-hidden bg-foreground px-4 py-28 sm:px-6 lg:px-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:3rem_3rem]"
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="whitespace-pre-line text-4xl font-bold tracking-tight text-background sm:text-5xl">
            {t.cta.headline}
          </h2>
          <p className="mt-5 text-lg text-background/70">{t.cta.subheadline}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={signupHref} id="cta-get-started">
              <Button size="lg" variant="secondary" className="font-semibold gap-2">
                {t.cta.ctaPrimary}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="#contact" id="cta-talk">
              <Button
                size="lg"
                variant="ghost"
                className="text-background hover:bg-background/10 hover:text-background font-medium border border-background/20"
              >
                {t.cta.ctaSecondary}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Cpu className="size-4" />
                </span>
                <span className="text-lg font-bold tracking-tight">FORGE</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.footer.tagline}</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">{t.footer.product}</p>
              <ul className="flex flex-col gap-2">
                {(["features", "pricing", "docs", "changelog"] as const).map((key) => (
                  <li key={key}>
                    <Link href={`#${key}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {t.footer.links[key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">{t.footer.company}</p>
              <ul className="flex flex-col gap-2">
                {(["about", "blog", "careers", "contact"] as const).map((key) => (
                  <li key={key}>
                    <Link href={`#${key}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {t.footer.links[key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
}
