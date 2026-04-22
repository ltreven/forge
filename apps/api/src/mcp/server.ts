import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProjectTools } from "./tools/projects";
import { registerTeamTools } from "./tools/teams";
import { registerRequestTools } from "./tools/requests";

export function createMcpServerForActor(actor: any, authHeader: string) {
  const server = new McpServer({
    name: "Forge MCP Server",
    version: "1.0.0",
  });

  // Register all tools and pass down the connection context
  registerProjectTools(server, actor, authHeader);
  registerTeamTools(server, actor, authHeader);
  registerRequestTools(server, actor, authHeader);

  return server;
}
