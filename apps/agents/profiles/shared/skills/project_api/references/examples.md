# Project API Usage Examples

## Project Management

### Create a Project
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects \
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
curl -s http://forge-api.forge.svc.cluster.local:4000/project-management/projects \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

## Issue Tracking

### Create a Project Issue
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects/<project-id>/issues \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Define Helm templates",
    "status": 1,
    "priority": 2
  }'
```

### Update an Issue Status (Mark as Done)
```bash
curl -s -X PUT http://forge-api.forge.svc.cluster.local:4000/project-management/issues/<issue-id> \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": 4
  }'
```

## Team Tasks (Kanban)

### Create a Standalone Task
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/tasks \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Team Sync",
    "descriptionMarkdown": "Sync on blockers and progress",
    "status": 1,
    "priority": 1
  }'
```

## Health Updates

### Post a Health Update
```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/project-management/projects/<project-id>/updates \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newHealth": "at_risk",
    "reason": "Wait for external API approval is taking longer than expected"
  }'
```
