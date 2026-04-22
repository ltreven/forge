// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { internalFetch } from "../client";

export function registerProjectTools(server: McpServer, actor: any, authHeader: string) {
  // PROJECTS
  server.tool(
    "list_projects",
    "List projects in a team",
    { teamId: z.string().describe("The ID of the team") },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/projects?teamId=${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "get_project",
    "Get details of a specific project",
    { projectId: z.string().describe("The ID of the project") },
    async ({ projectId }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "create_project",
    "Create a new project",
    {
      teamId: z.string().describe("The ID of the team"),
      title: z.string().describe("The title of the project"),
      shortSummary: z.string().optional().describe("Short summary of the project"),
      descriptionMarkdown: z.string().optional().describe("Markdown description"),
      status: z.number().optional().describe("Status code (default 1)"),
      priority: z.number().optional().describe("Priority (1-5)"),
    },
    async (params) => {
      try {
        const data = await internalFetch("/projects", authHeader, {
          method: "POST",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "update_project",
    "Update an existing project",
    {
      projectId: z.string().describe("The ID of the project"),
      title: z.string().optional().describe("The title of the project"),
      status: z.number().optional().describe("Status code"),
      priority: z.number().optional().describe("Priority (1-5)"),
    },
    async ({ projectId, ...params }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}`, authHeader, {
          method: "PUT",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "delete_project",
    "Delete an existing project",
    { projectId: z.string().describe("The ID of the project") },
    async ({ projectId }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}`, authHeader, { method: "DELETE" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  // TASKS
  server.tool(
    "list_tasks",
    "List tasks in a team",
    { teamId: z.string().describe("The ID of the team") },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/tasks?teamId=${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "get_task",
    "Get details of a specific task",
    { taskId: z.string().describe("The ID of the task") },
    async ({ taskId }) => {
      try {
        const data = await internalFetch(`/tasks/${taskId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "create_task",
    "Create a new team task",
    {
      teamId: z.string().describe("The ID of the team"),
      title: z.string().describe("The title of the task"),
      descriptionMarkdown: z.string().optional().describe("Markdown description"),
      parentTaskId: z.string().optional().describe("ID of parent task if it's a subtask"),
      status: z.number().optional().describe("Status code"),
      priority: z.number().optional().describe("Priority"),
      assignedToId: z.string().optional().describe("User/Agent ID assigned to this task"),
    },
    async (params) => {
      try {
        const data = await internalFetch("/tasks", authHeader, {
          method: "POST",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "update_task",
    "Update an existing task",
    {
      taskId: z.string().describe("The ID of the task"),
      title: z.string().optional().describe("The title of the task"),
      status: z.number().optional().describe("Status code"),
      priority: z.number().optional().describe("Priority"),
    },
    async ({ taskId, ...params }) => {
      try {
        const data = await internalFetch(`/tasks/${taskId}`, authHeader, {
          method: "PUT",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "delete_task",
    "Delete an existing task",
    { taskId: z.string().describe("The ID of the task") },
    async ({ taskId }) => {
      try {
        const data = await internalFetch(`/tasks/${taskId}`, authHeader, { method: "DELETE" });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  // ISSUES
  server.tool(
    "list_project_issues",
    "List issues in a specific project",
    { projectId: z.string().describe("The ID of the project") },
    async ({ projectId }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}/issues`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "create_project_issue",
    "Create an issue in a project",
    {
      projectId: z.string().describe("The ID of the project"),
      title: z.string().describe("The title of the issue"),
      descriptionMarkdown: z.string().optional().describe("Markdown description"),
      status: z.number().optional().describe("Status code"),
      priority: z.number().optional().describe("Priority"),
    },
    async ({ projectId, ...params }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}/issues`, authHeader, {
          method: "POST",
          body: JSON.stringify(params),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  // ACTIVITIES
  server.tool(
    "list_activities",
    "List activities/events in a team",
    { teamId: z.string().describe("The ID of the team") },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/activities?teamId=${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  // COMMENTS
  server.tool(
    "list_project_comments",
    "List comments on a project",
    { projectId: z.string().describe("The ID of the project") },
    async ({ projectId }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}/comments`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "create_project_comment",
    "Add a comment to a project",
    {
      projectId: z.string().describe("The ID of the project"),
      content: z.string().describe("The comment content"),
    },
    async ({ projectId, content }) => {
      try {
        const data = await internalFetch(`/projects/${projectId}/comments`, authHeader, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "list_issue_comments",
    "List comments on an issue",
    { issueId: z.string().describe("The ID of the issue") },
    async ({ issueId }) => {
      try {
        const data = await internalFetch(`/issues/${issueId}/comments`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );

  server.tool(
    "create_issue_comment",
    "Add a comment to an issue",
    {
      issueId: z.string().describe("The ID of the issue"),
      content: z.string().describe("The comment content"),
    },
    async ({ issueId, content }) => {
      try {
        const data = await internalFetch(`/issues/${issueId}/comments`, authHeader, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) { return { isError: true, content: [{ type: "text", text: err.message }] }; }
    }
  );
}
