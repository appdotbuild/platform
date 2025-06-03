import { and, eq, lt, sql } from 'drizzle-orm';
import { activeSessions, MAX_ACTIVE_CONNECTIONS } from '../db/schema';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const createOrRefreshSession = async (params: {
  userId: string;
  traceId: string;
  applicationId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ canProceed: boolean }> => {
  // First, clean up expired sessions
  await cleanupExpiredSessions();

  // Check current active session count
  const activeSessionCount = await getActiveSessionCount();
  if (activeSessionCount >= MAX_ACTIVE_CONNECTIONS) {
    return { canProceed: false };
  }

  // Create new session (traceIds aren't unique, so always insert new record)
  await db.insert(activeSessions).values({
    id: uuidv4(),
    userId: params.userId,
    traceId: params.traceId,
    applicationId: params.applicationId,
    requestId: params.requestId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return { canProceed: true };
};

export const updateSessionActivity = async (traceId: string): Promise<void> => {
  await db
    .update(activeSessions)
    .set({
      lastActiveAt: new Date(),
    })
    .where(eq(activeSessions.traceId, traceId));
};

export const endSession = async (traceId: string): Promise<void> => {
  await db
    .delete(activeSessions)
    .where(eq(activeSessions.traceId, traceId));
};

export const endSessionById = async (sessionId: string): Promise<void> => {
  await db
    .delete(activeSessions)
    .where(eq(activeSessions.id, sessionId));
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  const result = await db
    .delete(activeSessions)
    .where(lt(activeSessions.lastActiveAt, sql`NOW() - INTERVAL '30 minutes'`));

  return result.rowCount || 0;
};

export const getActiveSessionCount = async (): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(activeSessions)
    .where(sql`${activeSessions.lastActiveAt} > NOW() - INTERVAL '30 minutes'`);

  return result[0]?.count || 0;
};

export const getActiveSessionsByTraceId = async (traceId: string) => {
  return await db
    .select()
    .from(activeSessions)
    .where(
      and(
        eq(activeSessions.traceId, traceId),
        sql`${activeSessions.lastActiveAt} > NOW() - INTERVAL '30 minutes'`
      )
    );
};

export const getActiveSessionsByApplicationId = async (applicationId: string) => {
  return await db
    .select()
    .from(activeSessions)
    .where(
      and(
        eq(activeSessions.applicationId, applicationId),
        sql`${activeSessions.lastActiveAt} > NOW() - INTERVAL '30 minutes'`
      )
    );
};
