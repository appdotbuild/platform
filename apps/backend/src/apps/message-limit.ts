import { and, count, eq, gt } from 'drizzle-orm';
import { app } from '../app';
import { appPrompts, apps, db } from '../db';

interface MessageUsageLimit {
  isUserLimitReached: boolean;
  dailyMessageLimit: number;
  currentUsage: number;
  remainingMessages: number;
  nextResetTime: Date;
}

const calculateNextResetTime = (): Date => {
  const nextResetDate = new Date();
  nextResetDate.setUTCDate(nextResetDate.getUTCDate() + 1);
  nextResetDate.setUTCHours(0, 0, 0, 0);

  return nextResetDate;
};

export async function checkMessageUsageLimit(
  userId: string,
): Promise<MessageUsageLimit> {
  const parsedLimit = Number(process.env.DAILY_MESSAGE_LIMIT);
  const userMessageLimit = parsedLimit || 50;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nextResetTime = calculateNextResetTime();

  try {
    const messageCountResult = await db
      .select({ count: count() })
      .from(appPrompts)
      .innerJoin(apps, eq(appPrompts.appId, apps.id))
      .where(
        and(eq(apps.ownerId, userId), gt(appPrompts.createdAt, oneDayAgo)),
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
      dailyMessageLimit: userMessageLimit,
      currentUsage: 0,
      remainingMessages: userMessageLimit,
      nextResetTime,
    };
  }
}
