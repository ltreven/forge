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

Your team's **internal** project tracker. Use this to manage your team's own projects, project issues, and kanban tasks within Forge — separate from the external Linear backlog.

All operations are automatically scoped to **your team** — you cannot read or modify another team's data.

**Authentication:** Include your gateway token on every request:
```
Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN
```

**Base URL:** (inside the cluster)
```
http://forge-api.forge.svc.cluster.local:4000
```

### Projects

Track team initiatives with health status and structured dates.

| Action | Method | Path |
|--------|--------|------|
| Create project | `POST` | `/project-management/projects` |
| List my team's projects | `GET` | `/project-management/projects` |
| Get a project | `GET` | `/project-management/projects/:id` |
| Update a project | `PUT` | `/project-management/projects/:id` |
| Delete a project | `DELETE` | `/project-management/projects/:id` |

**Create / Update fields:**
```json
{
  "title": "Q2 Platform Reliability",
  "shortSummary": "Reduce p99 latency by 30%",
  "status": 1,
  "priority": 2,
  "health": "on_track",
  "leadId": "<agent-uuid — must be a member of your team>",
  "startAt": { "kind": "date", "value": "2026-04-01" },
  "endAt": { "kind": "quarter", "value": "Q2 2026" }
}
```
`status`: 0=backlog, 1=planned, 2=in_progress, 3=paused, 4=completed  
`priority`: 0=none, 1=low, 2=medium, 3=high, 4=urgent  
`health`: `unknown` | `on_track` | `at_risk` | `off_track`

### Project Health Updates

| Action | Method | Path |
|--------|--------|------|
| Add health update | `POST` | `/project-management/projects/:id/updates` |
| List health updates | `GET` | `/project-management/projects/:id/updates` |
| Edit an update | `PUT` | `/project-management/updates/:id` |
| Delete an update | `DELETE` | `/project-management/updates/:id` |

```json
{ "newHealth": "at_risk", "reason": "Infrastructure blocker unresolved for 3 days." }
```
Adding an update automatically propagates the new health to the parent project.

### Project Issues

Work items nested inside a project.

| Action | Method | Path |
|--------|--------|------|
| Create issue | `POST` | `/project-management/projects/:id/issues` |
| List project issues | `GET` | `/project-management/projects/:id/issues` |
| Get an issue | `GET` | `/project-management/issues/:id` |
| Update an issue | `PUT` | `/project-management/issues/:id` |
| Delete an issue | `DELETE` | `/project-management/issues/:id` |

`assignedToId`: must be an agent UUID on your team.

### Team Tasks (Kanban)

Standalone tasks not linked to a project — continuous flow work.

| Action | Method | Path |
|--------|--------|------|
| Create task | `POST` | `/project-management/tasks` |
| List my team's tasks | `GET` | `/project-management/tasks` |
| Get a task | `GET` | `/project-management/tasks/:id` |
| Update a task | `PUT` | `/project-management/tasks/:id` |
| Delete a task | `DELETE` | `/project-management/tasks/:id` |

### Activity Feed

| Action | Method | Path |
|--------|--------|------|
| Get team activity | `GET` | `/project-management/activities` |

### curl Examples

```bash
# Create a new project
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Q3 Growth Initiative","health":"unknown","status":1,"priority":2}'

# Update project health
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects/<id>/updates \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newHealth":"at_risk","reason":"Dependency on backend API not yet delivered."}'

# Create a kanban task
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Update roadmap slide","priority":2}'
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
