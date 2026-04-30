import { Router } from "express";
import { db } from "../db/client";
import { users, requests, tasks, agents, workspaces, teams, comments, conversations, messages, notifications } from "../db/schema";
import { eq, and, desc, or, sql, isNull } from "drizzle-orm";
import { authMiddleware } from "../middleware/authMiddleware";
import { z } from "zod";
import { logActivity } from "../lib/activity-logger";
import { assignAgentToRequest } from "../lib/agent-assignment";
import { publishToAgent, tenantVhost, tenantExchange } from "../lib/rabbitmq";
import { buildTeamRequestMessage, buildTeamRequestInstructions, buildTeamRequestFinishedMessage } from "../lib/messages";
import { randomBytes } from "crypto";

export const requestsRouter = Router({ mergeParams: true });

// Helper to determine if a string is a UUID
const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

async function handleRequestCreatedState(requestRecord: any) {
  const targetAgentId = await assignAgentToRequest(requestRecord.teamId, requestRecord.targetAgentId, requestRecord.targetRole);
  if (!targetAgentId) return;

  // Fetch requester name
  let requesterName = "Unknown";
  if (requestRecord.requesterUserId) {
    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, requestRecord.requesterUserId));
    if (user) requesterName = user.name;
  } else if (requestRecord.requesterAgentId) {
    const [agent] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, requestRecord.requesterAgentId));
    if (agent) requesterName = agent.name;
  }

  // Update request with assigned agent and instructions
  const instructionsContent = buildTeamRequestInstructions({ ...requestRecord, requesterName });
  await db.update(requests).set({ 
    assignedAgentId: targetAgentId,
    instructions: instructionsContent
  }).where(eq(requests.id, requestRecord.id));

  // 3. Create NEW Conversation
  const [conversation] = await db.insert(conversations).values({
    agentId: targetAgentId,
    counterpartType: "external" as any,
    counterpartId: "system",
    counterpartName: "System Orchestrator"
  }).returning();

  // 4. Create Message
  const messageContent = buildTeamRequestMessage(requestRecord);

  const [userMessage] = await db.insert(messages).values({
    conversationId: conversation.id,
    role: "user" as any,
    content: messageContent
  }).returning();

  // 5. Publish to Agent
  const [agent] = await db.select().from(agents).where(eq(agents.id, targetAgentId));
  if (agent) {
     const [team] = await db.select().from(teams).where(eq(teams.id, agent.teamId));
     const [workspace] = team ? await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId)) : [];
     
     if (workspace) {
       const rabbitCreds = {
          host:     process.env.RABBITMQ_AMQP_HOST ?? "localhost",
          amqpPort: Number(process.env.RABBITMQ_AMQP_PORT ?? 5672),
          vhost:    tenantVhost(workspace.id),
          username: process.env.RABBITMQ_ADMIN_USER ?? "admin",
          password: process.env.RABBITMQ_ADMIN_PASSWORD ?? "admin",
          exchange: tenantExchange(workspace.id),
        };
        
        try {
          await publishToAgent(rabbitCreds, {
            tenantId:   workspace.id,
            agentId:    agent.id,
            sessionKey: conversation.id,
            messageId:  randomBytes(16).toString("hex"),
            action:     "chat_message",
            payload:    { role: "user", content: messageContent },
          });
        } catch (err) {
          console.error("[team-requests] RabbitMQ publish failed:", err);
        }
     }
  }
}

async function handleRequestCompletedState(requestRecord: any) {
  // 1. If human requester, insert a notification
  if (requestRecord.requesterUserId) {
    await db.insert(notifications).values({
      teamId: requestRecord.teamId,
      recipientId: requestRecord.requesterUserId,
      recipientType: "human",
      title: requestRecord.resolution === "failed" ? "Request Failed" : "Request Completed",
      content: `Request ${requestRecord.identifier} has been completed with resolution: ${requestRecord.resolution}.`,
      priority: requestRecord.resolution === "failed" ? "alert" : requestRecord.priority > 2 ? "high" : "normal",
      relatedEntityId: requestRecord.id,
      relatedEntityType: "request"
    });
  } 
  // 2. If agent requester, dispatch a message to the agent
  else if (requestRecord.requesterAgentId) {
    const targetAgentId = requestRecord.requesterAgentId;
    
    // Create NEW Conversation with the orchestrator
    const [conversation] = await db.insert(conversations).values({
      agentId: targetAgentId,
      counterpartType: "external" as any,
      counterpartId: "system",
      counterpartName: "System Orchestrator"
    }).returning();

    // Create Message
    const messageContent = buildTeamRequestFinishedMessage({
      identifier: requestRecord.identifier,
      title: requestRecord.title,
      resolution: requestRecord.resolution || "success",
      response: requestRecord.response
    });

    const [userMessage] = await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user" as any,
      content: messageContent
    }).returning();

    // Publish to Agent
    const [agent] = await db.select().from(agents).where(eq(agents.id, targetAgentId));
    if (agent) {
       const [team] = await db.select().from(teams).where(eq(teams.id, agent.teamId));
       const [workspace] = team ? await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId)) : [];
       
       if (workspace) {
         const rabbitCreds = {
            host:     process.env.RABBITMQ_AMQP_HOST ?? "localhost",
            amqpPort: Number(process.env.RABBITMQ_AMQP_PORT ?? 5672),
            vhost:    tenantVhost(workspace.id),
            username: process.env.RABBITMQ_ADMIN_USER ?? "admin",
            password: process.env.RABBITMQ_ADMIN_PASSWORD ?? "admin",
            exchange: tenantExchange(workspace.id),
          };
          
          try {
            await publishToAgent(rabbitCreds, {
              tenantId:   workspace.id,
              agentId:    agent.id,
              sessionKey: conversation.id,
              messageId:  randomBytes(16).toString("hex"),
              action:     "chat_message",
              payload:    { role: "user", content: messageContent },
            });
          } catch (err) {
            console.error("[team-requests] RabbitMQ publish for completion failed:", err);
          }
       }
    }
  }
}


