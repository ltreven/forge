# TOOLS.md

> [!CAUTION]
> **CRITICAL RUNTIME WARNING**: You are in a restricted container.
> - **DO NOT** attempt to use `systemctl`, `systemd`, or `openclaw plugin` commands.
> - **DO NOT** attempt to use MCP for Project Management.
> - **PROJECT DATA**: Use the Forge REST API (via `curl`) or any other project management tools described in this document for all project/task work.

## Version Control (Git)

Your primary delivery mechanism. Use for:

- Branching per ticket (branch name: `feat/ENG-42-short-description`)
- Atomic commits with Conventional Commits format:
  - `feat: ENG-42 add user login screen`
  - `fix: ENG-15 handle null response from auth service`
  - `refactor: ENG-30 extract shared validation logic`
- Opening pull requests with full description (see PROCESS.md for PR template)

**Rules:**
- Never commit directly to `main` or `master`
- Never commit secrets or credentials
- Keep PRs focused on a single ticket's scope

---

## Task Tracking (Linear via MCP)

**TOOL TRIGGER**: For Linear tickets — sprint issues, epics, and team backlog — use the Linear MCP integration.

Common operations:
- Retrieve your assigned ticket and full details
- Update ticket status (In Progress, Blocked, In Review, Done)
- Add comments with technical findings, blockers, or questions
- Link PRs to tickets

---

## Project & Task Management (Forge API)

Use this for your **team's own projects, project issues, and kanban tasks** managed within Forge.
Unlike Linear (external), this is your team's internal workspace. All operations are automatically scoped to your team — you cannot read or modify another team's data.

**Authentication:** Include your gateway token on every request:
```
Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN
```

**Base URL:** (inside the cluster)
```
http://forge-api.forge.svc.cluster.local:4000
```

### Projects

| Action | Method | Path |
|--------|--------|------|
| Create project | `POST` | `/project-management/projects` |
| List my team's projects | `GET` | `/project-management/projects` |
| Get a project | `GET` | `/project-management/projects/:id` |
| Update a project | `PUT` | `/project-management/projects/:id` |
| Delete a project | `DELETE` | `/project-management/projects/:id` |

`status`: 0=backlog, 1=planned, 2=in_progress, 3=paused, 4=completed  
`priority`: 0=none, 1=low, 2=medium, 3=high, 4=urgent  
`health`: `unknown` | `on_track` | `at_risk` | `off_track`

### Project Issues

Issues are concrete work items nested within a project.

| Action | Method | Path |
|--------|--------|------|
| Create issue | `POST` | `/project-management/projects/:id/issues` |
| List project issues | `GET` | `/project-management/projects/:id/issues` |
| Get an issue | `GET` | `/project-management/issues/:id` |
| Update an issue | `PUT` | `/project-management/issues/:id` |
| Delete an issue | `DELETE` | `/project-management/issues/:id` |

`assignedToId` must be an agent UUID from your team.

### Team Tasks (Kanban)

Standalone tasks not tied to a project — your team's continuous kanban board.

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
# Create a project issue
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects/<project-id>/issues \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Add rate limiter","priority":3,"status":0}'

# Mark a task as done (status=4)
curl -s -X PUT http://forge-api.forge.svc.cluster.local:4000/project-management/tasks/<task-id> \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":4}'
```

---

## Terminal & File System

For code navigation, running tests, and executing build commands.

**Rules:**
- Prefer read operations first (understand before modifying)
- Never run destructive commands without approval (see SAFETY.md)
- Always run tests after implementation before opening a PR

---

## Agent-to-Agent Messaging (Message Bus)

You can communicate with other agents in your team using the Forge message bus.

### send_to_agent

Dispatch a message or share context with another agent via the workspace RabbitMQ exchange.

**Endpoint:** `POST http://127.0.0.1:18780/send`

**Request body:**
```json
{
  "targetAgentId": "<uuid of the target agent>",
  "action": "chat_message",
  "payload": {
    "task": "PR ENG-42 is ready for review",
    "context": "See pull request linked in the ticket",
    "priority": "normal"
  },
  "sessionKey": "<optional: use to continue an existing conversation>"
}
```

**Common actions:**
- `chat_message` — general communication (status, questions, context sharing)
- `request_review` — ask the Team Lead or another engineer to review a PR or document
- `share_context` — share information relevant to ongoing work

**Response:**
```json
{
  "queued": true,
  "messageId": "<uuid>",
  "targetAgentId": "<uuid>",
  "sessionKey": "<session key used>"
}
```

**When to use:** Notify the Team Lead when a ticket is blocked, a PR is ready, or clarification is needed from another team member.

---

## Memory

- Use `memory/` for session notes, in-progress context, scratch pad
- Use `MEMORY.md` for architectural decisions, recurring patterns, stable conventions
- Prefer structured entries: context → decision → rationale
