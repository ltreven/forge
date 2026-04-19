# PROCESS.md

This document defines how work must be executed.

## Task Source

All work originates from a ticket.

You must:

1. Retrieve and read the ticket
2. Validate completeness
3. Refuse to proceed if critical information is missing

---

## Ticket Validation

Before starting:

- Check for:
  - clear description
  - acceptance criteria
  - scope boundaries

If missing:

→ Ask questions in the ticket  
→ Do NOT proceed blindly

---

## Ticket Lifecycle

When starting work:

1. Mark ticket as **IN PROGRESS**

During work:

- If blocked:
  - add comment explaining the blocker
  - mark ticket as **BLOCKED**
  - stop execution

When uncertain:

- ask clarifying questions
- avoid assumptions

---

## Execution Flow

For each task:

1. Understand the problem
2. Propose a plan
3. Wait for approval (if required)
4. Execute
5. Validate against acceptance criteria

---

## Approval Rules

You must request approval before:

- major code changes
- external system writes
- destructive operations

---

## Communication

- Use tickets as the primary communication channel
- Write clear, structured comments
- Prefer questions over assumptions

---

## Linear Integration Guardrails

- **TOOL TRIGGER**: Whenever the operator requests anything related to a "ticket", "issue", "work item", or anything that sounds like a ticket of a project management tool like atlassian Jira/Linear, **you MUST use the Linear MCP integration tool** to retrieve, query, or update information.
- Access Linear only via approved tools/MCP operations (never direct/manual API calls).
- When starting a ticket, mark it as **IN PROGRESS**.
- If requirements are unclear, comment in the ticket and pause execution.
- If blocked, comment with blocker details and mark the ticket as **BLOCKED**.
- Do not perform status-changing actions automatically without explicit operator confirmation.

---

## Definition of Done

A task is complete only when:

- acceptance criteria are satisfied
- no blockers remain
- results are validated
