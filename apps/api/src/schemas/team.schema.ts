import { z } from "zod";

// ── Create / Update ───────────────────────────────────────────────────────────

export const createTeamSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  name: z.string().min(1, "name is required"),
  mission: z.string().min(1, "mission is required"),
  waysOfWorking: z.string().optional(),
  agents: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(["software_engineer", "product_manager", "project_manager", "software_architect"]),
        icon: z.string().optional(),
      })
    )
    .optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
