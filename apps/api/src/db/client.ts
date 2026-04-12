import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://forge:forge@localhost:5432/forge",
});

/** Drizzle db client — import this everywhere you need DB access. */
export const db = drizzle(pool, { schema });
