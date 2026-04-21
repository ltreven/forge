import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/authMiddleware";
import { failure, success } from "../lib/response";
import { mcpCallSchema } from "../schemas/mcp-project-management.schema";

export const mcpProjectManagementRouter = Router();
mcpProjectManagementRouter.use(authMiddleware);

type ToolDefinition = {
  description: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  argumentSchema: z.ZodTypeAny;
};

const tools: Record<string, ToolDefinition> = {
  create_project: {
    description: "Create a project for a team",
    method: "POST",
    path: "/project-management/projects",
    argumentSchema: z.object({
      teamId: z.string().uuid(),
      title: z.string(),
      shortSummary: z.string().nullable().optional(),
      descriptionMarkdown: z.string().nullable().optional(),
      descriptionRichText: z.any().nullable().optional(),
      startAt: z.object({ kind: z.enum(["date", "quarter"]), value: z.string() }).optional(),
      endAt: z.object({ kind: z.enum(["date", "quarter"]), value: z.string() }).optional(),
      status: z.number().int().min(0).max(4).optional(),
      priority: z.number().int().min(0).max(4).optional(),
      leadId: z.string().uuid().nullable().optional(),
      health: z.enum(["unknown", "on_track", "at_risk", "off_track"]).optional(),
    }),
  },
  list_team_projects: {
    description: "List projects by team",
    method: "GET",
    path: "/project-management/teams/:teamId/projects",
    argumentSchema: z.object({ teamId: z.string().uuid() }),
  },
  get_project: {
    description: "Get a project",
    method: "GET",
    path: "/project-management/projects/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  update_project: {
    description: "Update a project",
    method: "PUT",
    path: "/project-management/projects/:id",
    argumentSchema: z.object({ id: z.string().uuid() }).and(z.record(z.string(), z.unknown())),
  },
  delete_project: {
    description: "Delete a project",
    method: "DELETE",
    path: "/project-management/projects/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  create_project_update: {
    description: "Create a health update for a project",
    method: "POST",
    path: "/project-management/projects/:id/updates",
    argumentSchema: z.object({
      id: z.string().uuid(),
      happenedAt: z.string().optional(),
      newHealth: z.enum(["unknown", "on_track", "at_risk", "off_track"]),
      reason: z.string(),
    }),
  },
  list_project_updates: {
    description: "List updates for a project",
    method: "GET",
    path: "/project-management/projects/:id/updates",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  update_project_update: {
    description: "Update a project update entry",
    method: "PUT",
    path: "/project-management/updates/:id",
    argumentSchema: z.object({ id: z.string().uuid() }).and(z.record(z.string(), z.unknown())),
  },
  delete_project_update: {
    description: "Delete a project update entry",
    method: "DELETE",
    path: "/project-management/updates/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  create_project_issue: {
    description: "Create an issue in a project",
    method: "POST",
    path: "/project-management/projects/:id/issues",
    argumentSchema: z.object({
      id: z.string().uuid(),
      parentIssueId: z.string().uuid().nullable().optional(),
      title: z.string(),
      shortSummary: z.string().nullable().optional(),
      descriptionMarkdown: z.string().nullable().optional(),
      descriptionRichText: z.any().nullable().optional(),
      status: z.number().int().min(0).max(4).optional(),
      priority: z.number().int().min(0).max(4).optional(),
      assignedToId: z.string().uuid().nullable().optional(),
    }),
  },
  list_project_issues: {
    description: "List issues in a project",
    method: "GET",
    path: "/project-management/projects/:id/issues",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  update_project_issue: {
    description: "Update a project issue",
    method: "PUT",
    path: "/project-management/issues/:id",
    argumentSchema: z.object({ id: z.string().uuid() }).and(z.record(z.string(), z.unknown())),
  },
  delete_project_issue: {
    description: "Delete a project issue",
    method: "DELETE",
    path: "/project-management/issues/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  list_team_activities: {
    description: "List team project activities",
    method: "GET",
    path: "/project-management/teams/:teamId/activities",
    argumentSchema: z.object({ teamId: z.string().uuid() }),
  },
  create_team_task: {
    description: "Create a continuous kanban task in a team",
    method: "POST",
    path: "/project-management/teams/:teamId/tasks",
    argumentSchema: z.object({
      teamId: z.string().uuid(),
      parentTaskId: z.string().uuid().nullable().optional(),
      title: z.string(),
      shortSummary: z.string().nullable().optional(),
      descriptionMarkdown: z.string().nullable().optional(),
      descriptionRichText: z.any().nullable().optional(),
      status: z.number().int().min(0).max(4).optional(),
      priority: z.number().int().min(0).max(4).optional(),
      assignedToId: z.string().uuid().nullable().optional(),
    }),
  },
  list_team_tasks: {
    description: "List continuous tasks by team",
    method: "GET",
    path: "/project-management/teams/:teamId/tasks",
    argumentSchema: z.object({ teamId: z.string().uuid() }),
  },
  get_team_task: {
    description: "Get a team task",
    method: "GET",
    path: "/project-management/tasks/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
  update_team_task: {
    description: "Update a team task",
    method: "PUT",
    path: "/project-management/tasks/:id",
    argumentSchema: z.object({ id: z.string().uuid() }).and(z.record(z.string(), z.unknown())),
  },
  delete_team_task: {
    description: "Delete a team task",
    method: "DELETE",
    path: "/project-management/tasks/:id",
    argumentSchema: z.object({ id: z.string().uuid() }),
  },
};

function resolvePath(pathTemplate: string, args: Record<string, unknown>): string {
  return pathTemplate
    .replace(":teamId", String(args.teamId ?? ""))
    .replace(":id", String(args.id ?? ""));
}

function buildBody(method: string, args: Record<string, unknown>): Record<string, unknown> | undefined {
  if (method === "GET" || method === "DELETE") return undefined;

  const payload = { ...args };
  delete payload.id;
  return payload;
}

mcpProjectManagementRouter.get("/tools", (_req: Request, res: Response) => {
  res.json(
    success(
      Object.entries(tools).map(([name, def]) => ({
        name,
        description: def.description,
        method: def.method,
        path: def.path,
      }))
    )
  );
});

mcpProjectManagementRouter.post("/call", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = mcpCallSchema.parse(req.body);
    const toolDef = tools[parsed.tool];

    const args = toolDef.argumentSchema.parse(parsed.arguments) as Record<string, unknown>;
    const path = resolvePath(toolDef.path, args);
    const body = buildBody(toolDef.method, args);

    const origin = `${req.protocol}://${req.get("host")}`;
    const response = await fetch(`${origin}${path}`, {
      method: toolDef.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization ?? "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();
    res.status(response.status).json(success({ tool: parsed.tool, endpoint: path, result: json }));
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unexpected token")) {
      res.status(502).json(failure("MCP proxy received non-JSON response"));
      return;
    }

    next(err);
  }
});
