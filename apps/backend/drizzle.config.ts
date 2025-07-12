import { defineConfig } from 'drizzle-kit';
import { neonConfig } from '@neondatabase/serverless';

// Drizzle Kit injects a Websocket implementation here:
// https://github.com/drizzle-team/drizzle-orm/blob/ac1dcd9d1c4b8f171479af4a5dd731db1e164f58/drizzle-kit/src/cli/connections.ts#L474
// This is intended to be used in old Node.js versions — here we use Bun and the injected implementation is not needed and causes errors
// The line belows disables the injection
Object.defineProperty(neonConfig, 'webSocketConstructor', { set() {} });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL!,
  },
});
