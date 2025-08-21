import { and, count, eq, gt, isNull } from 'drizzle-orm';
import { app } from '../app';
import { apps, db } from '../db';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const DAILY_APPS_LIMIT = Number(process.env.DAILY_APPS_LIMIT) || 100;

type UserAppsLimit = {
  userAppsLimit: number;
  isPersonalAppsLimitReached: boolean;
};

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

async function getUserAppsCustomLimit(userId: string): Promise<number> {
  const appsCountResult = await db
    .select({ count: count() })
    .from(apps)
    .where(and(eq(apps.ownerId, userId), isNull(apps.deletedAt)));

  return appsCountResult[0]?.count || 0;
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

export async function checkPersonalAppsLimit(
  request: FastifyRequest,
): Promise<UserAppsLimit> {
  const DEFAULT_USER_APPS_LIMIT = Number(process.env.USER_APPS_LIMIT) || 10;
  const userId = request.user.id;

  try {
    const customUserAppsLimit = await getUserAppsCustomLimit(userId);
    const userAppsLimit = customUserAppsLimit ?? DEFAULT_USER_APPS_LIMIT;

    const appsCountResult = await db
      .select({ count: count() })
      .from(apps)
      .where(and(eq(apps.ownerId, userId), isNull(apps.deletedAt)));

    const createdAppsCount = appsCountResult[0]?.count || 0;

    return {
      isPersonalAppsLimitReached: createdAppsCount >= userAppsLimit,
      userAppsLimit,
    };
  } catch (error) {
    app.log.error(
      `Error checking user personal apps limit: ${JSON.stringify(error)}`,
    );
    return {
      isPersonalAppsLimitReached: false,
      userAppsLimit: DEFAULT_USER_APPS_LIMIT,
    };
  }
}
