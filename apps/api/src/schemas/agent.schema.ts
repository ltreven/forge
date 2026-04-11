import { z } from "zod";

// ── Agent type enum ───────────────────────────────────────────────────────────

export const agentTypeSchema = z.enum([
  "software_engineer",
  "product_manager",
  "project_manager",
  "software_architect",
]);

// ── Create / Update ───────────────────────────────────────────────────────────

export const createAgentSchema = z.object({
  teamId: z.string().uuid("teamId must be a valid UUID"),
  name: z.string().min(1, "name is required"),
  type: agentTypeSchema,
});

export const updateAgentSchema = createAgentSchema.omit({ teamId: true }).partial();

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
