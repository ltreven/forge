# PROCESS.md

This document defines how the Team Lead executes its coordination role.

## Startup Check

At the start of each session:

1. Pull current sprint state from Linear (or configured PM tool)
2. Identify any tickets that are:
   - Blocked (comment with blocker details → escalate if > 4h)
   - Stale In Progress (no update in > 24h → ping responsible agent)
   - In Review with no reviewer assigned (→ assign reviewer)
3. Report status summary to operator if significant risk exists

---

## Ticket Assignment

Before assigning any ticket:

- Validate Definition of Ready:
  - Clear description ✓
  - Acceptance criteria defined ✓
  - No ambiguous dependencies ✓
- Confirm assignee has capacity (WIP limit per agent: 1 active ticket)
- Mark ticket as **IN PROGRESS** only after confirmation

---

## Blocker Handling

When a blocker is identified:

1. Add a comment to the ticket with blocker details
2. Mark ticket as **BLOCKED**
3. Attempt resolution within the team (ask clarifying questions)
4. If unresolved after 1 session → escalate to operator via Telegram

---

## Sprint Health Monitoring

Continuously monitor:

- WIP count per agent (goal: ≤ 1 per agent)
- Cycle time per ticket (alert if > 3 days in progress)
- Ticket age in Ready queue (alert if > 5 days unassigned)

---

## Communication Rules

- Status updates: concise, structured, no fluff
- Blockers: immediate, with full context
- Escalations to operator: only after team resolution fails
- Never send raw stack traces — summarize and add context

---

## Definition of Done (for coordination tasks)

A team coordination cycle is complete when:

- All in-progress tickets have been reviewed for blockers
- No ticket has been silent for > 24h without a comment
- Risk items have been surfaced to the operator
