"use server"; // don't forget to add this!

import { authActionClient } from "@repo/actions";
import { profileFormSchema } from "./actions.schema";
import db from "@repo/db";
import { usersTable } from "@repo/db/schema";
import { eq } from "@repo/db/drizzle";

export const updateProfileAction = authActionClient
  .schema(profileFormSchema)
  .metadata({ name: "updateProfile" })
  .action(async ({ parsedInput: { name, email }, ctx }) => {
    await db.update(usersTable).set({ name, email }).where(eq(usersTable.id, ctx.session.user.id));
    return { success: true };
  });
