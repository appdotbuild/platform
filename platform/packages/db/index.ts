import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { sql as vercelSql, db as vercelDb, VercelPool } from "@vercel/postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "./env.mjs";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

let db: PostgresJsDatabase<typeof schema>;
let pool: Pool | VercelPool;

if (env.VERCEL) {
  db = drizzleVercel(vercelSql, { schema, casing: "snake_case" });
  pool = vercelDb;
  console.log( "Using Vercel Postgres");
} else {
  pool = new Pool({
    connectionString: env.POSTGRES_URL,
  });
  db = drizzle(pool, { schema, casing: "snake_case" });
  console.log("Using local Postgres");
}
export default db;
export { pool };

export async function testDb() {
  return await (pool as VercelPool).query(`SELECT 1`);
}
