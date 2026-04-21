# TOOLS

> [!CAUTION]
> **CRITICAL RUNTIME WARNING**: You are in a restricted container.
> - **DO NOT** attempt to use `systemctl`, `systemd`, or `openclaw plugin` commands.
> - **DO NOT** attempt to use MCP for Project Management.
> - **PROJECT DATA**: Use the Forge REST API (via `curl`) or any other project management tools described in this document for all project/task work.

## Task Management

- Read and interpret the Kanban/project board
- Update task assignments
- Create new tasks when needed

## Team Management

- List team members
- Evaluate agent capabilities
- Suggest new agents if workload requires

## Model Strategy (Future Capability)

- Assess task complexity
- Recommend simpler or more advanced models
- Optimize cost vs performance

## Communication Monitoring

- Observe inter-agent communication
- Detect inefficiencies
- Intervene when necessary

## Agent-to-Agent Messaging (Message Bus)

You can send messages and delegate tasks to other agents in your team using the Forge message bus.

### send_to_agent

Dispatches an action to another agent via the workspace RabbitMQ exchange.
The target agent will receive your message and process it in its own session context.

**Endpoint:** `POST http://127.0.0.1:18780/send`

**Request body:**
```json
{
  "targetAgentId": "<uuid of the target agent>",
  "action": "delegate_task",
  "payload": {
    "task": "Implement the login screen",
    "context": "See Linear ticket ENG-42",
    "priority": "high"
  },
  "sessionKey": "<optional: use to continue an existing conversation>"
}
```

**Common actions:**
- `delegate_task` — assign a task with description and context
- `request_review` — ask an agent to review a PR or document
- `share_context` — share information relevant to ongoing work
- `chat_message` — free-form message (for collaboration)

**Response:**
```json
{
  "queued": true,
  "messageId": "<uuid>",
  "targetAgentId": "<uuid>",
  "sessionKey": "<session key used>"
}
```

**When to use:** Use this tool when you need to delegate work, coordinate a review, or share context with a specific team member. Prefer `delegate_task` for actionable work items.

---

## Project & Task Management (Forge API)

Your team's projects, project issues, and kanban tasks are managed directly through the Forge API.
All operations are automatically scoped to **your team** — you cannot access or modify another team's data.

**Authentication:** Include your gateway token on every request:
```
Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN
```

**Base URL:** (inside the cluster)
```
http://forge-api.forge.svc.cluster.local:4000
```

---

### Projects

Projects represent discrete, time-bounded initiatives tracked with health status.

| Action | Method | Path |
|--------|--------|------|
| Create project | `POST` | `/project-management/projects` |
| List my team's projects | `GET` | `/project-management/projects` |
| Get a project | `GET` | `/project-management/projects/:id` |
| Update a project | `PUT` | `/project-management/projects/:id` |
| Delete a project | `DELETE` | `/project-management/projects/:id` |

**Create / Update project fields:**
```json
{
  "title": "Q2 Platform Reliability",
  "shortSummary": "Reduce p99 latency by 30%",
  "descriptionMarkdown": "## Goal\n...",
  "status": 1,
  "priority": 2,
  "health": "on_track",
  "leadId": "<agent-uuid>",
  "startAt": { "kind": "date", "value": "2026-04-01" },
  "endAt": { "kind": "quarter", "value": "Q2 2026" }
}
```
`status`: 0=backlog, 1=planned, 2=in_progress, 3=paused, 4=completed  
`priority`: 0=none, 1=low, 2=medium, 3=high, 4=urgent  
`health`: `unknown` | `on_track` | `at_risk` | `off_track`  
`leadId`: must be a UUID of an agent on your team

---

### Project Updates (Health Reports)

Record health status changes for a project with a reason/narrative.

| Action | Method | Path |
|--------|--------|------|
| Add health update | `POST` | `/project-management/projects/:id/updates` |
| List health updates | `GET` | `/project-management/projects/:id/updates` |
| Edit an update | `PUT` | `/project-management/updates/:id` |
| Delete an update | `DELETE` | `/project-management/updates/:id` |

**Create update fields:**
```json
{
  "newHealth": "at_risk",
  "reason": "Two blockers on infra side. Escalating to engineering.",
  "happenedAt": "2026-04-21T09:00:00Z"
}
```
Creating an update also sets the project's `health` field automatically.

---

### Project Issues

Issues are tasks nested within a project. They represent concrete work items.

| Action | Method | Path |
|--------|--------|------|
| Create issue | `POST` | `/project-management/projects/:id/issues` |
| List project issues | `GET` | `/project-management/projects/:id/issues` |
| Get an issue | `GET` | `/project-management/issues/:id` |
| Update an issue | `PUT` | `/project-management/issues/:id` |
| Delete an issue | `DELETE` | `/project-management/issues/:id` |

**Create / Update issue fields:**
```json
{
  "title": "Implement rate limiter middleware",
  "shortSummary": "Protect public endpoints from abuse",
  "descriptionMarkdown": "## Acceptance Criteria\n...",
  "status": 0,
  "priority": 3,
  "assignedToId": "<agent-uuid>",
  "parentIssueId": "<uuid of parent issue, optional>"
}
```
`assignedToId`: must be a UUID of an agent on your team

---

### Team Tasks (Kanban)

Team Tasks are standalone tasks **not linked to a project** — the team's continuous kanban board.
Use these for maintenance work, support requests, and ad-hoc engineering tasks.

| Action | Method | Path |
|--------|--------|------|
| Create task | `POST` | `/project-management/tasks` |
| List my team's tasks | `GET` | `/project-management/tasks` |
| Get a task | `GET` | `/project-management/tasks/:id` |
| Update a task | `PUT` | `/project-management/tasks/:id` |
| Delete a task | `DELETE` | `/project-management/tasks/:id` |

**Create / Update task fields:**
```json
{
  "title": "Rotate expired SSL certificate",
  "shortSummary": "cert expired next Friday",
  "descriptionMarkdown": "## Steps\n...",
  "status": 0,
  "priority": 3,
  "assignedToId": "<agent-uuid>",
  "parentTaskId": "<uuid of parent task, optional>"
}
```

---

### Activity Feed

View a chronological log of all project-level changes made by your team.

| Action | Method | Path |
|--------|--------|------|
| Get team activity | `GET` | `/project-management/activities` |

---

### curl Examples

```bash
# Create a project
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Q3 Migration","health":"unknown","status":1,"priority":2}'

# Create a kanban task
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Update dependencies","priority":1}'

# List my team tasks
curl -s http://forge-api.forge.svc.cluster.local:4000/project-management/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```