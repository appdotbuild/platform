import type { FastifyRequest, FastifyReply } from 'fastify';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ReadUrl } from '@appdotbuild/core/types/api';
import { eq, and } from 'drizzle-orm';
import { db, apps } from '../db';
import { s3Client, getS3DirectoryParams } from '../s3';

async function getReadPresignedUrls(
  appId: string,
): Promise<{ readUrl: string }> {
  const baseParams = getS3DirectoryParams(appId);

  const readCommand = new GetObjectCommand(baseParams);

  const readUrl = await getSignedUrl(s3Client, readCommand, {
    expiresIn: 3600,
  });

  return { readUrl };
}

export async function appByIdUrl(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ReadUrl> {
  const user = request.user;
  const { id } = request.params as { id: string };
  const app = await db
    .select({ id: apps.id })
    .from(apps)
    .where(and(eq(apps.id, id), eq(apps.ownerId, user.id)));

  if (!app || !app?.[0]) {
    return reply.status(404).send({
      error: 'App not found',
    });
  }

  return getReadPresignedUrls(app[0].id);
}
