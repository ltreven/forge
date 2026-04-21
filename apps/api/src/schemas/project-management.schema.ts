import { z } from "zod";

const statusDomain = z.number().int().min(0).max(4);
const priorityDomain = z.number().int().min(0).max(4);

// Compatible with editor payloads such as Tiptap/ProseMirror JSON documents.
// This supports markdown workflows plus image-paste metadata via JSON nodes.
const richTextSchema = z.record(z.string(), z.unknown()).or(z.array(z.unknown()));
const projectDateInputSchema = z.object({
  kind: z.enum(["date", "quarter"]),
  value: z.string().min(1),
});

export const createProjectSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().min(1).max(200),
  shortSummary: z.string().max(280).optional(),
  descriptionMarkdown: z.string().optional(),
  descriptionRichText: richTextSchema.optional(),
  startAt: projectDateInputSchema.optional(),
  endAt: projectDateInputSchema.optional(),
  status: statusDomain.default(0),
  priority: priorityDomain.default(0),
  leadId: z.string().uuid().optional(),
  health: z.enum(["unknown", "on_track", "at_risk", "off_track"]).default("unknown"),
});

export const updateProjectSchema = createProjectSchema.partial().omit({ teamId: true });

export const createProjectUpdateSchema = z.object({
  projectId: z.string().uuid(),
  happenedAt: z.coerce.date().optional(),
  newHealth: z.enum(["unknown", "on_track", "at_risk", "off_track"]),
  reason: z.string().min(1),
});

export const updateProjectUpdateSchema = z
  .object({
    happenedAt: z.coerce.date().optional(),
    newHealth: z.enum(["unknown", "on_track", "at_risk", "off_track"]).optional(),
    reason: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  parentIssueId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  shortSummary: z.string().max(280).optional(),
  descriptionMarkdown: z.string().optional(),
  descriptionRichText: richTextSchema.optional(),
  status: statusDomain.default(0),
  priority: priorityDomain.default(0),
  assignedToId: z.string().uuid().optional(),
});

export const updateIssueSchema = createIssueSchema.partial().omit({ projectId: true });