const requestSchema = z.object({
  title: z.string(),
  targetAgentId: z.string().uuid().optional().nullable(),
  targetRole: z.string().optional().nullable(),
  requestDetails: z.string().optional(),
  instructions: z.string().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  responseContract: z.string().optional(),
  requestCapabilities: z.any().optional(),
  status: z.enum(["draft", "open", "in_progress", "waiting_user", "completed", "cancelled"]).optional(),
  resolution: z.enum(["success", "failed"]).optional().nullable(),
  response: z.string().optional(),
  assignedAgentId: z.string().uuid().optional().nullable(),
  parentRequestId: z.string().optional().nullable(),
});

// POST /teams/:teamId/requests
requestsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const body = requestSchema.parse(req.body);

    const actorId = req.actor!.id;
    const actorType = req.actor!.type;

    const newRequest = await db.transaction(async (tx) => {
      const [team] = await tx.select({ identifierPrefix: teams.identifierPrefix }).from(teams).where(eq(teams.id, teamId));
      if (!team) {
        throw new Error("Team not found");
      }

      const nextNumResult = await tx.execute(sql`
        SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM ${requests} WHERE team_id = ${teamId}
      `);
      const nextNumber = Number((nextNumResult.rows[0] as any).next_number);
      const identifier = `${team.identifierPrefix}-${nextNumber}`;

      let resolvedParentRequestId: string | undefined = undefined;
      if (body.parentRequestId) {
        if (isUuid(body.parentRequestId)) {
          resolvedParentRequestId = body.parentRequestId;
        } else {
          const [parentReq] = await tx.select({ id: requests.id }).from(requests).where(and(eq(requests.identifier, body.parentRequestId), eq(requests.teamId, teamId)));
          if (parentReq) {
            resolvedParentRequestId = parentReq.id;
          } else {
            throw new Error(`Parent request with identifier ${body.parentRequestId} not found.`);
          }
        }
      }

      const [reqRecord] = await tx
        .insert(requests)
        .values({
          teamId,
          number: nextNumber,
          identifier,
          title: body.title,
          requesterUserId: actorType === "human" ? actorId : undefined,
          requesterAgentId: actorType === "agent" ? actorId : undefined,
          targetAgentId: body.targetAgentId,
          targetRole: body.targetRole,
          
          requestDetails: body.requestDetails,
          responseContract: body.responseContract,
          requestCapabilities: body.requestCapabilities,
          status: body.status || "open",
          parentRequestId: resolvedParentRequestId,
        })
        .returning();

      return reqRecord;
    });

    if (newRequest.status !== "draft") {
      // Log request created only if it's not a draft
      await logActivity({
        teamId,
        actorId,
        actorType,
        changeType: "creation",
        activityTitle: `Created new request: ${newRequest.title}`,
        requestId: newRequest.id,
      });
    }
    
    if (newRequest.status === "open") {
      await handleRequestCreatedState(newRequest);
    }

    res.status(201).json({ data: newRequest });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// GET /teams/:teamId/requests
requestsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    let statusFilter = req.query.status as string | undefined;
    let targetAgentIdFilter = req.query.targetAgentId as string | undefined;
    let parentRequestIdFilter = req.query.parentRequestId as string | undefined;

    const conditions: any[] = [eq(requests.teamId, teamId)];
    if (statusFilter) {
      conditions.push(eq(requests.status, statusFilter as "draft" | "open" | "in_progress" | "waiting_user" | "completed" | "cancelled"));
    }
    if (targetAgentIdFilter) {
      conditions.push(eq(requests.targetAgentId, targetAgentIdFilter));
    }
    if (parentRequestIdFilter !== undefined) {
      if (parentRequestIdFilter === "null") {
        conditions.push(isNull(requests.parentRequestId));
      } else {
        conditions.push(eq(requests.parentRequestId, parentRequestIdFilter));
      }
    }

    const rows = await db.query.requests.findMany({
      where: and(...conditions),
      orderBy: (requests, { desc }) => [desc(requests.createdAt)],
    });

    res.json({ data: rows });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// GET /teams/:teamId/requests/:requestId
