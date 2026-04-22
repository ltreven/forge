---
name: forge
description: Manage Forge team projects, tasks, and requests via native MCP.
metadata: { "openclaw": { "emoji": "🔨" } }
---

# Forge Integration

You have direct access to the Forge API through native MCP tools.
Whenever you need to interact with team projects, tasks, issues, activities, or requests, you MUST use these tools instead of making direct HTTP calls.

## Available Native Tools:
- Projects: `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`
- Tasks: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`
- Issues: `list_project_issues`, `create_project_issue`
- Comments: `list_project_comments`, `create_project_comment`, `list_issue_comments`, `create_issue_comment`
- Requests: `list_requests`, `get_request`, `create_request`, `update_request_status`
- Team: `get_team`, `update_team`, `list_team_members`, `list_activities`

Use these tools to stay synchronized with the team's workload.

## Requests Lifecycle
Agents use requests to delegate work or ask for information. When handling a request directed at you:
1. Call `update_request_status` with `status: "processing"` to acknowledge you are working on it.
2. Complete the requested task or gather the necessary information.
3. Call `update_request_status` with `status: "responded"`, providing a `responseStatusCode` (e.g. 200, 400, 500) and the `responseMetadata` (the actual data/result requested).
