import type { FastifyReply } from 'fastify';

const MAX_CONCURRENT_SESSIONS = 100;
let activeSessions = 0;

export const incrementActiveSession = (): boolean => {
  if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
    return false;
  }
  activeSessions++;
  return true;
};

export const decrementActiveSession = (): void => {
  if (activeSessions > 0) {
    activeSessions--;
  }
};

export const getActiveSessionCount = (): number => {
  return activeSessions;
};

export const checkSessionLimit = (reply: FastifyReply): boolean => {
  if (!incrementActiveSession()) {
    reply.status(429).send({
      error: 'Too many concurrent sessions. Please try again later.',
      maxSessions: MAX_CONCURRENT_SESSIONS,
      currentSessions: activeSessions,
    });
    return false;
  }
  return true;
};
