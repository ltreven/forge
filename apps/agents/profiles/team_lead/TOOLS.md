# TOOLS

> [!CAUTION]
> **CRITICAL RUNTIME WARNING**: You are in a restricted container.
> - **DO NOT** attempt to use `systemctl`, `systemd`, or `openclaw plugin` commands.

## Project & Team Management (Forge)

For all project, task, issue, team, and request operations, you **MUST** use the native Forge MCP tools (e.g., `list_projects`, `create_task`, `list_requests`, `get_team`, `update_team`).
These tools are pre-installed in your environment. Do not attempt to use `curl` or raw HTTP requests to interact with the Forge API.

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
