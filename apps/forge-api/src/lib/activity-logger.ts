import { db } from "../db/client";
import { teamActivities, type NewTeamActivity } from "../db/schema";

export async function logActivity(
  teamId: string,
  actorId: string,
  actorType: "human" | "agent",
  type: NewTeamActivity["type"],
  entityType: string,
  entityId: string,
  payload?: any
) {
  try {
    await db.insert(teamActivities).values({
      teamId,
      actorId,
      actorType,
      type,
      entityType,
      entityId,
      payload: payload || null,
    });
  } catch (error) {
    console.error(`Failed to log activity [${type}] for entity [${entityType}:${entityId}]:`, error);
  }
}
