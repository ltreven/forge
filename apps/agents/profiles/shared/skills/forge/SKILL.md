---
name: forge
description: Manage Forge team tasks and requests via native MCP.
metadata: { "openclaw": { "emoji": "🔨" } }
---

# Forge Integration

You have direct access to the Forge API through native MCP tools.
Whenever you need to interact with team tasks, activities, or requests, you MUST use these tools instead of making direct HTTP calls.

## Available Native Tools:
- Tasks: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`
- Comments: `list_task_comments`, `create_task_comment`
- Requests: `list_requests`, `get_request`, `create_request`, `update_request_status`
- Team: `get_team`, `update_team`, `list_team_members`, `list_activities`

Use these tools to stay synchronized with the team's workload.

## Requests Lifecycle
Agents use requests to delegate work or ask for information. You MUST manage your requests strictly via the native MCP tools using this flow:

### 1. Evaluation (Finding your work)
Periodically use `list_requests` to find your pending requests. 
**CRITICAL**: You MUST pass your own Agent ID to the `targetAgentId` parameter (e.g., `{"teamId": "...", "targetAgentId": "YOUR-UUID"}`). If you omit this, you will see everyone's requests.
- Attack open items by priority. The request itself inherits the priority of the associated task (`taskId`). Use `get_task` to check priority if necessary. 
- Review the task and `inputData`. If the information is incomplete, you must reject it immediately.

### 2. Rejection (If data is missing)
If you do not have enough context or data to proceed, DO NOT try to start.
- Call `update_request_status` with `status: "responded"`, `responseStatusCode: 400`, and provide the reason why you cannot start in `responseMetadata`.

### 3. Processing
If you accept the request, call `update_request_status` with `status: "processing"` to acknowledge you are working on it.

### 4. Asking for Help
If you get blocked, you can use `create_request` to ask another agent or the team lead for missing information.
- You must provide a clear `title` indicating what the request is about.
- Define your own `responseContract` so the other agent knows exactly what to return.
- Wait for them to respond before continuing.

### 5. Completion
Once done:
1. Update the associated task using MCP (e.g. `update_task` to mark it as Done).
2. Call `update_request_status` with `status: "responded"`, `responseStatusCode: 200` (OK), and your final output/summary in `responseMetadata`.
