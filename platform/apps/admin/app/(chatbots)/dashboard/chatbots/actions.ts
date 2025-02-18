"use server";

import { revalidatePath } from "next/cache";
import db from "@repo/db";
import { eq, sql, count } from "@repo/db/drizzle";
import { authActionClient } from "@repo/actions";
import { chatbots } from "@repo/db/schema";

export async function getAllChatbots({ search }: { search?: string } = {}) {
  try {
    const data = await db.select().from(chatbots);
    return { data };
  } catch (error) {
    console.error("Error fetching chatbots:", error);
    return { data: [] };
  }
}

export async function removeChatbotsAction(ids: string[]) {
  try {
    await db.delete(chatbots).where(eq(chatbots.id, ids[0]));
    return { success: true };
  } catch (error) {
    console.error("Error removing chatbots:", error);
    return { success: false };
  }
}
