// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { internalFetch } from "../client";

export function registerTeamTools(server: McpServer, actor: any, authHeader: string) {
  server.tool(
    "get_team",
    "Get details of a team by ID",
    {
      teamId: z.string().describe("The ID of the team"),
    },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/team?teamId=${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "update_team",
    "Update a team's details",
    {
      teamId: z.string().describe("The ID of the team"),
      name: z.string().optional().describe("New name of the team"),
    },
    async ({ teamId, name }) => {
      try {
        const payload = { name };
        const data = await internalFetch(`/team?teamId=${teamId}`, authHeader, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );

  server.tool(
    "list_team_members",
    "List all members (humans and agents) in a team",
    {
      teamId: z.string().describe("The ID of the team"),
    },
    async ({ teamId }) => {
      try {
        const data = await internalFetch(`/team/members?teamId=${teamId}`, authHeader);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err.message }] };
      }
    }
  );
}
