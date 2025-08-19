import {
  ECRClient,
  CreateRepositoryCommand,
  GetAuthorizationTokenCommand,
  BatchDeleteImageCommand,
  ListImagesCommand,
  DeleteRepositoryCommand,
} from '@aws-sdk/client-ecr';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

import { ecrClient } from './client';
import { logger } from '../logger';

function getRepositoryName(githubUsername: string, appId: string) {
  return `${process.env.AWS_ECR_NAMESPACE}-${githubUsername}/${appId}`;
}

export async function createRepositoryIfNotExists(
  repositoryName: string,
  githubUsername: string,
) {
  const nameSpacedRepositoryName = getRepositoryName(
    githubUsername,
    repositoryName,
  );

  try {
    logger.info('Creating ECR repository');
    await ecrClient.send(
      new CreateRepositoryCommand({
        repositoryName: nameSpacedRepositoryName,
      }),
    );
    logger.info(`✅ Created ECR repo: ${nameSpacedRepositoryName}`);
  } catch (err: any) {
    if (err.name === 'RepositoryAlreadyExistsException') {
      logger.info(`ℹ️  Repository already exists: ${nameSpacedRepositoryName}`);
    } else {
      logger.error('❌ Failed to create ECR repository:', err);
      throw err;
    }
  }
}

const REGION = process.env.AWS_REGION;
const ACCOUNT_ID = '361769577597';
const ROLE_ARN = `arn:aws:iam::${ACCOUNT_ID}:role/AppdotbuildECRPullRole`;

export async function generateScopedPullToken(username: string) {
  const repoName = `appdotbuild-${username}`;
  const repoArn = `arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/${repoName}/*`;

  const sts = new STSClient({ region: REGION });

  const sessionPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'ecr:GetAuthorizationToken',
        Resource: '*',
      },
      {
        Effect: 'Allow',
        Action: [
          'ecr:BatchGetImage',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
        ],
        Resource: repoArn,
      },
    ],
  };

  const assume = await sts.send(
    new AssumeRoleCommand({
      RoleArn: ROLE_ARN,
      RoleSessionName: `pull-${username}`,
      DurationSeconds: 900,
      Policy: JSON.stringify(sessionPolicy),
    }),
  );

  const creds = assume.Credentials!;
  const ecrWithTempCreds = new ECRClient({
    region: REGION,
    credentials: {
      accessKeyId: creds.AccessKeyId!,
      secretAccessKey: creds.SecretAccessKey!,
      sessionToken: creds.SessionToken!,
    },
  });

  const auth = await ecrWithTempCreds.send(
    new GetAuthorizationTokenCommand({}),
  );
  const token = auth.authorizationData?.[0];

  if (!token || !token.authorizationToken) {
    throw new Error('Failed to retrieve ECR authorization token');
  }

  const [user, pass] = Buffer.from(token.authorizationToken, 'base64')
    .toString()
    .split(':');

  return {
    username: user as string,
    password: pass as string,
    registry: token.proxyEndpoint!,
    expiresAt: token.expiresAt!,
    repo: repoName,
  };
}

export async function deleteECRImages({
  appId,
  githubUsername,
}: {
  appId: string;
  githubUsername: string;
}) {
  const repositoryName = getRepositoryName(githubUsername, appId);

  try {
    logger.info('Deleting ECR images', { repositoryName, appId });

    // First, list all images in the repository
    const listImagesResponse = await ecrClient.send(
      new ListImagesCommand({
        repositoryName,
      }),
    );

    const imageIds = listImagesResponse.imageIds;

    if (!imageIds || imageIds.length === 0) {
      logger.info('No ECR images to delete', { repositoryName, appId });
      return { deleted: true, imageCount: 0 };
    }

    // Delete all images
    await ecrClient.send(
      new BatchDeleteImageCommand({
        repositoryName,
        imageIds,
      }),
    );

    logger.info('Successfully deleted ECR images', {
      repositoryName,
      appId,
      imageCount: imageIds.length,
    });

    return { deleted: true, imageCount: imageIds.length };
  } catch (error: any) {
    // Don't throw on repository not found
    if (error.name === 'RepositoryNotFoundException') {
      logger.info('ECR repository not found (already deleted)', {
        repositoryName,
        appId,
      });
      return { deleted: true, imageCount: 0, alreadyDeleted: true };
    }

    logger.error('Failed to delete ECR images', {
      repositoryName,
      appId,
      error: error.message || error,
    });
    throw new Error(`Failed to delete ECR images: ${error.message || error}`);
  }
}

export async function deleteECRRepository({
  appId,
  githubUsername,
}: {
  appId: string;
  githubUsername: string;
}) {
  const repositoryName = getRepositoryName(githubUsername, appId);

  try {
    logger.info('Deleting ECR repository', { repositoryName, appId });

    await ecrClient.send(
      new DeleteRepositoryCommand({
        repositoryName,
        force: true, // Delete even if it contains images
      }),
    );

    logger.info('Successfully deleted ECR repository', {
      repositoryName,
      appId,
    });

    return { deleted: true };
  } catch (error: any) {
    // Don't throw on repository not found
    if (error.name === 'RepositoryNotFoundException') {
      logger.info('ECR repository not found (already deleted)', {
        repositoryName,
        appId,
      });
      return { deleted: true, alreadyDeleted: true };
    }

    logger.error('Failed to delete ECR repository', {
      repositoryName,
      appId,
      error: error.message || error,
    });
    throw new Error(
      `Failed to delete ECR repository: ${error.message || error}`,
    );
  }
}
