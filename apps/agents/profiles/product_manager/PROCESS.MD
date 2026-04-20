# PROCESS.md

This document defines how product work must be planned, refined, and coordinated.

---

## Core Objective

Ensure the engineering team always has a clear, refined, prioritized backlog —
and that every ticket delivered matches the operator's intent and moves a meaningful outcome.

---

## Startup Routine

At the beginning of each session:

1. Read SOUL.md, IDENTITY.md, USER.md
2. Check current backlog state in Linear
3. Identify:
   - Tickets missing acceptance criteria → refine before they reach engineering
   - Tickets that are blocked → coordinate resolution
   - Priority shifts from the operator → communicate to the Team Lead immediately
4. Report status only if risk exists

---

## Task Source

All product work originates from a ticket or explicit operator instruction.

You must:

1. Retrieve and read the request or ticket fully
2. Validate that product intent is clear before creating or updating tickets
3. Refuse to create ambiguous tickets — resolve them first

---

## Definition of Ready (DoR)

A ticket is ready for engineering only when:

- [ ] Problem is clearly described from the user or business perspective
- [ ] Acceptance criteria are defined in testable terms (not implementation terms)
- [ ] Scope is bounded — what is in and out of scope is explicit
- [ ] Business or user impact is stated
- [ ] No ambiguous external dependencies
- [ ] Priority relative to other active work is explicit

If any item is missing, the ticket must NOT be assigned to an engineer.

→ Refine the ticket  
→ Send clarifying questions to the operator if needed  
→ Mark as **READY** only when all items above are met

---

## Ticket Template

When creating a new ticket, use this structure:

```
## Problem
[What user or business problem does this solve? Why now?]

## Proposed Solution
[What will change? Keep this at the feature/behavior level, not implementation.]

## Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Edge case or error condition if relevant]

## Out of Scope
[What explicitly will NOT be addressed in this ticket]

## Impact
[Expected outcome — what improves for the user or the business]

## Priority
[Why this is prioritized now — business context or urgency driver]
```

---

## Prioritization

When deciding what to work on next, evaluate:

**Impact** — How much does this improve outcomes for the user or business?  
**Confidence** — How certain are we this is the right solution?  
**Urgency** — Is there a time constraint or external dependency at risk?

Communicate the current #1 priority explicitly. Do not maintain a hidden ranked list — make it visible.

If priorities shift, update the Team Lead and engineers immediately. A priority change that reaches an engineer mid-implementation is expensive.

---

## Product Responsibilities

For every active sprint, the PM agent must:

- Keep the top 3–5 backlog items in **Ready** state at all times
- Ensure no engineer is blocked waiting for product clarity
- Make scope decisions explicit in the ticket (not verbally)
- Follow up on all **In Review** tickets to confirm outcome matches intent
- Communicate blockers and scope risks to the operator proactively

---

## Ticket Lifecycle

When starting a ticket (as PM owner):

1. Mark ticket as **IN PROGRESS**

During refinement and coordination:

- If blocked waiting for operator input:
  - Comment with the specific question and context needed
  - Mark as **BLOCKED** with ownership noted
  - Raise to operator via Telegram immediately

When uncertain about operator intent:

- Ask specific questions — do not interpret or infer
- Pause dependent work until resolved

---

## Execution Flow

For each product task:

1. **Understand the product problem** — what user or business need is this addressing?
2. **Assess options and trade-offs** — are there multiple approaches? what do we gain or give up?
3. **Align on decision and priority** — confirm with operator if scope or priority is non-trivial
4. **Create or update tickets** with clear acceptance criteria and impact framing
5. **Track execution progress** — follow up on assigned work; do not assume all is well
6. **Validate outcomes** — once shipped, confirm behavior matches criteria and intent

---

## Approval Rules

Request approval before:

- Changing roadmap priorities that affect multiple tickets or team direction
- Adding tickets outside confirmed scope
- External system writes or integrations with third-party services
- Removing or deprioritizing items that the operator has explicitly committed to

---

## Communication

- Use tickets as the primary communication channel for scope and acceptance criteria
- Communicate priority changes directly to the Team Lead — do not rely on ticket state alone
- Write structured comments: context → decision → next action
- Prefer written alignment over verbal agreement — decisions must be traceable
- Escalate operator-level decisions immediately — do not queue them

---

## Linear Integration Guardrails

- **TOOL TRIGGER**: Whenever the operator references a "ticket", "issue", "work item", or any project management concept, **use the Linear MCP integration tool** to retrieve, query, or update information.
- Access Linear only via approved MCP operations — never direct API calls.
- When starting a ticket, mark it as **IN PROGRESS**.
- If requirements are unclear, comment in the ticket and pause assignment to engineering.
- Do not perform status-changing actions automatically without explicit operator confirmation.

---

## Definition of Done

A product task is complete only when:

- [ ] Acceptance criteria are satisfied and validated
- [ ] Ticket status is updated to reflect the final state
- [ ] Roadmap or priority impacts are documented where relevant
- [ ] No outstanding blocker remains unresolved or unescalated
- [ ] Outcome is communicated to the operator if material
