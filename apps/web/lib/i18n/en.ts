export const en = {
  nav: {
    about: "About Us",
    contactSales: "Contact Sales",
    pricing: "Pricing",
    login: "Login",
    getStarted: "Get Started",
    setup: "Team Setup",
    logout: "Log out",
  },
  hero: {
    badge: "AI Engineering Squads for Modern Teams",
    headline: "Engineering excellence,\non demand.",
    subheadline:
      "Forge deploys managed, autonomous AI engineering squads directly into your infrastructure — combining the discipline of a Big Tech organization with the speed and cost-efficiency your business needs.",
    ctaPrimary: "Get Started",
    ctaSecondary: "Contact Sales",
  },
  stats: {
    items: [
      { value: "10×", label: "Faster delivery cycles" },
      { value: "70%", label: "Lower engineering overhead" },
      { value: "24/7", label: "Continuous execution" },
      { value: "0", label: "Knowledge lost between sprints" },
    ],
  },
  chaos: {
    sectionBadge: "The Old Way vs The Forge Way",
    sectionTitle: "Stop firefighting. Start delivering.",
    sectionSubtitle:
      "Most teams are stuck in a cycle of technical debt, unclear ownership, and unpredictable delivery. Forge replaces chaos with a governed, measurable execution layer.",
    oldWayTitle: "Traditional Development",
    forgeWayTitle: "The Forge Way",
    items: [
      {
        old: "Inconsistent code quality with no enforced standards",
        forge: "Strict SDLC with built-in testing and deployment discipline",
      },
      {
        old: "Knowledge siloed in individual developers",
        forge: "Every decision and context persisted in Git — zero knowledge loss",
      },
      {
        old: "Unpredictable delivery timelines",
        forge: "Continuous execution with real-time health scores and progress tracking",
      },
      {
        old: "Runaway costs with junior hires or freelancers",
        forge: "Dynamic model allocation — advanced AI for complex tasks, lightweight for routine work",
      },
      {
        old: "Lack of oversight — you don't know what's happening",
        forge: "Multi-level approval guardrails — agents never act without your authorization",
      },
      {
        old: "Technical debt accumulates with every sprint",
        forge: "Engineering discipline enforced on every commit, PR, and deployment",
      },
    ],
  },
  pillars: {
    sectionBadge: "Why Forge",
    sectionTitle: "A managed execution layer,\nnot just a coding tool.",
    sectionSubtitle:
      "Unlike freelancers or chat-based AI, Forge is an operational system that runs with the rigor of a senior engineering organization.",
    items: [
      {
        title: "Productivity & ROI",
        description:
          "Forge allocates AI models dynamically — deploying advanced reasoning for complex architecture decisions and lightweight, cost-efficient models for routine tasks. Your investment is always optimized.",
        icon: "TrendingUp",
      },
      {
        title: "Real-Time Health Score",
        description:
          "Every agent team publishes a live Health Score — a continuous signal of velocity, code quality, test coverage, and blockers. You always know the state of your product.",
        icon: "Activity",
      },
      {
        title: "Managed Autonomy",
        description:
          "Autonomous does not mean uncontrolled. Define multi-level approval workflows, set execution boundaries, and ensure every external action requires explicit human sign-off.",
        icon: "ShieldCheck",
      },
      {
        title: "Engineering Discipline",
        description:
          "Forge enforces a rigid SDLC on every task: ticket ingestion, definition of ready, technical planning, implementation, testing, and PR submission. No shortcuts.",
        icon: "GitMerge",
      },
    ],
  },
  controlPlane: {
    sectionBadge: "Control Plane",
    sectionTitle: "Your cockpit for performance and ROI.",
    sectionSubtitle:
      "The Forge Control Plane gives founders and engineering leaders a single interface to configure agent teams, set guardrails, monitor trends, and maintain full sovereignty over your AI workforce.",
    features: [
      "Multi-level approval rules per agent and action type",
      "Real-time agent health score and activity log",
      "Cost attribution per team, sprint, and task",
      "Workflow templates aligned to your SDLC",
      "Instant rollback and agent replacement",
      "Integration with Linear, Jira, GitHub, and Slack",
    ],
  },
  howItWorks: {
    sectionBadge: "How It Works",
    sectionTitle: "Live in minutes.\nDelivering from day one.",
    steps: [
      {
        number: "01",
        title: "Configure your squad",
        description:
          "Select agent roles — Software Engineer, Architect, Product Manager — and set headcount per role. Define your stack, integrations, and approval policies.",
      },
      {
        number: "02",
        title: "Deploy to your infrastructure",
        description:
          "One Helm command provisions your entire agent team inside your Kubernetes cluster. Your code, your data, your control — no vendor lock-in.",
      },
      {
        number: "03",
        title: "Monitor, approve, and scale",
        description:
          "Agents pick up tickets, write code, open PRs, and report back. You approve critical actions. Scale up or swap roles as your roadmap evolves.",
      },
    ],
  },
  cta: {
    headline: "Engineering excellence,\non demand.",
    subheadline:
      "Start with one agent. Scale to a full squad. All inside your own infrastructure, on your terms.",
    ctaPrimary: "Get Started Free",
    ctaSecondary: "Talk to a Specialist",
  },
  footer: {
    tagline: "Deploy. Govern. Deliver.",
    product: "Product",
    company: "Company",
    links: {
      features: "Features",
      pricing: "Pricing",
      docs: "Documentation",
      changelog: "Changelog",
      about: "About Us",
      blog: "Blog",
      careers: "Careers",
      contact: "Contact",
    },
    copyright: "© 2026 Forge. All rights reserved.",
  },
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your Forge account",
    emailLabel: "Email address",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    passwordPlaceholder: "········",
    signIn: "Sign in",
    continueWithEmail: "Continue with Email",
    orContinueWith: "or continue with",
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    noAccount: "Don't have an account?",
    signUp: "Get Started",
    ssoComingSoon: "SSO coming soon",
  },
  signup: {
    title: "Build your AI engineering squad",
    subtitle: "Configure your team and deploy in minutes.",
    steps: {
      account: "Account",
      workspace: "Workspace",
      team: "Your Team",
    },
    step1: {
      title: "Create your account",
      nameLabel: "Full name",
      namePlaceholder: "Ada Lovelace",
      emailLabel: "Work email",
      emailPlaceholder: "ada@company.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Min. 8 characters",
      next: "Continue",
      orSignUpWith: "or sign up with",
    },
    step2: {
      title: "Name your workspace",
      workspaceLabel: "Workspace name",
      workspacePlaceholder: "Acme Corp",
      waysOfWorkingLabel: "Ways of working",
      waysOfWorkingPlaceholder: "Describe your team culture, process expectations, and engineering standards…",
      waysOfWorkingDefault:
        "We follow trunk-based development with short-lived feature branches. All PRs require one human review. Tests are mandatory for every change. We document decisions in ADRs and keep the main branch always deployable.",
      next: "Continue",
      back: "Back",
    },
    step3: {
      title: "Configure your agent squad",
      subtitle: "Every team includes one Project Manager. Add engineers and architects below.",
      roles: {
        engineer: {
          title: "Software Engineer",
          description: "Implements features, writes tests, submits PRs following your SDLC.",
        },
        architect: {
          title: "Software Architect",
          description: "Designs systems, reviews architecture decisions, enforces technical standards.",
        },
        pm: {
          title: "Project Manager",
          description: "Manages backlog, writes tickets, defines acceptance criteria, tracks progress.",
        },
      },
      pmFixedBadge: "Required",
      pmFixedHint: "Every team has exactly one Project Manager. You can rename it, but not remove it.",
      agentNamePlaceholder: "Agent name",
      launch: "Create Account & Continue",
      back: "Back",
      agentsLabel: "agents",
    },
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    ssoComingSoon: "SSO coming soon",
    creatingAccount: "Creating your account…",
  },
  setup: {
    title: "Team Setup",
    subtitle: "Complete your team configuration to start deploying agents.",
    progressLabel: "Setup progress",
    section1: {
      title: "Team Details",
      teamNameLabel: "Team name",
      teamNamePlaceholder: "Engineering Squad Alpha",
      missionLabel: "Mission",
      missionPlaceholder: "Deliver the product's core platform features with engineering excellence.",
      agentsTitle: "Your agents",
      pmFixedBadge: "Required",
      agentNameLabel: "Name",
      agentRoleLabel: "Role",
      addAgent: "Add agent",
      removeAgent: "Remove",
    },
    section2: {
      title: "Project Management Integration",
      subtitle: "Connect your task tracker so agents can pull tickets automatically.",
      providerLabel: "Choose your tool",
      apiKeyLabel: "API Key",
      apiKeyPlaceholder: "Paste your API key here",
      linearHint: "Create one at linear.app → Settings → API",
      jiraHint: "Create at id.atlassian.com → Manage API tokens",
      trelloHint: "Get via trello.com/app-key",
    },
    section3: {
      title: "GitHub Integration",
      subtitle: "Connect GitHub so agents can clone, push, and open pull requests using a GitHub App.",
      addRepo: "Add repository",
      removeRepo: "Remove",
      repoCardDefault: "Repository",
      optional: "optional",
      repoUrlLabel: "Repository URL",
      repoPlaceholder: "https://github.com/org/repo",
      appIdLabel: "App ID",
      appIdPlaceholder: "123456",
      appIdHint: "Found in your GitHub App settings → General → About.",
      installationIdLabel: "Installation ID",
      installationIdPlaceholder: "12345678",
      installationIdHint: "Found in the URL when you visit the app installation (github.com/settings/installations/…).",
      privateKeyLabel: "Private Key (.pem)",
      privateKeyPlaceholder: "-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----",
      privateKeyHint: "Download from your GitHub App settings → Private keys.",
      webhookSecretLabel: "Webhook Secret",
      webhookSecretPlaceholder: "your-webhook-secret",
      webhookSecretHint: "Required only if the agent needs to react to GitHub events (e.g. PR comments).",
    },
    createTeam: "Create Team & Deploy",
    creating: "Creating team…",
    successTitle: "Team created!",
    successSubtitle: "Your agent squad is being provisioned. You'll receive a notification when they're live.",
  },
  langSwitcher: {
    label: "Language",
  },
};

export type Dictionary = typeof en;
