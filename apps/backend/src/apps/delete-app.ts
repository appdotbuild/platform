import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { validate } from 'uuid';
import { apps, appPrompts, deployments, db } from '../db';
import {
  deleteKoyebService,
  deleteKoyebDomain,
  deleteKoyebApp,
  deleteKoyebOrganization,
  getOrganizationToken,
} from '../deploy/koyeb';
import { cleanupDatabricksResources } from '../deploy/databricks';
import { deleteNeonProject } from '../deploy/neon';
import { deleteECRImages, deleteECRRepository } from '../ecr';
import { DEFAULT_OWNER, GithubEntity } from '../github/entity';
import { archiveRepository } from '../github/delete-repository';
import { logger } from '../logger';
import { Instrumentation } from '../instrumentation';

export async function deleteApp(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;
  const { id } = request.params as { id: string };

  if (!validate(id)) {
    return reply.status(400).send({ error: 'Invalid app ID' });
  }

  try {
    const app = await db
      .select({
        id: apps.id,
        name: apps.name,
        ownerId: apps.ownerId,
        koyebAppId: apps.koyebAppId,
        koyebServiceId: apps.koyebServiceId,
        koyebDomainId: apps.koyebDomainId,
        neonProjectId: apps.neonProjectId,
        githubUsername: apps.githubUsername,
        repositoryUrl: apps.repositoryUrl,
        databricksHost: apps.databricksHost,
        databricksApiKey: apps.databricksApiKey,
        deletedAt: apps.deletedAt,
      })
      .from(apps)
      .where(and(eq(apps.id, id), eq(apps.ownerId, user.id)));

    if (!app || app.length === 0) {
      return reply.status(404).send({
        error: 'App not found',
      });
    }

    const appData = app[0]!;

    // Check if app is already deleted
    if (appData.deletedAt) {
      return reply.status(400).send({
        error: 'App is already deleted',
      });
    }

    // Get organization info and check remaining deployments (for Koyeb cleanup decisions)
    const userDeployments = await db
      .select({
        koyebOrgId: deployments.koyebOrgId,
        appId: deployments.appId,
      })
      .from(deployments)
      .where(
        and(eq(deployments.ownerId, user.id), isNull(deployments.deletedAt)),
      );

    const koyebOrgId = userDeployments[0]?.koyebOrgId;
    const remainingDeployments = userDeployments.filter((d) => d.appId !== id);
    const isLastActiveDeployment = remainingDeployments.length === 0;

    await db.delete(appPrompts).where(eq(appPrompts.appId, id));
    logger.info('Hard deleted app prompts', { appId: id });

    await db
      .update(deployments)
      .set({ deletedAt: new Date() })
      .where(eq(deployments.appId, id));
    logger.info('Soft deleted deployment records', { appId: id });

    // Phase 2: Soft delete the main app record (preserve for analytics)
    await db
      .update(apps)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        koyebAppId: null,
        koyebServiceId: null,
        koyebDomainId: null,
        neonProjectId: null,
      })
      .where(eq(apps.id, id));
    logger.info('Soft deleted main app record', { appId: id });

    // Databricks resource cleanup
    if (appData.databricksHost && appData.databricksApiKey) {
      try {
        await cleanupDatabricksResources({
          appId: id,
          databricksHost: appData.databricksHost,
          databricksApiKey: appData.databricksApiKey,
        });
        logger.info('Databricks resource cleanup completed', { appId: id });
      } catch (error) {
        logger.error('Failed to cleanup Databricks resources', {
          appId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      try {
        await cleanupKoyebResources({
          appId: id,
          ownerId: user.id,
          koyebServiceId: appData.koyebServiceId,
          koyebDomainId: appData.koyebDomainId,
          koyebAppId: appData.koyebAppId,
          koyebOrgId: koyebOrgId,
          isLastActiveDeployment: isLastActiveDeployment,
        });
      } catch (error) {
        logger.error('Failed to cleanup Koyeb resources', {
          appId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await cleanupNeonResources({
      appId: id,
      neonProjectId: appData.neonProjectId,
    });

    await cleanupECRResources({
      appId: id,
      githubUsername: appData.githubUsername,
    });

    await cleanupGithubResources({
      appId: id,
      repositoryUrl: appData.repositoryUrl,
      githubUsername: appData.githubUsername,
      githubAccessToken: user.githubAccessToken,
    });

    return reply.status(200).send({
      message: 'App deleted successfully',
      appId: id,
    });
  } catch (error) {
    logger.error('Error deleting app', {
      appId: id,
      userId: user.id,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'delete_app_main',
      appId: id,
      userId: user.id,
    });

    return reply.status(500).send({
      error: 'Internal server error while deleting app',
    });
  }
}

async function cleanupKoyebResources({
  appId,
  ownerId,
  koyebServiceId,
  koyebDomainId,
  koyebAppId,
  koyebOrgId,
  isLastActiveDeployment,
}: {
  appId: string;
  ownerId: string;
  koyebServiceId: string | null;
  koyebDomainId: string | null;
  koyebAppId: string | null;
  koyebOrgId: string | null | undefined;
  isLastActiveDeployment: boolean;
}) {
  // Skip if no Koyeb resources to clean up
  if (!koyebServiceId && !koyebDomainId && !koyebAppId) {
    logger.info('No Koyeb resources to clean up', { appId });
    return;
  }

  try {
    if (!koyebOrgId) {
      logger.warn('No Koyeb organization found for user, skipping cleanup', {
        appId,
        ownerId,
      });
      return;
    }

    const userToken = await getOrganizationToken(koyebOrgId);

    logger.info('Starting Koyeb resource cleanup', {
      appId,
      hasService: !!koyebServiceId,
      hasDomain: !!koyebDomainId,
      hasApp: !!koyebAppId,
    });

    if (koyebServiceId) {
      try {
        await deleteKoyebService({
          serviceId: koyebServiceId,
          token: userToken,
        });
        logger.info('Deleted Koyeb service', {
          appId,
          serviceId: koyebServiceId,
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb service (continuing)', {
          appId,
          serviceId: koyebServiceId,
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_service',
          appId,
          serviceId: koyebServiceId,
        });
      }
    }

    if (koyebDomainId) {
      try {
        await deleteKoyebDomain({
          domainId: koyebDomainId,
          token: userToken,
        });
        logger.info('Deleted Koyeb domain', {
          appId,
          domainId: koyebDomainId,
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb domain (continuing)', {
          appId,
          domainId: koyebDomainId,
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_domain',
          appId,
          domainId: koyebDomainId,
        });
      }
    }

    if (koyebAppId) {
      try {
        await deleteKoyebApp({
          appId: koyebAppId,
          token: userToken,
        });
        logger.info('Deleted Koyeb app', {
          appId,
          koyebAppId: koyebAppId,
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb app (continuing)', {
          appId,
          koyebAppId: koyebAppId,
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_app',
          appId,
          koyebAppId: koyebAppId,
        });
      }
    }

    if (isLastActiveDeployment && koyebOrgId) {
      logger.info(
        'Initiating async Koyeb organization deletion (last active deployment)',
        {
          appId,
          koyebOrgId,
          ownerId,
        },
      );

      deleteKoyebOrganization({
        orgId: koyebOrgId,
        token: userToken,
      }).catch((error) => {
        logger.error('Async Koyeb organization deletion failed', {
          appId,
          koyebOrgId,
          error: error instanceof Error ? error.message : error,
        });
        Instrumentation.captureError(error as Error, {
          context: 'async_delete_koyeb_organization',
          appId,
          koyebOrgId,
        });
      });
    } else {
      logger.info('Keeping Koyeb organization (user has other deployments)', {
        appId,
        koyebOrgId,
        isLastActiveDeployment,
      });
    }

    logger.info('Koyeb resource cleanup completed', { appId });
  } catch (error) {
    logger.error('Failed to clean up Koyeb resources', {
      appId,
      ownerId,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_koyeb_resources',
      appId,
      ownerId,
    });
  }
}

async function cleanupNeonResources({
  appId,
  neonProjectId,
}: {
  appId: string;
  neonProjectId: string | null;
}) {
  if (!neonProjectId) {
    logger.info('No Neon project to clean up', { appId });
    return;
  }

  try {
    logger.info('Starting Neon project cleanup', {
      appId,
      neonProjectId,
    });

    await deleteNeonProject({
      projectId: neonProjectId,
    });

    logger.info('Neon project cleanup completed', {
      appId,
      neonProjectId,
    });
  } catch (error) {
    logger.error('Failed to clean up Neon project', {
      appId,
      neonProjectId,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_neon_resources',
      appId,
      neonProjectId,
    });
  }
}

async function cleanupECRResources({
  appId,
  githubUsername,
}: {
  appId: string;
  githubUsername: string | null;
}) {
  if (!githubUsername) {
    logger.info('No GitHub username available, skipping ECR cleanup', {
      appId,
    });
    return;
  }

  try {
    logger.info('Starting ECR resources cleanup', {
      appId,
      githubUsername,
    });

    await deleteECRImages({
      appId,
      githubUsername,
    });

    await deleteECRRepository({
      appId,
      githubUsername,
    });

    logger.info('ECR resources cleanup completed', {
      appId,
      githubUsername,
    });
  } catch (error) {
    logger.error('Failed to clean up ECR resources', {
      appId,
      githubUsername,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_ecr_resources',
      appId,
      githubUsername,
    });
  }
}

async function cleanupGithubResources({
  appId,
  repositoryUrl,
  githubUsername,
  githubAccessToken,
}: {
  appId: string;
  repositoryUrl: string | null;
  githubUsername: string | null;
  githubAccessToken: string;
}) {
  if (!repositoryUrl || !githubUsername) {
    logger.info(
      'No GitHub repository URL or username available, skipping GitHub cleanup',
      {
        appId,
        hasRepositoryUrl: !!repositoryUrl,
        hasGithubUsername: !!githubUsername,
      },
    );
    return;
  }

  try {
    // Parse repository URL to extract owner and repo name
    // Expected format: https://github.com/owner/repo
    const urlMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      logger.warn('Invalid GitHub repository URL format, skipping cleanup', {
        appId,
        repositoryUrl,
      });
      return;
    }

    const owner = urlMatch[1];
    const repo = urlMatch[2];

    if (!owner || !repo) {
      logger.warn(
        'Could not extract owner/repo from GitHub URL, skipping cleanup',
        {
          appId,
          repositoryUrl,
        },
      );
      return;
    }

    // Only archive repositories from the appdotbuilder organization
    if (owner !== DEFAULT_OWNER) {
      logger.info(
        `Repository is not from ${DEFAULT_OWNER} organization, skipping cleanup`,
        {
          appId,
          owner,
          repo,
        },
      );
      return;
    }

    logger.info('Starting GitHub repository cleanup', {
      appId,
      owner,
      repo,
      repositoryUrl,
    });

    const githubEntity = new GithubEntity(githubUsername, githubAccessToken);
    const initializedEntity = await githubEntity.init();
    initializedEntity.repo = repo;

    const result = await archiveRepository({
      githubEntity: initializedEntity,
    });

    if (result.statusCode === 200) {
      logger.info('GitHub repository archived successfully', {
        appId,
        owner,
        repo,
        result,
      });
    } else {
      logger.error('Failed to archive GitHub repository', {
        appId,
        owner,
        repo,
        error: result.error,
      });
    }

    logger.info('GitHub repository cleanup completed', {
      appId,
      owner,
      repo,
    });
  } catch (error) {
    logger.error('Failed to clean up GitHub repository', {
      appId,
      repositoryUrl,
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_github_resources',
      appId,
      repositoryUrl,
    });
  }
}
