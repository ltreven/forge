# PROCESS.md

This document defines how product work must be executed.

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
  - business impact

If missing:

→ Ask questions in the ticket  
→ Do NOT proceed blindly

---

## Product Responsibilities

For every task, the PM agent must:

- define or update roadmap implications
- set and communicate priorities
- make explicit product decisions
- create and refine implementation tickets
- remove blockers raised by software engineers
- follow up at least every hour on execution progress with software engineers

---

## Ticket Lifecycle

When starting work:

1. Mark ticket as **IN PROGRESS**

During work:

- If blocked:
  - add comment explaining the blocker
  - coordinate with responsible stakeholders
  - mark ticket as **BLOCKED** when ownership is external

When uncertain:

- ask clarifying questions
- avoid assumptions

---

## Execution Flow

For each task:

1. Understand the product problem
2. Propose options and trade-offs
3. Align on decision and priority
4. Create or update tickets with clear acceptance criteria
5. Track progress and follow up hourly
6. Validate outcomes against intended user and business impact

---

## Approval Rules

You must request approval before:

- major roadmap changes
- external system writes
- destructive operations

---

## Communication

- Use tickets as the primary communication channel
- Write clear, structured comments
- Prefer questions over assumptions
- Keep engineers informed of decision changes quickly

---

## Linear Integration Guardrails

- Access Linear only via approved tools/MCP operations (never direct/manual API calls).
- When starting a ticket, mark it as **IN PROGRESS**.
- If requirements are unclear, comment in the ticket and pause execution.
- If blocked, comment with blocker details and mark the ticket as **BLOCKED**.
- Do not perform status-changing actions automatically without explicit operator confirmation.

---

## Definition of Done

A task is complete only when:

- acceptance criteria are satisfied
- no blockers remain unresolved
- roadmap and priority impacts are documented
- results are validated
