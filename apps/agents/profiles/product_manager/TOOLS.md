# TOOLS.md

> [!CAUTION]
> **CRITICAL RUNTIME WARNING**: You are in a restricted container.
> - **DO NOT** attempt to use `systemctl`, `systemd`, or `openclaw plugin` commands.
> - **DO NOT** attempt to use MCP for Project Management.
> - **PROJECT DATA**: Use the Forge REST API (via `curl`) or any other project management tools described in this document for all project/task work.

## External Backlog (Linear via MCP)

Your primary external tool. Use Linear for cross-team visibility, roadmap, and stakeholder communication.

**TOOL TRIGGER**: Any mention of "backlog", sprint planning, roadmap, or cross-team coordination must use the Linear MCP integration.

Common operations:
- Query the current backlog (state, priority, assignees)
- Create new tickets using the ticket template (see PROCESS.md)
- Update ticket descriptions, acceptance criteria, and status
- Add comments with product decisions, clarifications, or blocker context
- Set and update priority ordering

**Rules:**
- All ticket updates must be done via MCP — never bypass with direct API calls
- Always add rationale when changing priority or scope
- Do not assign a ticket to engineering before it passes the Definition of Ready check

---

## Project & Task Management (Forge API)

For all project and task operations (creating/updating projects, issues, and tasks), you **MUST** use the `project_api` skill located in your workspace at `skills/project_api/`.

Do not attempt to construct API calls without consulting the `openapi.yaml` and instructions provided in that skill.

**Authentication:** Include your gateway token on every request:
```
Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN
```

**Base URL:** (inside the cluster)
```
http://forge-api.forge.svc.cluster.local:4000
```

---

## Agent-to-Agent Messaging (Message Bus)

You can communicate directly with other agents in your team using the Forge message bus.
Use this to coordinate with engineers, delegate product-related questions, or share context.

### send_to_agent

Dispatch a message via the workspace RabbitMQ exchange.

**Endpoint:** `POST http://127.0.0.1:18780/send`

**Request body:**
```json
{
  "targetAgentId": "<uuid of the target agent>",
  "action": "chat_message",
  "payload": {
    "task": "Priority for ENG-42 has changed — please pause current work",
    "context": "Operator confirmed new top priority is ENG-55",
    "priority": "high"
  },
  "sessionKey": "<optional: use to continue an existing conversation>"
}
```

**Common actions:**
- `chat_message` — general communication (priority changes, clarifications, context sharing)
- `delegate_task` — ask an agent to handle a specific product support task
- `share_context` — share product decisions or priority signals relevant to ongoing work

**Response:**
```json
{
  "queued": true,
  "messageId": "<uuid>",
  "targetAgentId": "<uuid>",
  "sessionKey": "<session key used>"
}
```

**When to use:** Communicate priority changes, scope decisions, or blocker resolutions to the Team Lead or specific engineers directly. Do not rely solely on ticket updates for time-sensitive changes.

---

## Product Documentation

For writing product artifacts (PRDs, decision logs, ADRs):

- Store product decisions in `memory/` (session) or `MEMORY.md` (stable, long-term)
- Use structured format: problem → decision → options considered → rationale → expected impact
- Link documentation back to the originating ticket where possible

---

## Memory

- Use `memory/` for session notes, in-progress refinement work, scratch analysis
- Use `MEMORY.md` for stable product knowledge: recurring patterns, stakeholder preferences, roadmap commitments
- Prefer structured entries: context → decision → rationale → expected impact
