import { eq } from 'drizzle-orm';
import { appPrompts, db } from '../db';
import type { AppPrompt } from '../db/schema';

export async function getAppHistory(appId?: string): Promise<AppPrompt[]> {
  if (!appId) {
    return [];
  }
  return await db.select().from(appPrompts).where(eq(appPrompts.appId, appId));
}
