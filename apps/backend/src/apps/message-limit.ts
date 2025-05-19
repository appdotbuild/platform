import type { UserMessageLimit } from '@appdotbuild/core';
import { and, count, eq, gt } from 'drizzle-orm';
import { app } from '../app';
import { appPrompts, apps, db } from '../db';
import { customMessageLimits } from '../db/schema';

const getNextResetTime = (): Date => {
  const nextResetDate = new Date();
  nextResetDate.setUTCDate(nextResetDate.getUTCDate() + 1);
  nextResetDate.setUTCHours(0, 0, 0, 0);

  return nextResetDate;
};

const getCurrentDayStart = (): Date => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

export async function getUserCustomLimit(
  userId: string,
): Promise<number | null> {
  try {
    const result = await db
      .select({ dailyLimit: customMessageLimits.dailyLimit })
      .from(customMessageLimits)
      .where(eq(customMessageLimits.userId, userId))
      .limit(1);

    return result[0]?.dailyLimit ?? null;
  } catch (error) {
    app.log.error(`Error fetching custom limit for user ${userId}:`, error);
    return null;
  }
}

export async function checkMessageUsageLimit(
  userId: string,
): Promise<UserMessageLimit> {
  const DEFAULT_MESSAGE_LIMIT = Number(process.env.DAILY_MESSAGE_LIMIT) || 4;
  const startOfDay = getCurrentDayStart();
  const nextResetTime = getNextResetTime();

  try {
    const customLimit = await getUserCustomLimit(userId);
    const userMessageLimit = customLimit ?? DEFAULT_MESSAGE_LIMIT;

    const messageCountResult = await db
      .select({ count: count() })
      .from(appPrompts)
      .innerJoin(apps, eq(appPrompts.appId, apps.id))
      .where(
        and(
          eq(apps.ownerId, userId),
          gt(appPrompts.createdAt, startOfDay),
          eq(appPrompts.kind, 'user'),
        ),
      );

    const currentUsage = messageCountResult[0]?.count || 0;
    const remainingMessages = Math.max(0, userMessageLimit - currentUsage);
    const isUserLimitReached = currentUsage >= userMessageLimit;

    return {
      isUserLimitReached,
      dailyMessageLimit: userMessageLimit,
      remainingMessages,
      currentUsage,
      nextResetTime,
    };
  } catch (error) {
    app.log.error(
      `Error checking daily message limit for user ${userId}: ${error}`,
    );

    return {
      isUserLimitReached: false,
      dailyMessageLimit: DEFAULT_MESSAGE_LIMIT,
      currentUsage: 0,
      remainingMessages: DEFAULT_MESSAGE_LIMIT,
      nextResetTime,
    };
  }
}
