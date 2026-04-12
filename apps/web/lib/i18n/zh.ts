import type { Dictionary } from "./en";

export const zh: Dictionary = {
  nav: {
    about: "关于我们",
    contactSales: "联系销售",
    pricing: "产品定价",
    login: "登录",
    getStarted: "立即开始",
    setup: "团队配置",
    logout: "退出登录",
  },
  hero: {
    badge: "面向现代团队的AI工程小队",
    headline: "随需应变，\n卓越工程。",
    subheadline:
      "Forge 将托管的自主AI工程小队直接部署至您的基础设施——将大型科技公司的工程纪律与您企业所需的速度和成本效益完美融合。",
    ctaPrimary: "立即开始",
    ctaSecondary: "联系销售",
  },
  stats: {
    items: [
      { value: "10×", label: "交付周期加速" },
      { value: "70%", label: "工程成本降低" },
      { value: "24/7", label: "持续执行" },
      { value: "0", label: "迭代间知识损失" },
    ],
  },
  chaos: {
    sectionBadge: "传统方式 vs Forge 方式",
    sectionTitle: "停止救火，开始交付。",
    sectionSubtitle:
      "大多数团队深陷技术债、职责不清和交付不可预期的恶性循环。Forge 以受治理、可量化的执行层取而代之。",
    oldWayTitle: "传统开发方式",
    forgeWayTitle: "Forge 方式",
    items: [
      {
        old: "代码质量参差不齐，缺乏统一标准",
        forge: "严格的SDLC，内置测试与部署规范",
      },
      {
        old: "知识沉淀在个别开发者身上",
        forge: "所有决策与上下文持久化至Git，零知识流失",
      },
      {
        old: "交付时间线不可预期",
        forge: "持续执行，实时健康评分与进度追踪",
      },
      {
        old: "初级外包或自由职业者成本失控",
        forge: "动态模型分配——复杂任务用高级AI，例行任务用轻量模型",
      },
      {
        old: "缺乏监管，不知道正在发生什么",
        forge: "多级审批护栏——智能体在未获授权时绝不自主行动",
      },
      {
        old: "每个迭代都在积累技术债",
        forge: "每次提交、PR和部署都强制执行工程纪律",
      },
    ],
  },
  pillars: {
    sectionBadge: "为什么选择 Forge",
    sectionTitle: "托管执行层，\n而非简单的编码工具。",
    sectionSubtitle:
      "与自由职业者或对话式AI不同，Forge 是一个以资深工程组织标准运转的运营系统。",
    items: [
      {
        title: "生产力与投资回报",
        description:
          "Forge 动态分配AI模型——复杂架构决策调用高级推理能力，日常任务使用轻量、高性价比模型。您的投入始终处于最优配置。",
        icon: "TrendingUp",
      },
      {
        title: "实时健康评分",
        description:
          "每个智能体团队持续发布健康评分，涵盖交付速度、代码质量、测试覆盖率和阻塞项。您随时掌握产品状态。",
        icon: "Activity",
      },
      {
        title: "可管控的自主性",
        description:
          "自主不等于失控。定义多级审批工作流，设置执行边界，确保每一次外部操作都需要明确的人工授权。",
        icon: "ShieldCheck",
      },
      {
        title: "工程纪律",
        description:
          "Forge 对每项任务强制执行严格的软件开发生命周期：工单摄取、就绪定义、技术规划、实现、测试与PR提交，一步不少。",
        icon: "GitMerge",
      },
    ],
  },
  controlPlane: {
    sectionBadge: "控制平面",
    sectionTitle: "您的性能与ROI驾驶舱。",
    sectionSubtitle:
      "Forge 控制平面为创始人和工程负责人提供统一界面，用于配置智能体团队、设定护栏、监控趋势，并对AI员工保持完全主权。",
    features: [
      "按智能体和操作类型设置多级审批规则",
      "实时智能体健康评分与活动日志",
      "按团队、迭代和任务的成本归因",
      "符合您SDLC的工作流模板",
      "即时回滚与智能体替换",
      "集成 Linear、Jira、GitHub 和 Slack",
    ],
  },
  howItWorks: {
    sectionBadge: "工作原理",
    sectionTitle: "分钟级上线，\n第一天起就开始交付。",
    steps: [
      {
        number: "01",
        title: "配置您的小队",
        description:
          "选择智能体角色——软件工程师、架构师、产品经理——并设置每个角色的人数。定义您的技术栈、集成和审批策略。",
      },
      {
        number: "02",
        title: "部署到您的基础设施",
        description:
          "一条Helm命令即可在您的Kubernetes集群内完整部署智能体团队。您的代码、您的数据、您的掌控——无供应商锁定。",
      },
      {
        number: "03",
        title: "监控、审批与扩展",
        description:
          "智能体自主接取工单、编写代码、提交PR并反馈进展。您审批关键操作。随着路线图演进，随时扩展或调整角色配置。",
      },
    ],
  },
  cta: {
    headline: "随需应变，\n卓越工程。",
    subheadline:
      "从单个智能体起步，扩展为完整小队。全程在您自己的基础设施内，按您的条件运行。",
    ctaPrimary: "免费开始",
    ctaSecondary: "与专家交流",
  },
  footer: {
    tagline: "部署。治理。交付。",
    product: "产品",
    company: "公司",
    links: {
      features: "功能介绍",
      pricing: "产品定价",
      docs: "开发文档",
      changelog: "更新日志",
      about: "关于我们",
      blog: "博客",
      careers: "加入我们",
      contact: "联系我们",
    },
    copyright: "© 2026 Forge。保留所有权利。",
  },
  login: {
    title: "欢迎回来",
    subtitle: "登录您的 Forge 账户",
    emailLabel: "电子邮件",
    emailPlaceholder: "you@company.com",
    passwordLabel: "密码",
    passwordPlaceholder: "········",
    signIn: "登录",
    continueWithEmail: "通过邮箱继续",
    orContinueWith: "或通过以下方式继续",
    google: "通过 Google 登录",
    microsoft: "通过 Microsoft 登录",
    noAccount: "还没有账户？",
    signUp: "立即注册",
    ssoComingSoon: "SSO 即将上线",
  },
  signup: {
    title: "组建您的AI工程小队",
    subtitle: "配置您的团队，数分钟内完成部署。",
    steps: {
      account: "账户",
      workspace: "工作区",
      team: "团队配置",
    },
    step1: {
      title: "创建您的账户",
      nameLabel: "姓名",
      namePlaceholder: "张伟",
      emailLabel: "工作邮箱",
      emailPlaceholder: "zhang@company.com",
      passwordLabel: "密码",
      passwordPlaceholder: "至少8个字符",
      next: "继续",
      orSignUpWith: "或通过以下方式注册",
    },
    step2: {
      title: "命名您的工作区",
      workspaceLabel: "工作区名称",
      workspacePlaceholder: "示例科技有限公司",
      waysOfWorkingLabel: "工作方式",
      waysOfWorkingPlaceholder: "描述您的团队文化、流程期望和工程标准…",
      waysOfWorkingDefault:
        "我们遵循主干开发模式，使用短命功能分支。所有PR需要至少一名人工审阅。每次变更必须包含测试。架构决策通过ADR记录，主分支始终保持可部署状态。",
      next: "继续",
      back: "返回",
    },
    step3: {
      title: "配置您的智能体小队",
      subtitle: "每个团队固定包含一名项目经理。请在下方添加工程师和架构师。",
      roles: {
        engineer: {
          title: "软件工程师",
          description: "实现功能、编写测试、按照您的SDLC提交PR。",
        },
        architect: {
          title: "软件架构师",
          description: "设计系统、审查架构决策、执行技术标准。",
        },
        pm: {
          title: "产品经理",
          description: "管理待办事项、撰写工单、定义验收标准、跟踪进度。",
        },
      },
      pmFixedBadge: "必须保留",
      forgePmTitle: "Forge 项目经理",
      forgePmHint: "Forge 内建的协调智能体。每个团队有且仅有一个——可以改名，不可删除。",
      agentNamePlaceholder: "智能体名称",
      launch: "创建账户并继续",
      back: "返回",
      agentsLabel: "个智能体",
    },
    haveAccount: "已有账户？",
    signIn: "立即登录",
    ssoComingSoon: "SSO 即将上线",
    creatingAccount: "正在创建账户…",
  },
  setup: {
    title: "团队配置",
    subtitle: "完成团队配置以开始部署智能体。",
    progressLabel: "配置进度",
    section1: {
      title: "团队基本信息",
      teamNameLabel: "团队名称",
      teamNamePlaceholder: "工程小队 Alpha",
      missionLabel: "使命",
      missionPlaceholder: "以卓越工程交付产品核心平台功能。",
      agentsTitle: "您的智能体",
      pmFixedBadge: "必须保留",
      agentNameLabel: "名称",
      agentRoleLabel: "角色",
      addAgent: "添加智能体",
      removeAgent: "移除",
    },
    section2: {
      title: "项目管理集成",
      subtitle: "连接您的任务追踪工具，让智能体自动拉取工单。",
      providerLabel: "选择您的工具",
      apiKeyLabel: "API 密钥",
      apiKeyPlaceholder: "在此粘贴您的 API 密钥",
      linearHint: "在 linear.app → 设置 → API 中创建",
      jiraHint: "在 id.atlassian.com → 管理API令牌 中创建",
      trelloHint: "通过 trello.com/app-key 获取",
    },
    section3: {
      title: "GitHub 集成",
      subtitle: "通过 GitHub App 连接仓库，让智能体能够克隆、推送代码并开启 Pull Request。",
      addRepo: "添加仓库",
      removeRepo: "移除",
      repoCardDefault: "仓库",
      optional: "可选",
      repoUrlLabel: "仓库地址",
      repoPlaceholder: "https://github.com/org/repo",
      appIdLabel: "App ID",
      appIdPlaceholder: "123456",
      appIdHint: "在 GitHub App 设置页面 → General → About 中查找。",
      installationIdLabel: "Installation ID",
      installationIdPlaceholder: "12345678",
      installationIdHint: "访问应用安装页面时 URL 末尾的数字（github.com/settings/installations/…）。",
      privateKeyLabel: "私钥 (.pem)",
      privateKeyPlaceholder: "-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----",
      privateKeyHint: "在 GitHub App 设置页面 → Private keys 中下载。",
      webhookSecretLabel: "Webhook Secret",
      webhookSecretPlaceholder: "your-webhook-secret",
      webhookSecretHint: "仅当智能体需要响应 GitHub 事件（如 PR 评论）时才需要填写。",
    },
    createTeam: "创建团队并部署",
    saveChanges: "保存修改",
    creating: "正在创建团队…",
    successTitle: "团队已创建！",
    successSubtitle: "您的智能体小队正在配置中，上线后您将收到通知。",
  },
  langSwitcher: {
    label: "语言",
  },
};
