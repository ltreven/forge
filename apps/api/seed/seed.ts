/**
 * Forge API — Seed Script
 *
 * Demo dataset (China-market friendly):
 *   User:      Wei Chen (陈伟)  — workspace: ACME
 *   Team:      Product Delivery
 *   Agents:    Alex Zhao (SE), Mei Lin (PM), Forge PM (auto-created ProjM)
 *
 * Run via: make db-seed  OR  pnpm --filter api db:seed
 * Connects directly to the database — the API server does NOT need to be running.
 * Idempotent: safe to run multiple times — existing records are reused, not duplicated.
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://forge:forge@localhost:5432/forge",
});

const db = drizzle(pool, { schema });

async function main() {
  console.log("🌱 Seeding Forge API...\n");

  // ── 1. Create User ───────────────────────────────────────────────────────────
  console.log("→ Creating user: Wei Chen");
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Wei Chen",
      email: "wei.chen@acme.dev",
      passwordHash: "$2b$10$placeholder.hash.for.dev.only",
    })
    .onConflictDoNothing()
    .returning();

  if (!user) {
    // User already exists — fetch it
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "wei.chen@acme.dev"),
    });
    if (!existing) throw new Error("Could not create or find seed user.");
    console.log(`  ↩ User already exists: ${existing.name} (${existing.id})\n`);
    Object.assign(user ?? {}, existing);
    return runWithUser(existing);
  }

  console.log(`  ✓ User created: ${user.name} (${user.id})\n`);
  return runWithUser(user);
}

async function upsertOne<T extends { id: string }>(
  label: string,
  fetch: () => Promise<T | undefined>,
  create: () => Promise<T>,
): Promise<T> {
  const existing = await fetch();
  if (existing) {
    console.log(`  ↩ Already exists: ${label} (${existing.id})`);
    return existing;
  }
  const created = await create();
  console.log(`  ✓ Created: ${label} (${created.id})`);
  return created;
}

async function runWithUser(user: schema.User) {
  const { eq, and } = await import("drizzle-orm");

  // ── 2. Workspace ─────────────────────────────────────────────────────────────
  console.log("→ Workspace: ACME");
  const workspace = await upsertOne(
    "ACME",
    () => db.query.workspaces.findFirst({ where: (w, { eq, and }) => and(eq(w.userId, user.id), eq(w.name, "ACME")) }),
    async () => {
      const [row] = await db.insert(schema.workspaces).values({
        userId: user.id,
        name: "ACME",
        waysOfWorking: "We ship fast, we test well, we communicate clearly.",
      }).returning();
      return row;
    },
  );
  console.log();

  // ── 3. Team ──────────────────────────────────────────────────────────────────
  console.log("→ Team: Product Delivery");
  const team = await upsertOne(
    "Product Delivery",
    () => db.query.teams.findFirst({ where: (t, { eq, and }) => and(eq(t.workspaceId, workspace.id), eq(t.name, "Product Delivery")) }),
    async () => {
      const [row] = await db.insert(schema.teams).values({
        workspaceId: workspace.id,
        name: "Product Delivery",
        mission: "Ship high-quality product increments on time by coordinating engineering, design, and business stakeholders.",
      }).returning();
      return row;
    },
  );
  console.log();

  // ── 4. Agents ────────────────────────────────────────────────────────────────
  console.log("→ Agents...");
  const agentDefs = [
    { name: "Forge Team Lead",  type: "team_lead" as const, icon: "👑" },
    { name: "Alex Zhao", type: "software_engineer" as const, icon: "👨‍💻" },
    { name: "Mei Lin",   type: "product_manager"   as const, icon: "📋" },
  ];

  const createdAgents: schema.Agent[] = [];
  for (const def of agentDefs) {
    const agent = await upsertOne(
      `${def.name} [${def.type}]`,
      () => db.query.agents.findFirst({ where: (a, { eq, and }) => and(eq(a.teamId, team.id), eq(a.name, def.name)) }),
      async () => {
        const [row] = await db.insert(schema.agents).values({ teamId: team.id, ...def }).returning();
        return row;
      },
    );
    createdAgents.push(agent);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("  Workspace:  ACME");
  console.log(`  User:       ${user.name} (陈伟)`);
  console.log(`  Team:       ${team.name}`);
  console.log(`  Agents:     ${createdAgents.map((a) => `${a.name} (${a.type})`).join(", ")}`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
