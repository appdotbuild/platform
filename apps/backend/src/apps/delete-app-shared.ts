import { and, eq, isNull } from 'drizzle-orm';
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
import type { App } from '../db/schema';

type AppData = Pick<
  App,
  | 'id'
  | 'name'
  | 'ownerId'
  | 'koyebAppId'
  | 'koyebServiceId'
  | 'koyebDomainId'
  | 'neonProjectId'
  | 'githubUsername'
  | 'repositoryUrl'
  | 'databricksHost'
  | 'databricksApiKey'
  | 'deletedAt'
>;
type DeleteContext = {
  appId: string;
  userId: string;
  githubAccessToken: string;
  isAdminDelete?: boolean;
};

export async function executeAppDeletion(
  appData: AppData,
  context: DeleteContext,
): Promise<void> {
  const { appId, userId, githubAccessToken, isAdminDelete = false } = context;

  // Check if app is already deleted
  if (appData.deletedAt) {
    throw new Error('App is already deleted');
  }

  // Get organization info and check remaining deployments (for Koyeb cleanup decisions)
  const userDeployments = await db
    .select({
      koyebOrgId: deployments.koyebOrgId,
      appId: deployments.appId,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.ownerId, appData.ownerId),
        isNull(deployments.deletedAt),
      ),
    );

  const koyebOrgId = userDeployments[0]?.koyebOrgId;
  const remainingDeployments = userDeployments.filter((d) => d.appId !== appId);
  const isLastActiveDeployment = remainingDeployments.length === 0;

  await db.delete(appPrompts).where(eq(appPrompts.appId, appId));
  logger.info('Hard deleted app prompts', {
    appId,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });

  await db
    .update(deployments)
    .set({ deletedAt: new Date() })
    .where(eq(deployments.appId, appId));
  logger.info('Soft deleted deployment records', {
    appId,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });

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
    .where(eq(apps.id, appId));
  logger.info('Soft deleted main app record', {
    appId,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });

  // Databricks resource cleanup
  if (appData.databricksHost && appData.databricksApiKey) {
    try {
      await cleanupDatabricksResources({
        appId,
        databricksHost: appData.databricksHost,
        databricksApiKey: appData.databricksApiKey,
      });
      logger.info('Databricks resource cleanup completed', {
        appId,
        isAdminDelete,
        ...(isAdminDelete
          ? { adminUserId: userId, appOwnerId: appData.ownerId }
          : { userId }),
      });
    } catch (error) {
      logger.error('Failed to cleanup Databricks resources', {
        appId,
        isAdminDelete,
        ...(isAdminDelete
          ? { adminUserId: userId, appOwnerId: appData.ownerId }
          : { userId }),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    try {
      await cleanupKoyebResources({
        appId,
        ownerId: appData.ownerId,
        koyebServiceId: appData.koyebServiceId,
        koyebDomainId: appData.koyebDomainId,
        koyebAppId: appData.koyebAppId,
        koyebOrgId: koyebOrgId,
        isLastActiveDeployment: isLastActiveDeployment,
        isAdminDelete,
        adminUserId: isAdminDelete ? userId : undefined,
      });
    } catch (error) {
      logger.error('Failed to cleanup Koyeb resources', {
        appId,
        isAdminDelete,
        ...(isAdminDelete
          ? { adminUserId: userId, appOwnerId: appData.ownerId }
          : { userId }),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await cleanupNeonResources({
    appId,
    neonProjectId: appData.neonProjectId,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });

  await cleanupECRResources({
    appId,
    githubUsername: appData.githubUsername,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });

  await cleanupGithubResources({
    appId,
    repositoryUrl: appData.repositoryUrl,
    githubUsername: appData.githubUsername,
    githubAccessToken,
    isAdminDelete,
    ...(isAdminDelete
      ? { adminUserId: userId, appOwnerId: appData.ownerId }
      : { userId }),
  });
}

async function cleanupKoyebResources({
  appId,
  ownerId,
  koyebServiceId,
  koyebDomainId,
  koyebAppId,
  koyebOrgId,
  isLastActiveDeployment,
  isAdminDelete = false,
  adminUserId,
}: {
  appId: string;
  ownerId: string;
  koyebServiceId: string | null;
  koyebDomainId: string | null;
  koyebAppId: string | null;
  koyebOrgId: string | null | undefined;
  isLastActiveDeployment: boolean;
  isAdminDelete?: boolean;
  adminUserId?: string;
}) {
  // Skip if no Koyeb resources to clean up
  if (!koyebServiceId && !koyebDomainId && !koyebAppId) {
    logger.info('No Koyeb resources to clean up', {
      appId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
    });
    return;
  }

  try {
    if (!koyebOrgId) {
      logger.warn('No Koyeb organization found for user, skipping cleanup', {
        appId,
        ownerId,
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId } : {}),
      });
      return;
    }

    const userToken = await getOrganizationToken(koyebOrgId);

    logger.info('Starting Koyeb resource cleanup', {
      appId,
      hasService: !!koyebServiceId,
      hasDomain: !!koyebDomainId,
      hasApp: !!koyebAppId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb service (continuing)', {
          appId,
          serviceId: koyebServiceId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_service',
          appId,
          serviceId: koyebServiceId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb domain (continuing)', {
          appId,
          domainId: koyebDomainId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_domain',
          appId,
          domainId: koyebDomainId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
        });
      } catch (error) {
        logger.error('Failed to delete Koyeb app (continuing)', {
          appId,
          koyebAppId: koyebAppId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
          error: error instanceof Error ? error.message : error,
        });

        Instrumentation.captureError(error as Error, {
          context: 'delete_koyeb_app',
          appId,
          koyebAppId: koyebAppId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId } : {}),
        },
      );

      deleteKoyebOrganization({
        orgId: koyebOrgId,
        token: userToken,
      }).catch((error) => {
        logger.error('Async Koyeb organization deletion failed', {
          appId,
          koyebOrgId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
          error: error instanceof Error ? error.message : error,
        });
        Instrumentation.captureError(error as Error, {
          context: 'async_delete_koyeb_organization',
          appId,
          koyebOrgId,
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
        });
      });
    } else {
      logger.info('Keeping Koyeb organization (user has other deployments)', {
        appId,
        koyebOrgId,
        isLastActiveDeployment,
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
      });
    }

    logger.info('Koyeb resource cleanup completed', {
      appId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId: ownerId } : {}),
    });
  } catch (error) {
    logger.error('Failed to clean up Koyeb resources', {
      appId,
      ownerId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId } : {}),
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_koyeb_resources',
      appId,
      ownerId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId } : {}),
    });
  }
}

