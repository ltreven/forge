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
 * Expected header:  `Authorization: Bearer <gatewayToken>`
 *
 * On success, attaches `req.agent = { id, teamId }` and calls `next()`.
 * The `teamId` is the authoritative scope — all project-management routes
 * use it instead of trusting a caller-supplied teamId, enforcing team isolation.
 *
 * Returns 401 if the token is missing, malformed, or unknown.
 */
export async function agentAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header) {
    console.warn(`[agentAuth] Missing Authorization header for ${req.method} ${req.url}`);
    res.status(401).json({ success: false, error: "Missing Authorization header" });
    return;
  }

  // Handle case-insensitive "Bearer " prefix and ensure a space exists
  const isBearer = /^bearer\s+/i.test(header);
  if (!isBearer) {
    console.warn(`[agentAuth] Malformed Authorization header (no Bearer prefix) for ${req.method} ${req.url}: "${header.slice(0, 20)}..."`);
    res.status(401).json({ success: false, error: "Malformed Authorization header: Prefix must be 'Bearer '" });
    return;
  }

  const token = header.split(/\s+/)[1]?.trim();
  if (!token) {
    console.warn(`[agentAuth] Empty token for ${req.method} ${req.url}`);
    res.status(401).json({ success: false, error: "Empty bearer token" });
    return;
  }

  try {
    const [agent] = await db
      .select({ id: agents.id, teamId: agents.teamId })
      .from(agents)
      .where(eq(agents.gatewayToken, token))
      .limit(1);

    if (!agent) {
      console.warn(`[agentAuth] Invalid token provided (last 4 chars: ...${token.slice(-4)})`);
      res.status(401).json({ success: false, error: "Invalid or unknown agent token" });
      return;
    }

    req.agent = { id: agent.id, teamId: agent.teamId };
    next();
  } catch (err) {
    next(err);
  }
}