requestsRouter.get("/:requestId", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);

    const [request] = await db
      .select()
      .from(requests)
      .where(and(condition, eq(requests.teamId, teamId)));

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    res.json({ data: request });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// GET /teams/:teamId/requests/:requestId/tasks
requestsRouter.get("/:requestId/tasks", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);

    // We need to resolve the requestId first if it's an identifier
    const [request] = await db.select({ id: requests.id }).from(requests).where(and(condition, eq(requests.teamId, teamId)));
    
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.teamId, teamId), eq(tasks.requestId, request.id)))
      .orderBy(desc(tasks.createdAt));

    res.json({ data: rows });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// PATCH /teams/:teamId/requests/:requestId
requestsRouter.patch("/:requestId", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);
    const body = requestSchema.partial().parse(req.body);
    
    const actorId = req.actor!.id;
    const actorType = req.actor!.type;

    if (!actorId) {
       return res.status(400).json({ error: "Actor ID is required for logging." });
    }

    // Fetch existing request to check status
    const [existing] = await db
      .select()
      .from(requests)
      .where(and(condition, eq(requests.teamId, teamId)));

    if (!existing) {
      return res.status(404).json({ error: "Request not found." });
    }

    // Validation: prevent updating core fields if not in draft
    if (existing.status !== "draft" && body.status !== "draft") {
      if (body.requestDetails !== undefined || body.responseContract !== undefined || body.requestCapabilities !== undefined) {
        // Technically we could throw an error, but let's just ignore the protected fields
        delete body.requestDetails;
        delete body.responseContract;
        delete body.requestCapabilities;
      }
    }

    const [updatedRequest] = await db
      .update(requests)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(requests.id, existing.id))
      .returning();

    // Log transitions and handle state changes
    if (existing.status === "draft" && updatedRequest.status === "open") {
      await logActivity({ teamId, actorId, actorType, changeType: "status", activityTitle: "Request opened", requestId: updatedRequest.id });
      await handleRequestCreatedState(updatedRequest);
    } else if (existing.status === "completed" && updatedRequest.status === "open") {
      await logActivity({ teamId, actorId, actorType, changeType: "status", activityTitle: "Request reopened", requestId: updatedRequest.id });
      await handleRequestCreatedState(updatedRequest);
    } else if (
      existing.status !== "completed" &&
      updatedRequest.status === "open" && 
      (body.targetAgentId !== undefined && body.targetAgentId !== existing.targetAgentId || 
       body.targetRole !== undefined && body.targetRole !== existing.targetRole)
    ) {
      await logActivity({ teamId, actorId, actorType, changeType: "status", activityTitle: "Request reassigned and retried", requestId: updatedRequest.id });
      await handleRequestCreatedState(updatedRequest);
    } else if (body.status === "in_progress" && existing.status !== "in_progress") {
      await logActivity({ teamId, actorId, actorType, changeType: "status", activityTitle: "Request in progress", requestId: updatedRequest.id });
    } else if (body.status === "completed" && existing.status !== "completed") {
      await logActivity({ teamId, actorId, actorType, changeType: "status", activityTitle: "Request completed", requestId: updatedRequest.id, newState: { resolution: updatedRequest.resolution } });
      await handleRequestCompletedState(updatedRequest);
    }

    res.json({ data: updatedRequest });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// DELETE /teams/:teamId/requests/:requestId
requestsRouter.delete("/:requestId", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);

    const [deleted] = await db
      .delete(requests)
      .where(and(condition, eq(requests.teamId, teamId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Request not found." });
    }

    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to delete request" });
  }
});

// GET /teams/:teamId/requests/:requestId/comments
requestsRouter.get("/:requestId/comments", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);

    const [request] = await db.select({ id: requests.id }).from(requests).where(and(condition, eq(requests.teamId, teamId)));
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.teamId, teamId), eq(comments.requestId, request.id)))
      .orderBy(desc(comments.createdAt));

    res.json({ data: rows });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});

// POST /teams/:teamId/requests/:requestId/comments
const commentSchema = z.object({
  content: z.string().min(1),
});

requestsRouter.post("/:requestId/comments", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    const requestIdParam = String(req.params.requestId);
    const condition = isUuid(requestIdParam) ? eq(requests.id, requestIdParam) : eq(requests.identifier, requestIdParam);
    const body = commentSchema.parse(req.body);

    const [request] = await db.select({ id: requests.id }).from(requests).where(and(condition, eq(requests.teamId, teamId)));
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    const actorId = req.actor!.id;
    const actorType = req.actor!.type;

    const [newComment] = await db
      .insert(comments)
      .values({
        teamId,
        requestId: request.id,
        actorId,
        actorType,
        content: body.content,
      })
      .returning();

    res.status(201).json({ data: newComment });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid input" });
  }
});
