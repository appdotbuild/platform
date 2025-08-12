import { and, count, gt } from 'drizzle-orm';
import { app } from '../app';
import { apps, db } from '../db';
import type { FastifyRequest } from 'fastify';

export const DAILY_APPS_LIMIT = Number(process.env.DAILY_APPS_LIMIT) || 50;
const getCurrentDayStart = (): Date => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};
export const getAppsDailyLimitResetTime = (): Date => {
  const nextResetDate = new Date();
  nextResetDate.setUTCDate(nextResetDate.getUTCDate() + 1);
  nextResetDate.setUTCHours(0, 0, 0, 0);

  return nextResetDate;
};

async function platformHasReachedDailyAppsLimit(): Promise<boolean> {
  const startOfDay = getCurrentDayStart();

  const appsCountResult = await db
    .select({ count: count() })
    .from(apps)
    .where(and(gt(apps.createdAt, startOfDay)));

  const createdAppsTodayCount = appsCountResult[0]?.count || 0;
  return createdAppsTodayCount >= DAILY_APPS_LIMIT;
}

export async function userReachedPlatformLimit(
  request: FastifyRequest,
): Promise<boolean> {
  const user = request.user;
  if (user.clientReadOnlyMetadata?.role === 'staff') {
    return false;
  }

  try {
    const isPlatformLimitReached = await platformHasReachedDailyAppsLimit();
    return isPlatformLimitReached;
  } catch (error) {
    app.log.error(
      `Error checking platform daily apps limit: ${JSON.stringify(error)}`,
    );
    return false;
  }
}
