import { Octokit } from '@octokit/rest';
import type { WithGithubAccessToken } from './types';
import { logger } from '../logger';

type AddAppURLRequest = {
  repo: string;
  owner: string;
  appURL: string;
};

type AddAppURLResponse = {
  statusCode: number;
  status: string;
  message: string;
};

export const addAppURL = async ({
  repo,
  owner,
  appURL,
  githubAccessToken,
}: WithGithubAccessToken<AddAppURLRequest>): Promise<AddAppURLResponse> => {
  try {
    const octokit = new Octokit({
      auth: githubAccessToken,
    });

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
