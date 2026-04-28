# FORGE TEAM OPERATING MODEL

> [!IMPORTANT]
> **CRITICAL CONTEXT:** Whenever we discuss Process, Capabilities, Requests, and Tasks, these are **exclusive entities of the FORGE application** (which acts as the agent orchestration layer). 
> You **MUST** use the **FORGE MCP** to manage these entities and their workflows. Do not confuse them with external systems or general concepts.

This document explains how a Forge Team operates to fulfill requests using:
- Capabilities (what the team can do)
- Skills (what agents can do)
- Tasks (what is being executed)
- Requests (how agents collaborate)
- Events (how work progresses)

---

## 1. CORE CONCEPTS

### Team
A Team is a group of agents working together to fulfill requests.

Each team has:
- Agents
- Capabilities
- Shared context
- Access to tools and integrations

---

### Agent
An Agent is an executor.

Each agent has:
- A role (e.g. Product Manager, Engineer, Team Lead)
- A set of Skills (what it knows how to do)
- The ability to:
  - Execute tasks
  - Create and respond to requests
  - Produce events

---

### Skill (Agent-level)
A Skill is a concrete ability of an agent.

Examples:
- Write user stories
- Call an API (Linear, GitHub, Jira)
- Analyze logs
- Review code
- Generate code

Skills are **how work gets done**, not what the team offers.

---

### Capability (Team-level)
A Capability defines what the team can deliver.

It is NOT execution. It is a contract.

Each capability defines:
- Inputs
- Expected output
- Instructions
- Who can execute (roles or agents)
- Required skills
- Events it produces
- Events that may suggest using it

#### Example

Capability: `Write User Story`

- Inputs:
  - feature request
  - business context

- Output:
  - structured user story
  - acceptance criteria

- Executable by:
  - Product Manager Agent
  - Team Lead Agent

- Requires skills:
  - product_discovery
  - writing

- Produces events:
  - user_story_written

- Suggested triggers:
  - feature_requested

---

### Event
An Event is a fact that something happened.

Events are used to:
- Signal progress
- Suggest next steps
- Connect capabilities

Examples:
- feature_requested
- user_story_written
- bug_triaged
- PR_created
- PR_reviewed

Events DO NOT force execution.
Agents decide what to do next.

---

### Task
A Task represents work being executed.

A task is usually an instance of a Capability.

Each task has:
- Goal
- Inputs
- Status (todo, in_progress, blocked, done)
- Assignee
- Related capability
- Produced events

#### Example

Task: `Write user story for feature X`
- Capability: Write User Story
- Status: in_progress
- Assignee: Product Manager Agent

---

### Request
A Request is how agents collaborate.

It is a formal ask from one actor to another.

Each request has:
- Sender
- Target (agent, role, or team)
- Payload (what is being asked)
- Status:
  - draft
  - open
  - in_progress
  - waiting_user
  - completed
  - cancelled
- Linked task
- Response (result)

Requests are the backbone of coordination.

---

### Response
A Response is the result of a Request.

It must:
- Answer the request
- Provide outputs
- Trigger next actions if needed

---

## 2. HOW WORK FLOWS

### Step 1 — A Request is created

A human or agent creates a request to ask for work to be done.

Example:
> "Implement feature X"

This creates:
- A Request

It does NOT automatically create a task.

---

### Step 2 — The Request is assigned

The Request is assigned to an Agent (either manually by a human or automatically by the system).
The assigned Agent receives a push message via chat notifying them of the new Request with its ID.

> [!WARNING]
> Agents are entirely reactive. You must wait for the incoming notification message for each new request. Polling for tasks, implementing a "heartbeat", or actively querying `list_requests` to find your own work is expressly forbidden to conserve tokens.

**CRITICAL**: The agent MUST use the Forge MCP `get_request` tool to fetch the details of this Request before proceeding.

---

### Step 3 — The Agent creates a Task

After evaluating the request, the assigned Agent MUST create a Task using the Forge MCP `create_task` tool to document their unit of work.

```text
Task: Implement feature X
Status: in_progress
Assignee: Team Lead Agent
```

---

### Step 4 — The Agent executes the work

The Agent performs the necessary actions (e.g., writing code, calling APIs, creating subtasks).

---

### Step 5 — The Request is completed

Once the task is completely finished (whether successful or failed), the Agent MUST update the Request status to `completed` using the `update_request_status` MCP tool and provide a final response and `resolution` (`success` or `failed`) back to the requester.