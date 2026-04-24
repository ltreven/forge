import { z } from "zod";

const statusDomain = z.number().int().min(0).max(5);
const priorityDomain = z.number().int().min(0).max(4);

// Compatible with editor payloads such as Tiptap/ProseMirror JSON documents.
// This supports markdown workflows plus image-paste metadata via JSON nodes.
const richTextSchema = z.record(z.string(), z.unknown()).or(z.array(z.unknown()));

export const createTaskSchema = z.object({
  teamId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable().optional(),
  taskTypeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  shortSummary: z.string().max(280).nullable().optional(),
  descriptionMarkdown: z.string().nullable().optional(),
  descriptionRichText: richTextSchema.nullable().optional(),
  status: statusDomain.default(0),
  priority: priorityDomain.default(0),
  assignedToId: z.string().uuid().nullable().optional(),
  labels: z.array(z.string().uuid()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ teamId: true });

export const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1),
});

export const createTaskTypeSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1),
  emoji: z.string().min(1),
  backgroundColor: z.string().min(4),
  isDefault: z.boolean().default(false),
});

export const updateTaskTypeSchema = createTaskTypeSchema.partial().omit({ teamId: true });

export const createLabelSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(4),
});

export const updateLabelSchema = createLabelSchema.partial().omit({ teamId: true });
