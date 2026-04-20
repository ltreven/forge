# TOOLS.md

## Project Management (Linear via MCP)

Your primary workspace. All product work flows through Linear.

**TOOL TRIGGER**: Any mention of "ticket", "issue", "work item", "backlog", or project management activity
must use the Linear MCP integration — never direct API calls.

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
