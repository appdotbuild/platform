import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { app } from '../app';
import { GithubEntity } from '../github';
import { createApp } from './create-app';

const createAppSchema = z.object({
  appName: z.string().min(1).max(100),
  clientSource: z.string().default('web'),
  databricksApiKey: z.string().optional(),
  databricksHost: z.string().optional(),
});

export type CreateAppBody = z.infer<typeof createAppSchema>;

export async function postCreateApp(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.id;
    const githubUsername = request.user.githubUsername;
    const githubAccessToken = request.user.githubAccessToken;

    // Validate request body
    const body = createAppSchema.parse(request.body);

    app.log.info({
      message: 'Creating app via API',
      userId,
      appName: body.appName,
      clientSource: body.clientSource,
    });

    // Initialize GitHub entity
    const githubEntity = await new GithubEntity(
      githubUsername,
      githubAccessToken,
    ).init();

    // Create the app
    const result = await createApp({
      appName: body.appName,
      githubEntity,
      ownerId: userId,
      clientSource: body.clientSource,
      databricksApiKey: body.databricksApiKey,
      databricksHost: body.databricksHost,
    });

    app.log.info({
      message: 'App created successfully via API',
      applicationId: result.applicationId,
      appName: result.appName,
      repositoryUrl: result.repositoryUrl,
    });

    // Return in App format expected by frontend
    return reply.status(201).send({
      id: result.applicationId,
      name: result.appName,
      appName: result.appName,
      traceId: `app-${result.applicationId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: userId,
      receivedSuccess: false,
      recompileInProgress: false,
      clientSource: body.clientSource,
      repositoryUrl: result.repositoryUrl,
    });
  } catch (error) {
    app.log.error({
      message: 'Error creating app',
      error: error instanceof Error ? error.message : String(error),
      userId: request.user.id,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: error.errors,
      });
    }

    return reply.status(500).send({
      error: 'Failed to create app',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
