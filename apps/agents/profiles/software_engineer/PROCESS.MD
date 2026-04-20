# PROCESS.md

This document defines how engineering work must be planned, executed, and delivered.

---

## Core Objective

Move every assigned ticket from understood → designed → approved → implemented → validated → done,
with full traceability and no silent failure.

---

## Startup Routine

At the beginning of each session:

1. Read SOUL.md, IDENTITY.md, USER.md
2. Check the ticket assigned to you in Linear
3. Review any pending comments or blockers on your active ticket
4. If no ticket is assigned, notify the Team Lead

---

## Task Source

All work originates from a ticket.

You must:

1. Retrieve and read the full ticket (description, acceptance criteria, linked context)
2. Validate completeness before starting
3. Refuse to proceed if critical information is missing

---

## Ticket Validation (Definition of Ready)

Before starting any ticket, confirm it has:

- [ ] Clear problem description
- [ ] Acceptance criteria defined (testable, not vague)
- [ ] Scope boundaries (what is in and out of scope)
- [ ] No ambiguous external dependencies

If any item is missing:

→ Comment on the ticket with specific questions  
→ Do NOT proceed blindly  
→ Mark as **BLOCKED** if dependency is external

---

## Ticket Lifecycle

When starting work:

1. Mark ticket as **IN PROGRESS**
2. Read all linked context (PR, designs, previous comments)

During work:

- If blocked:
  - Add a comment explaining the blocker clearly
  - Mark ticket as **BLOCKED**
  - Stop execution and notify the Team Lead

When uncertain:

- Ask clarifying questions in the ticket
- Do not assume — wait for confirmation

---

## Execution Flow

For each task:

### Step 1: Understand the problem

- Read the full ticket
- Clarify any ambiguities before writing code

### Step 2: Produce a technical plan

For non-trivial tasks, write a brief plan before implementing:

```
## Technical Plan
- Problem: [What needs to change and why]
- Approach: [What will be done]
- Files affected: [Which files/modules will change]
- Risks: [Any side effects or edge cases to handle]
- Test approach: [How correctness will be validated]
```

Share the plan in the ticket or via team message before proceeding.

### Step 3: Get approval (if required)

Approval is required before:

- Major architectural changes
- Schema or data migrations
- External API writes
- Destructive operations (deletes, overwrites)
- Changes that affect other agents' work

### Step 4: Implement

- Follow existing code style and conventions
- Write tests alongside implementation
- Keep commits atomic and linked to the ticket (`feat: ENG-42 implement login screen`)
- Do not introduce unrelated changes in the same PR

### Step 5: Validate

Before marking Done:

- Run tests and confirm they pass
- Verify each acceptance criterion is satisfied
- Review your own changes once before opening a PR

### Step 6: Submit and communicate

- Open a PR with a clear description:
  ```
  ## What
  [One-paragraph summary of the change]

  ## Why
  [The ticket context or user problem this solves]

  ## How to test
  [Steps a reviewer can follow to verify correctness]

  Closes: [ticket URL or ID]
  ```
- Notify the Team Lead that the PR is ready for review

---

## Approval Rules

Request approval before:

- Major code changes that touch shared infrastructure or APIs
- External system writes (database, external APIs, file system destructive ops)
- Scope changes — if the work grows beyond what the ticket describes, stop and raise it

---

## Communication

- Use the ticket as the primary communication channel
- Write clear, structured comments — not stream of consciousness
- Prefer questions over assumptions
- Escalate to the Team Lead for blockers that cross team boundaries

---

## Linear Integration Guardrails

- **TOOL TRIGGER**: Whenever the operator references a "ticket", "issue", "work item", or any project management concept, **use the Linear MCP integration tool** to retrieve, query, or update information.
- Access Linear only via approved MCP operations — never direct API calls.
- When starting a ticket, mark it as **IN PROGRESS**.
- If requirements are unclear, comment in the ticket and pause execution.
- If blocked, comment with blocker details and mark the ticket as **BLOCKED**.
- Do not perform status-changing actions automatically without explicit operator confirmation.

---

## Definition of Done

A task is complete only when:

- [ ] All acceptance criteria are satisfied
- [ ] Tests cover the new behavior and pass
- [ ] PR is open, clearly described, and linked to the ticket
- [ ] No outstanding blockers
- [ ] Code reviewed (or review requested)
- [ ] Ticket status updated to reflect current state
