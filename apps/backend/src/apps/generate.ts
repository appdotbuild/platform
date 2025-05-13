import { eq, and } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { apps, appPrompts, db } from '../db';
import { logger } from '../logger';
import { createS3DirectoryWithPresignedUrls } from '../s3';
import {
  MOCKED_AGENT_API_URL,
  STAGING_AGENT_API_URL,
  PROD_AGENT_API_URL,
} from './constants';

export async function generate(
  request: FastifyRequest<{
    Body: {
      prompt: string;
      userId: string;
      useStaging: boolean;
      useMockedAgent: boolean;
      sourceCodeFile?: { name: string; content: string };
      appId?: string;
      clientSource: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { prompt, useStaging, useMockedAgent, sourceCodeFile, clientSource } =
      request.body;

    const user = request.user;

    logger.info('Generate request received', {
      userId: user.id,
      useStaging,
      useMockedAgent,
      clientSource,
      hasSourceCodeFile: !!sourceCodeFile,
      promptLength: prompt.length,
    });

    let appId = request.body.appId;
    if (!appId) {
      appId = uuidv4();
      logger.info('Generated new app ID', { appId });
    } else {
      logger.info('Using existing app ID', { appId });
    }

    const { writeUrl, readUrl } = await createS3DirectoryWithPresignedUrls(
      appId,
    );
    logger.info('Created S3 presigned URLs', {
      appId,
      writeUrlExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const existingApp = await db
      .select()
      .from(apps)
      .where(and(eq(apps.id, appId), eq(apps.ownerId, user.id)));

    if (existingApp && existingApp[0]) {
      logger.info('Found existing app', {
        appId,
        receivedSuccess: existingApp[0].receivedSuccess,
        recompileInProgress: existingApp[0].recompileInProgress,
      });
    }

    await db
      .insert(apps)
      .values({
        id: appId,
        name: prompt,
        ownerId: user.id,
        clientSource,
      })
      .onConflictDoUpdate({
        target: [apps.id],
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info('Upserted app in database', {
      appId,
      userId: user.id,
    });

    await db.insert(appPrompts).values({
      id: uuidv4(),
      prompt,
      appId: appId,
      kind: 'user',
    });
    logger.info('Inserted user prompt', { appId });

    const allPrompts = await db
      .select({
        prompt: appPrompts.prompt,
        createdAt: appPrompts.createdAt,
        kind: appPrompts.kind,
      })
      .from(appPrompts)
      .where(eq(appPrompts.appId, appId));

    logger.info('Retrieved all prompts', {
      appId,
      promptCount: allPrompts.length,
      promptTypes: allPrompts.map((p) => p.kind),
    });

    if (allPrompts.length < 1) {
      logger.error('No prompts found after insertion', { appId });
      throw new Error('Failed to insert prompt into app_prompts');
    }

    try {
      // If sourceCodeFile is provided, upload it directly to S3 and skip the /prepare/compile endpoints
      if (sourceCodeFile) {
        logger.info('Starting source code file upload', {
          appId,
          fileName: sourceCodeFile.name,
          contentSizeBytes: sourceCodeFile.content.length,
        });

        try {
          // Decode the base64 content
          const fileBuffer = Buffer.from(sourceCodeFile.content, 'base64');
          logger.debug('Decoded base64 content', {
            appId,
            bufferSizeBytes: fileBuffer.length,
          });

          // Upload the file to S3 using the writeUrl
          const response = await fetch(writeUrl, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
              'Content-Type': 'application/zip',
            },
          });

          if (!response.ok) {
            logger.error('S3 upload failed', {
              appId,
              status: response.status,
              statusText: response.statusText,
            });
            throw new Error(
              `Failed to upload file to S3: ${response.statusText}`,
            );
          }

          logger.info('Successfully uploaded source code file', {
            appId,
            status: response.status,
          });

          return reply.send({
            newApp: { id: appId },
            message: `Source code uploaded successfully`,
          });
        } catch (uploadError) {
          logger.error('Error uploading source code file', {
            appId,
            error: uploadError,
          });
          throw new Error(`Failed to upload source code file: ${uploadError}`);
        }
      } else {
        // If no sourceCodeFile is provided, call the /compile endpoint as before
        let AGENT_API_URL = useMockedAgent
          ? MOCKED_AGENT_API_URL
          : useStaging
          ? STAGING_AGENT_API_URL
          : PROD_AGENT_API_URL;

        logger.info('Using agent API', {
          appId,
          url: AGENT_API_URL,
          useMockedAgent,
          useStaging,
        });

        if (existingApp && existingApp[0] && existingApp[0].receivedSuccess) {
          if (existingApp[0].recompileInProgress) {
            logger.info('Skipping recompile - already in progress', {
              appId,
            });
            return reply.send({
              newApp: {
                id: appId,
              },
              message: 'Codegen already in progress',
            });
          }

          logger.info('Starting recompile for existing app', { appId });
          const compileResponse = await fetch(`${AGENT_API_URL}/recompile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
            },
            body: JSON.stringify({
              prompt,
              writeUrl,
              readUrl,
              prompts: allPrompts,
              typespecSchema: existingApp[0].typespecSchema,
            }),
          });

          logger.info('Recompile response received', {
            appId,
            status: compileResponse.status,
            ok: compileResponse.ok,
          });

          if (!compileResponse.ok) {
            throw new Error(
              `HTTP error in /compile, status: ${compileResponse.status}`,
            );
          }

          const compileResponseJson: {
            message: string;
          } = await compileResponse.json();

          return reply.send({
            newApp: { id: appId },
            message: `Codegen started: ${compileResponseJson.message}`,
          });
        } else {
          logger.info('Starting prepare for new app', { appId });
          const prepareResponse = await fetch(`${AGENT_API_URL}/prepare`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AGENT_API_SECRET_AUTH!}`,
            },
            body: JSON.stringify({
              prompts: allPrompts,
              capabilities: [],
            }),
          });

          if (!prepareResponse.ok) {
            logger.error('Prepare request failed', {
              appId,
              status: prepareResponse.status,
              statusText: prepareResponse.statusText,
            });
            throw new Error(
              `HTTP error in /prepare, status: ${prepareResponse.status}`,
            );
          }

          const prepareResponseJson: {
            status: string;
            message: string;
            metadata: {
              reasoning: string;
              typespec: string;
            };
          } = await prepareResponse.json();

          logger.info('Prepare response received', {
            appId,
            status: prepareResponseJson.status,
            hasReasoning: !!prepareResponseJson.metadata.reasoning,
            hasTypespec: !!prepareResponseJson.metadata.typespec,
          });

          await db
            .update(apps)
            .set({
              typespecSchema: prepareResponseJson.metadata.typespec,
            })
            .where(eq(apps.id, appId));
          logger.info('Updated app typespec schema', { appId });

          if (prepareResponseJson.status === 'success') {
            await db
              .update(apps)
              .set({
                receivedSuccess: true,
              })
              .where(eq(apps.id, appId));
            logger.info('Marked app as received success', { appId });
          }

          await db.insert(appPrompts).values({
            id: uuidv4(),
            prompt: prepareResponseJson.metadata.reasoning,
            appId: appId,
            kind: 'agent',
          });
          logger.info('Inserted agent reasoning prompt', { appId });

          return reply.send({
            newApp: {
              id: appId,
            },
            message: prepareResponseJson.message,
          });
        }
      }
    } catch (error) {
      logger.error('Error compiling app', {
        appId,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return reply
        .status(400)
        .send({ error: `Failed to compile app: ${error}` });
    }
  } catch (error) {
    logger.error('Error generating app', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return reply
      .status(400)
      .send({ error: `Failed to generate app: ${error}` });
  }
}
