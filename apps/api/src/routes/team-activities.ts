import { Router } from "express";
import { db } from "../db/client";
import { teamActivities } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/authMiddleware";

export const activitiesRouter = Router({ mergeParams: true });

// GET /teams/:teamId/activities
activitiesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const teamId = String(req.params.teamId);
    
    // Fetch recent activities for the team, ordered by newest first
    const activities = await db.query.teamActivities.findMany({
      where: eq(teamActivities.teamId, teamId),
      orderBy: [desc(teamActivities.createdAt)],
      limit: 50,
    });

    res.json({ data: activities });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});