async function cleanupNeonResources({
  appId,
  neonProjectId,
  isAdminDelete = false,
  userId,
  adminUserId,
  appOwnerId,
}: {
  appId: string;
  neonProjectId: string | null;
  isAdminDelete?: boolean;
  userId?: string;
  adminUserId?: string;
  appOwnerId?: string;
}) {
  if (!neonProjectId) {
    logger.info('No Neon project to clean up', {
      appId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
    return;
  }

  try {
    logger.info('Starting Neon project cleanup', {
      appId,
      neonProjectId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });

    await deleteNeonProject({
      projectId: neonProjectId,
    });

    logger.info('Neon project cleanup completed', {
      appId,
      neonProjectId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  } catch (error) {
    logger.error('Failed to clean up Neon project', {
      appId,
      neonProjectId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_neon_resources',
      appId,
      neonProjectId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  }
}

async function cleanupECRResources({
  appId,
  githubUsername,
  isAdminDelete = false,
  userId,
  adminUserId,
  appOwnerId,
}: {
  appId: string;
  githubUsername: string | null;
  isAdminDelete?: boolean;
  userId?: string;
  adminUserId?: string;
  appOwnerId?: string;
}) {
  if (!githubUsername) {
    logger.info('No GitHub username available, skipping ECR cleanup', {
      appId,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
    return;
  }

  try {
    logger.info('Starting ECR resources cleanup', {
      appId,
      githubUsername,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
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
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  } catch (error) {
    logger.error('Failed to clean up ECR resources', {
      appId,
      githubUsername,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_ecr_resources',
      appId,
      githubUsername,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  }
}

async function cleanupGithubResources({
  appId,
  repositoryUrl,
  githubUsername,
  githubAccessToken,
  isAdminDelete = false,
  userId,
  adminUserId,
  appOwnerId,
}: {
  appId: string;
  repositoryUrl: string | null;
  githubUsername: string | null;
  githubAccessToken: string;
  isAdminDelete?: boolean;
  userId?: string;
  adminUserId?: string;
  appOwnerId?: string;
}) {
  if (!repositoryUrl || !githubUsername) {
    logger.info(
      'No GitHub repository URL or username available, skipping GitHub cleanup',
      {
        appId,
        hasRepositoryUrl: !!repositoryUrl,
        hasGithubUsername: !!githubUsername,
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
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
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
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
          isAdminDelete,
          ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
        },
      );
      return;
    }

    logger.info('Starting GitHub repository cleanup', {
      appId,
      owner,
      repo,
      repositoryUrl,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
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
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
      });
    } else {
      logger.error('Failed to archive GitHub repository', {
        appId,
        owner,
        repo,
        error: result.error,
        isAdminDelete,
        ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
      });
    }

    logger.info('GitHub repository cleanup completed', {
      appId,
      owner,
      repo,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  } catch (error) {
    logger.error('Failed to clean up GitHub repository', {
      appId,
      repositoryUrl,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
      error: error instanceof Error ? error.message : error,
    });

    Instrumentation.captureError(error as Error, {
      context: 'cleanup_github_resources',
      appId,
      repositoryUrl,
      isAdminDelete,
      ...(isAdminDelete ? { adminUserId, appOwnerId } : { userId }),
    });
  }
}
