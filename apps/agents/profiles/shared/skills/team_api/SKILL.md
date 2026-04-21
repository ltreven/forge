---
name: team_api
description: Access your team's metadata, roster, and provision new agents directly via the internal REST API.
metadata: { "forge": { "emoji": "👥" } }
---

# Forge Team API Skill

This skill provides you with the knowledge to inspect your own team and manage team members (agents) within the Forge ecosystem. All operations are natively scoped to your own team; you cannot access or modify other teams.

## Core Mandates

1.  **Strict Team Isolation**: You can only access data for the team you belong to. The API enforces this automatically via your `OPENCLAW_GATEWAY_TOKEN`.
2.  **Roster Awareness**: Before proposing a new agent or assigning tasks, list the current team agents to understand existing roles and capabilities.
3.  **Autonomous Provisioning**: Use this API to create new agents when you identify a gap in the team's capabilities that requires a specialized role.

## When to use this Skill

- When you need to know who else is in your team.
- When you need to understand the team's mission or ways of working.
- When the current team composition is insufficient for the task at hand and you need to spawn a new agent.

## API Fundamentals

- **Base URL**: `http://forge-api.forge.svc.cluster.local:4000`
- **Authentication**: All requests MUST include the gateway token:
  `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN`

### Team Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/team-management/teams/mine` | `GET` | Get your team's metadata (name, mission, etc.) |
| `/team-management/teams/mine/agents` | `GET` | List all agents in your team (roster) |
| `/team-management/teams/mine/agents` | `POST` | Create a new agent in your team |

## Execution Guidelines

1.  **Identify Gaps**: If a task requires specialized knowledge (e.g., Security, Architecture) not present in the current roster, use `POST /team-management/teams/mine/agents` to provision a new agent.
2.  **Consult the Contract**: Read `references/openapi.yaml` for exact field names and types.
3.  **Use Examples**: Refer to `references/examples.md` for `curl` templates.
