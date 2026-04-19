import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { agents } from "../db/schema";
import { success, failure } from "../lib/response";

/**
 * Internal routes — NOT exposed via the external Ingress.
 * Protected by NetworkPolicy: only the Agent Controller pod can reach these.
 *
 * Mount point: /internal
 */
export const internalRouter = Router();

/**
 * PATCH /internal/agents/:id/k8s-status
 *
 * Called by the Agent Controller when a ForgeAgent CR's reconciliation
 * phase changes. Keeps the postgres record in sync with cluster state.
 *
 * Body: { phase: "provisioning" | "running" | "failed" | "terminated" }
 */
internalRouter.patch(
  "/agents/:id/k8s-status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { phase } = req.body as { phase: string };

      const validPhases = ["pending", "provisioning", "running", "failed", "terminated"];
      if (!validPhases.includes(phase)) {
        res.status(400).json(failure(`Invalid phase: ${phase}. Expected one of: ${validPhases.join(", ")}`));
        return;
      }

      const [updated] = await db
        .update(agents)
        .set({ k8sStatus: phase as any, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning({ id: agents.id, k8sStatus: agents.k8sStatus });

      if (!updated) {
        res.status(404).json(failure("Agent not found"));
        return;
      }

      res.json(success({ id: updated.id, k8sStatus: updated.k8sStatus }));
    } catch (err) {
      next(err);
    }
  },
);
