import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents, type Agent } from "../db/schema";

/** Minimal agent context attached to the request after authentication. */
export interface AgentContext {
  id: string;
  teamId: string;
}

// Augment Express request type to carry the authenticated agent.
declare global {
  namespace Express {
    interface Request {
      agent?: AgentContext;
    }
  }
}

/**
 * Authenticates an agent using the `gatewayToken` stored in the database.
 *
 * This middleware is NON-BLOCKING: it will call next() even if authentication fails,
 * but it will NOT populate req.agent. Downstream routers must check if req.agent exists.
 */
export async function agentAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !/^bearer\s+/i.test(header)) {
    return next();
  }

  const token = header.split(/\s+/)[1]?.trim();
  if (!token) {
    return next();
  }

  try {
    const [agent] = await db
      .select({ id: agents.id, teamId: agents.teamId })
      .from(agents)
      .where(eq(agents.gatewayToken, token))
      .limit(1);

    if (agent) {
      req.agent = { id: agent.id, teamId: agent.teamId };
    }
    
    next();
  } catch (err) {
    next(err);
  }
}
