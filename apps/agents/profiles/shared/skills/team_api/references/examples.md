# Team API Usage Examples

## Inspecting the Team

### Get Team Metadata (Intuitive)
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/team/info \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

### List All Team Members (Intuitive)
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/team/members \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

### Full Path (Alternative)
```bash
curl -s http://forge-api.forge.svc.cluster.local:4000/team-api/agents \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN"
```

## Provisioning Agents

### Create a Specialized Agent
Example: Provisioning a Software Architect to help with a complex design.

```bash
curl -s -X POST http://forge-api.forge.svc.cluster.local:4000/team/members \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cloud Architect",
    "type": "software_architect",
    "icon": "🏛️",
    "metadata": {
      "avatarColor": "#8b5cf6",
      "personality": "Rigorous, focused on scalability and security.",
      "identity": "Expert in distributed systems and K8s."
    }
  }'
```
