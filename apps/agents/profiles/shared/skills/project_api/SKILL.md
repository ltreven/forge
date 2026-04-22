---
name: project_api
description: Manage Forge projects, issues, and team tasks natively via the internal REST API.
metadata: { "forge": { "emoji": "🛠️" } }
---

# Forge Project API Skill

This skill provides you with the knowledge and standards required to interact with the Forge Project Management API. Use this skill to manage your team's projects, issues, and continuous kanban tasks.

## Core Mandates

1.  **Prefer Read Before Write**: Always list or get the current state of a project, issue, or task before attempting to update or delete it.
2.  **Strict Schema Adherence (Mandatory Fields)**: While the API has aliases, you **SHOULD** use the canonical fields: use `title` for the name of the item and `descriptionMarkdown` for the body.
3.  **No Nested Creation**: You CANNOT create tasks/issues inside the project payload. You must create the project first, extract its `id`, and then make a separate `POST` request to create issues sequentially.
4.  **Team Ownership**: All operations are automatically scoped to your team.
5.  **Health Updates**: Use the project health status to provide transparency on project progress (`on_track`, `at_risk`, `off_track`).

## When to use this Skill

- When you need to create a new project for a major feature.
- When you need to break down a project into concrete issues.
- When you need to track standalone team tasks (kanban).
- When you need to update the status or priority of a work item.

## API Fundamentals

- **Base URL**: `http://forge-api.forge.svc.cluster.local:4000`
- **Standard Routes**:
    - `/projects`: Manage team projects.
    - `/issues`: Manage project issues.
    - `/tasks`: Manage team kanban tasks.
    - `/activities`: View team activity feed.
- **Authentication**: All requests MUST include the gateway token:
  `Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN`
- **MANDATORY CONTENT-TYPE (CRITICAL)**: All `POST` and `PUT` requests **MUST** include the header:
  `Content-Type: application/json`
  If you omit this header, the server will not parse your JSON body and will return a "Validation Error: title Required" because it sees an empty request.

### Canonical Status Mapping (MUST USE INTEGERS)

**CRITICAL**: You must send the **Integer Value**, never the string label. Sending "To Do" or "Done" will fail validation.

| Value | Label       | Description                       |
|-------|-------------|-----------------------------------|
| **0** | Backlog     | Idea, not yet committed           |
| **1** | To Do       | Committed, not started            |
| **2** | In Progress | Actively being worked on          |
| **3** | In Review   | Work done, waiting for validation |
| **4** | Done        | Completed and closed              |
| **5** | Cancelled   | Abandoned                         |

### Priority Mapping (MUST USE INTEGERS)

**CRITICAL**: You must send the **Integer Value**, never strings like "High" or "ALTA".

| Value | Label       |
|-------|-------------|
| **0** | None        |
| **1** | Low         |
| **2** | Medium      |
| **3** | High        |
| **4** | Urgent      |

## HTTP Methods & Operations

- **GET**: Used to list resources or fetch details. (e.g., `GET /projects`)
- **POST**: Used to create **new** resources. Returns `201 Created`. (e.g., `POST /tasks`)
- **PUT**: Used to update **existing** resources. **Do not use PATCH.** (e.g., `PUT /issues/{id}`)
- **DELETE**: Used to remove resources. Returns `200 OK` with a deletion confirmation.

## Execution Guidelines & Common Errors

1.  **Understand the Contract**: Read `references/openapi.yaml` to identify the correct endpoint and payload structure.
2.  **Use PUT for Updates**: The API does **not** support `PATCH`. If you want to update a field, use `PUT` and include the fields you want to update in the JSON body.
3.  **Always send Headers (CRITICAL)**: Every `POST` and `PUT` request must have both `Authorization` and `Content-Type: application/json`. Without the content-type, your payload is ignored.
4.  **Strict JSON Types (CRITICAL)**: Ensure `status` and `priority` are **unquoted integers** (e.g., `"status": 2`, NOT `"status": "2"`). If you send strings for integers, the API will reject your request with a 400 Validation Error.
5.  **Handle Responses**: 
    - The API always returns a wrapper JSON object: `{"data": {...}, "error": null, "meta": {...}}` on success.
    - If there is an error, it returns: `{"data": null, "error": {"message": "...", "issues": ...}, "meta": {...}}`.
    - Always check the `"error"` object if you receive a `400 Bad Request` or `404 Not Found` to understand exactly which field failed validation before retrying.
5.  **Use Examples**: Refer to `references/examples.md` for `curl` templates for each standard operation.

## References

- [API Contract (OpenAPI)](references/openapi.yaml)
- [Usage Examples](references/examples.md)
