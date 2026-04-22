// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { internalFetch } from "../client";

export function registerRequestTools(server: McpServer, actor: any, authHeader: string) {
  server.tool(
    "list_requests",
    "List team requests (work requests for agents or team members)",
    {
      teamId: z.string().describe("The ID of the team"),
      status: z.string().optional().describe("Filter by status (e.g. 'created', 'processing', 'responded')"),
    },
    async ({ teamId, status }) => {
      try {
        let url = `/teams/${teamId}/requests?`;
        if (status) url += `status=${status}`;
        const data = await internalFetch(url, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "get_request",
    "Get details of a specific request",
    {
      teamId: z.string().describe("The ID of the team"),
      requestId: z.string().describe("The ID of the request"),
    },
    async ({ teamId, requestId }) => {
      try {
        const data = await internalFetch(`/teams/${teamId}/requests/${requestId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "create_request",
    "Create a new request for another agent in the team",
    {
      teamId: z.string().describe("The ID of the team"),
      targetAgentId: z.string().uuid().describe("The ID of the target agent that will process this request"),
      inputData: z.any().optional().describe("Input data or context for the target agent (JSON object or string)"),
      responseContract: z.string().optional().describe("Instructions on what the target agent should return (Markdown string)"),
      teamTaskId: z.string().uuid().optional().describe("Associated team task ID, if any"),
      projectIssueId: z.string().uuid().optional().describe("Associated project issue ID, if any"),
    },
    async ({ teamId, ...rest }) => {
      try {
        const payload = { requesterId: actor.id, requesterType: actor.type, ...rest };
        const data = await internalFetch(`/teams/${teamId}/requests`, authHeader, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "update_request_status",
    "Update the status of a request",
    {
      teamId: z.string().describe("The ID of the team"),
      requestId: z.string().describe("The ID of the request"),
      status: z.enum(["created", "processing", "responded", "rejected"]).describe("The new status"),
      responseStatusCode: z.number().optional().describe("Numeric status code (e.g. 200 for success, 400 for bad input, 500 for error). Required when status is responded or rejected"),
      responseMetadata: z.any().optional().describe("Data or result payload returned upon completion or rejection"),
    },
    async ({ teamId, requestId, status, responseStatusCode, responseMetadata }) => {
      try {
        const payload = { status, responseStatusCode, responseMetadata };
        const data = await internalFetch(`/teams/${teamId}/requests/${requestId}`, authHeader, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );
}
