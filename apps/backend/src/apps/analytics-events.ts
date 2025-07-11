import type { AnalyticsEventBody } from '@appdotbuild/core';
import Analytics from '@segment/analytics-node';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function sendAnalyticsEvent(
  request: FastifyRequest<{ Body: AnalyticsEventBody }>,
  reply: FastifyReply,
) {
  try {
    if (process.env.NODE_ENV !== 'production') return;

    const segmentAdapter = new Analytics({
      writeKey: process.env.SEGMENT_WRITE_KEY || '',
    });

    const userId = request.user?.id;
    const event = request.body;

    const { eventType, eventName } = event;

    if (eventType === 'identify') {
      segmentAdapter.identify({ userId: userId });
      return reply.send(200);
    }

    if (eventType === 'track' && eventName) {
      segmentAdapter.track({
        userId,
        event: eventName,
      });

      return reply.send(200);
    }

    return reply.status(400).send({
      status: 'error',
      message: 'Invalid event type or missing event name',
    });
  } catch (error) {
    return reply.status(500).send({
      status: 'error',
      message: 'Internal server error while sending analytics event',
    });
  }
}
