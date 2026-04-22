# Project API Usage Examples

## 1. Standalone Team Tasks (Kanban)
**USE THIS FOR MOST INDIVIDUAL WORK.** These tasks appear on the main team board.

### Create a Task
```bash
# Endpoint: POST /tasks
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix bug in login screen",
    "descriptionMarkdown": "The login button is disabled on mobile",
    "status": 1,
    "priority": 2
  }'
```

### List All Team Tasks
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

## 2. High-Level Projects (Folders)
**USE THIS FOR MAJOR FEATURES ONLY.** Projects act as containers for multiple issues.

### Create a Project
```bash
# Endpoint: POST /projects
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Authentication Refactoring",
    "shortSummary": "Move to a unified actor-based auth",
    "status": 1,
    "priority": 3,
    "health": "on_track"
  }'
```

### Add an Issue to a Project
You must have the `id` of the project (e.g., from `GET /projects`).

```bash
# Endpoint: POST /projects/{PROJECT_UUID}/issues
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/projects/550e8400-e29b-41d4-a716-446655440000/issues \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement JWT validation",
    "status": 1,
    "priority": 2
  }'
```

## 3. General Operations

### Update Status/Priority of an Issue
```bash
curl -s -X PUT http://forge-api.forge.svc.cluster.local:4000/issues/{ISSUE_UUID} \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": 4 }'
```

### View Team Activity
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/activities \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```
