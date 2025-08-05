import { drizzle } from 'drizzle-orm/neon-serverless';

const connectionString =
  process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL!;
const db = drizzle(connectionString);

export { db };
