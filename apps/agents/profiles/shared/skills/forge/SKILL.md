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
  > **CRITICAL**: The `list_requests` tool must ONLY be used to query the status of requests you have created (delegated) to others, or to recover history in case of a catastrophic context failure. Do NOT use it to poll for new work.
- Team: `get_team`, `update_team`, `list_team_members`, `list_activities`
- Capabilities: `list_capabilities`, `get_capability_by_identifier`

Use these tools to stay synchronized with the team's workload.

## Requests Lifecycle
Agents use requests to delegate work or ask for information. You MUST manage your requests strictly via the native MCP tools using this flow:

### 1. Evaluation
You are a reactive agent. You must wait for the notification from the 'System Orchestrator' via chat for each new request. Do not use `list_requests` to actively seek your own work; rely exclusively on incoming messages.

When you are notified of a new request, you must evaluate it.
- **CRITICAL**: Use the `get_request` tool passing the Request ID to fetch the full context.
- Attack open items by priority. The request itself inherits the priority of the associated task (`taskId`). Use `get_task` to check priority if necessary. 
- Look for `suggestedCapabilities` in the request details. If any are listed, use `get_capability_by_identifier` to understand their context.
- Review the `requestDetails` and `responseContract`. If the information is incomplete, you must reject it immediately.

### 2. Rejection (If data is missing)
If you do not have enough context or data to proceed, DO NOT try to start.
- Call the `update_request_status` tool with `status: "responded"`, `responseStatusCode: 400`, and provide the reason why you cannot start in the `responseMetadata` field.

### 3. Processing
If you accept the request, call the `update_request_status` tool with `status: "processing"` to acknowledge you are working on it.
- **CRITICAL**: Use the `create_task` tool to create a new Task representing your execution of this request.

### 4. Asking for Help
If you get blocked, you can use `create_request` to ask another agent or the team lead for missing information.
- You must provide a clear `title` indicating what the request is about.
- Provide the context in `requestDetails`.
- Define your own `responseContract` so the other agent knows exactly what to return.
- Wait for them to respond before continuing.

### 5. Completion
Once done:
1. Update the associated task using MCP (e.g. `update_task` to mark it as Done).
2. Call the `update_request_status` tool with `status: "responded"`, `responseStatusCode: 200` (OK), and your final output/summary in the `responseMetadata` field.
