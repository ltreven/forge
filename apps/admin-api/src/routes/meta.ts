import { Router } from "express";

export const metaRouter = Router();

// ── GET /meta/team-types ──────────────────────────────────────────────────────
metaRouter.get("/team-types", (req, res) => {
  const teamTypes = [
    {
      id: "engineering",
      name: "Engineering",
      description: "Build, test, and deploy software with a team of AI engineers and architects.",
      featured: true,
    },
    {
      id: "customer_support",
      name: "Customer Support",
      description: "Scale your customer service with AI agents that can analyze and respond to support tickets.",
      featured: true,
    },
    {
      id: "sales",
      name: "Sales",
      description: "Automate lead qualification and outreach with AI-driven sales teams.",
      featured: false,
    },
    {
      id: "marketing",
      name: "Marketing",
      description: "Generate content and manage campaigns with a creative team of AI marketers.",
      featured: false,
    },
  ];
  res.json({ success: true, data: teamTypes });
});

// ── GET /meta/agent-roles ─────────────────────────────────────────────────────
metaRouter.get("/agent-roles", (req, res) => {
  const agentRoles = [
    {
      id: "manager",
      name: "Manager",
      description: "Coordinates team activities, assigns tasks, and ensures goals are met.",
      emoji: "💼",
      backgroundColor: "#4F46E5", // Indigo
    },
    {
      id: "software_engineer",
      name: "Software Engineer",
      description: "Writes high-quality code, implements features, and fixes bugs.",
      emoji: "💻",
      backgroundColor: "#10B981", // Emerald
    },
    {
      id: "software_architect",
      name: "Software Architect",
      description: "Designs system architecture, defines standards, and ensures scalability.",
      emoji: "🏛️",
      backgroundColor: "#8B5CF6", // Violet
    },
    {
      id: "product_manager",
      name: "Product Manager",
      description: "Defines product vision, gathers requirements, and prioritizes features.",
      emoji: "🚀",
      backgroundColor: "#F59E0B", // Amber
    },
    {
      id: "support_responder",
      name: "Support Responder",
      description: "Handles initial customer inquiries and provides quick resolutions.",
      emoji: "🎧",
      backgroundColor: "#3B82F6", // Blue
    },
    {
      id: "support_analist",
      name: "Support Analist",
      description: "Deeply investigates complex issues and provides technical support.",
      emoji: "🔍",
      backgroundColor: "#EC4899", // Pink
    },
  ];
  res.json({ success: true, data: agentRoles });
});
