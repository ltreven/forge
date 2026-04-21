import { z } from "zod";

export const mcpToolNameSchema = z.enum([
  "create_project",
  "list_team_projects",
  "get_project",
  "update_project",
  "delete_project",
  "create_project_update",
  "list_project_updates",
  "update_project_update",
  "delete_project_update",
  "create_project_issue",
  "list_project_issues",
  "update_project_issue",
  "delete_project_issue",
  "list_team_activities",
  "create_team_task",
  "list_team_tasks",
  "get_team_task",
  "update_team_task",
  "delete_team_task",
]);

export const mcpCallSchema = z.object({
  tool: mcpToolNameSchema,
  arguments: z.record(z.string(), z.unknown()).default({}),
});
