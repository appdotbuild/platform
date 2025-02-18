import * as schema from "./schema";
import db from "./index";

async function main() {
  console.log("Seeding database...");

  await db
    .insert(schema.organizationsTable)
    .overridingSystemValue()
    .values({
      id: 1,
      name: "Default",
    })
    .onConflictDoNothing();

  console.log("Default organization created");

  await db
    .insert(schema.usersTable)
    .overridingSystemValue()
    .values({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Admin",
      email: "admin@example.com",
      organizationId: 1,
    })
    .onConflictDoNothing();

  console.log("Admin user created");

  await db.insert(schema.chatbots)
  .overridingSystemValue()
  .values({
    id: "11111111-1111-1111-1111-111111111111",
    name: "Default",
    telegramBotToken: "1234567890",
    flyAppId: "1234567890",
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: "11111111-1111-1111-1111-111111111111",
  });

  console.log("Database seeded.");
  process.exit(0);
}

main();
