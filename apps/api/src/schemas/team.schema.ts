import { z } from "zod";

// ── Create / Update ───────────────────────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z.string().min(1, "name is required"),
  mission: z.string().min(1, "mission is required"),
});

export const updateTeamSchema = createTeamSchema.partial();

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
