import { asc, eq } from 'drizzle-orm';
import { appPrompts, db } from '../db';

export async function getAppPromptHistory(appId?: string) {
  if (!appId) {
    return [];
  }

  return await db
    .select()
    .from(appPrompts)
    .where(eq(appPrompts.appId, appId))
    .orderBy(asc(appPrompts.createdAt))
    .limit(50);
}
