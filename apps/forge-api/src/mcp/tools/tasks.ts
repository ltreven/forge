// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { internalFetch } from "../client";

export function registerTaskTools(server: McpServer, actor: any, authHeader: string) {
  server.tool(
    "list_tasks",
    "List all tasks for a team",
    {
      teamId: z.string().describe("The ID of the team"),
    },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/tasks/by-team/${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "list_subtasks",
    "List all subtasks of a specific task",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the parent task"),
    },
    async ({ idOrIdentifier }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}/subtasks`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "get_task",
    "Get a single task by ID or identifier (e.g. PRD-1)",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the task"),
    },
    async ({ idOrIdentifier }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "create_task",
    "Create a new task for a team",
    {
      teamId: z.string().describe("The ID of the team"),
      title: z.string().describe("The title of the task"),
      shortSummary: z.string().optional().describe("A short summary of the task"),
      descriptionMarkdown: z.string().optional().describe("The task description in markdown"),
      status: z.number().optional().describe("0: Backlog, 1: To Do, 2: In Progress, 3: In Review, 4: Done, 5: Cancelled"),
      priority: z.number().optional().describe("0: None, 1: Low, 2: Medium, 3: High, 4: Urgent"),
      assignedToId: z.string().optional().describe("Agent ID or User ID assigned to the task"),
      parentTaskId: z.string().optional().describe("ID of the parent task if this is a subtask"),
    },
    async (params) => {
      try {
        const data = await internalFetch(`/tasks`, authHeader, {
          method: "POST",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "update_task",
    "Update an existing task by ID or identifier",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the task"),
      title: z.string().optional(),
      shortSummary: z.string().optional(),
      descriptionMarkdown: z.string().optional(),
      status: z.number().optional(),
      priority: z.number().optional(),
      assignedToId: z.string().optional(),
    },
    async ({ idOrIdentifier, ...body }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}`, authHeader, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "delete_task",
    "Delete a task by ID or identifier",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the task"),
    },
    async ({ idOrIdentifier }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}`, authHeader, {
          method: "DELETE",
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "list_task_comments",
    "List comments for a task",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the task"),
    },
    async ({ idOrIdentifier }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}/comments`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "create_task_comment",
    "Create a comment on a task",
    {
      idOrIdentifier: z.string().describe("The ID or human-readable identifier of the task"),
      content: z.string().describe("The comment body"),
    },
    async ({ idOrIdentifier, content }) => {
      try {
        const data = await internalFetch(`/tasks/${idOrIdentifier}/comments`, authHeader, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );
}
