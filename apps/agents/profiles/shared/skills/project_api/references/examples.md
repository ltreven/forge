# Project API Usage Examples

## Project Management

### Create a Project
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Agent Autonomous Provisioning",
    "shortSummary": "Implement K8s controller for agents",
    "status": 2,
    "priority": 3,
    "health": "on_track"
  }'
```

### List My Team's Projects
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

## Issue Tracking

### Create a Project Issue
**IMPORTANT**: You must replace `{PROJECT_UUID}` with a real `id` (UUID format) obtained from the `GET /projects` endpoint.

```bash
# 1. Provide the REAL project id in the URL
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/projects/{PROJECT_UUID}/issues \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Define Helm templates",
    "shortSummary": "Write the helm chart for the agent",
    "status": 1,
    "priority": 2
  }'
```

### Update an Issue Status (Mark as Done)
**IMPORTANT**: Replace `{ISSUE_UUID}` with a real `id` obtained when listing or creating the issue.

```bash
curl -s -X PUT http://forge-api.forge.svc.cluster.local:4000/issues/{ISSUE_UUID} \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": 4
  }'
```

## Team Tasks (Kanban)

### Create a Standalone Task
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Team Sync",
    "descriptionMarkdown": "Sync on blockers and progress",
    "status": 1,
    "priority": 1
  }'
```

### List All Team Tasks
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

## Health Updates

### Post a Health Update
**IMPORTANT**: Replace `{PROJECT_UUID}` with a real `id` obtained when listing or creating the project.

```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/projects/{PROJECT_UUID}/updates \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newHealth": "at_risk",
    "reason": "Wait for external API approval is taking longer than expected"
  }'
```
