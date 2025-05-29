import {
  ECRClient,
  CreateRepositoryCommand,
  GetAuthorizationTokenCommand,
} from '@aws-sdk/client-ecr';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

import { ecrClient } from './client';
import { logger } from '../logger';

export async function createRepositoryIfNotExists(
  repositoryName: string,
  githubUsername: string,
) {
  const nameSpacedRepositoryName = `${process.env.AWS_ECR_NAMESPACE}-${githubUsername}/${repositoryName}`;

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
