import { sql } from "../drizzle";
import db from "../index";

async function main() {
  console.log("Resetting database...");

  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
  console.log("Database reset.");
  process.exit(0);
}

main();
