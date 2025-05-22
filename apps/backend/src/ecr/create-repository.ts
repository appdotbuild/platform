import { CreateRepositoryCommand } from '@aws-sdk/client-ecr';
import { ecrClient } from './client';
import { logger } from '../logger';

export async function createRepositoryIfNotExists(repositoryName: string) {
  const nameSpacedRepositoryName = `${process.env.AWS_ECR_NAMESPACE}/${repositoryName}`;

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
