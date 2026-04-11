/**
 * Forge API — Seed Script
 *
 * Demo dataset (China-market friendly):
 *   User:      Wei Chen (陈伟)  — workspace: ACME
 *   Team:      Product Delivery
 *   Agents:    Alex Zhao (SE), Mei Lin (PM), Forge PM (auto-created ProjM)
 *
 * Run via: make db-seed  OR  pnpm --filter api db:seed
 * Requires the API server to be running on http://127.0.0.1:4000
 */

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { data: T; error: { message: string } | null };

  if (!res.ok || json.error) {
    throw new Error(`POST ${path} failed (${res.status}): ${json.error?.message ?? "unknown"}`);
  }

  return json.data;
}

async function main() {
  console.log("🌱 Seeding Forge API...\n");

  // ── 1. Create Team (auto-creates project_manager agent "Forge PM") ──────────
  console.log("→ Creating team: Product Delivery");
  const { team, pmAgent } = await post<{
    team: { id: string; name: string };
    pmAgent: { id: string; name: string; type: string };
  }>("/teams", {
    name: "Product Delivery",
    mission:
      "Ship high-quality product increments on time by coordinating engineering, design, and business stakeholders.",
  });

  console.log(`  ✓ Team created:       ${team.name} (${team.id})`);
  console.log(`  ✓ PM auto-created:    ${pmAgent.name} [${pmAgent.type}] (${pmAgent.id})\n`);

  // ── 2. Create SE agent ───────────────────────────────────────────────────────
  console.log("→ Creating agent: Alex Zhao (software_engineer)");
  const seAgent = await post<{ id: string; name: string }>("/agents", {
    teamId: team.id,
    name: "Alex Zhao",
    type: "software_engineer",
  });
  console.log(`  ✓ Agent created:      ${seAgent.name} (${seAgent.id})\n`);

  // ── 3. Create PM agent ───────────────────────────────────────────────────────
  console.log("→ Creating agent: Mei Lin (product_manager)");
  const pmUserAgent = await post<{ id: string; name: string }>("/agents", {
    teamId: team.id,
    name: "Mei Lin",
    type: "product_manager",
  });
  console.log(`  ✓ Agent created:      ${pmUserAgent.name} (${pmUserAgent.id})\n`);

  console.log("✅ Seed complete!\n");
  console.log("  Workspace:  ACME");
  console.log("  User:       Wei Chen (陈伟)");
  console.log(`  Team:       ${team.name}`);
  console.log(`  Agents:     ${pmAgent.name} (ProjM), ${seAgent.name} (SE), ${pmUserAgent.name} (PM)`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
