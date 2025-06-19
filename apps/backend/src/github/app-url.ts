import { logger } from '../logger';
import type { GithubEntityInitialized } from './entity';

type AddAppURLRequest = {
  githubEntity: GithubEntityInitialized;
  appURL: string;
};

type AddAppURLResponse = {
  statusCode: number;
  status: string;
  message: string;
};

export const addAppURL = async ({
  githubEntity,
  appURL,
}: AddAppURLRequest): Promise<AddAppURLResponse> => {
  const { owner, repo, octokit } = githubEntity;

  try {
    await octokit.rest.repos.update({
      owner,
      repo,
      homepage: appURL,
    });

    logger.info(`✅ App URL ${appURL} added to repository ${repo}`);

    return {
      statusCode: 200,
      status: 'success',
      message: 'App URL added',
    };
  } catch (error) {
    logger.error(`Failed to add app URL to repository ${repo}`, { error });
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to add app URL: ${error}`,
    };
  }
};
