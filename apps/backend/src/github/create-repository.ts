import { Octokit } from '@octokit/rest';
import type { Endpoints } from '@octokit/types';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../logger';
import { githubApp } from './app';
import { getOrgInstallationId, getUserInstallationId } from './utils';
import type { WithGithubAccessToken } from './types';

type CreateOrgRepositoryRequest = {
  repo: string;
  owner: string;
  appURL?: string;
};

type CreateUserRepositoryRequest = {
  repo: string;
  appURL?: string;
};

type PostCreateOrganizationRepositoryResponse =
  Endpoints['POST /orgs/{org}/repos']['response'];

type PostCreateUserRepositoryResponse =
  Endpoints['POST /user/repos']['response'];

export const createUserRepository = async ({
  repo,
  appURL,
  githubAccessToken,
}: WithGithubAccessToken<CreateUserRepositoryRequest>) => {
  const installationId = await getUserInstallationId(githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to create repository: No installation found`,
    };
  }

  try {
    const octokit = new Octokit({
      auth: githubAccessToken,
    });

    const response: PostCreateUserRepositoryResponse =
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repo,
        ...(appURL && { homepage: appURL }),
        description: 'Created by App.build',
        private: true, // remove later
        auto_init: true,
      });

    logger.log('✅ Repository created successfully!', response);

    return {
      statusCode: 200,
      status: 'success',
      message: 'Repository created',
      repositoryUrl: response.data.html_url,
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      error: `Failed to create repository: ${error.message}`,
    };
  }
};

export const createOrgRepository = async ({
  repo,
  owner,
  appURL,
  githubAccessToken,
}: WithGithubAccessToken<CreateOrgRepositoryRequest>) => {
  const installationId = await getOrgInstallationId(owner, githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      error: `Failed to create repository: No installation found for ${owner}`,
    };
  }

  const octokit = await githubApp.getInstallationOctokit(
    Number(installationId),
  );

  try {
    const response: PostCreateOrganizationRepositoryResponse =
      await octokit.rest.repos.createInOrg({
        org: owner,
        name: repo,
        ...(appURL && { homepage: appURL }),
        description: 'Created by appdotbuild',
        private: true, // remove later
        auto_init: true,
      });

    logger.log('✅ Repository created successfully!', response);

    return {
      statusCode: 200,
      status: 'success',
      message: 'Repository created',
      repositoryUrl: response.data.html_url,
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      error: `Failed to create repository: ${error.message}`,
    };
  }
};

export const createOrgRepositoryEndpoint = async (
  request: FastifyRequest<{ Body: CreateOrgRepositoryRequest }>,
  reply: FastifyReply,
) => {
  const { repo, owner, appURL } = request.body;

  const response = await createOrgRepository({
    repo,
    owner,
    appURL,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send(response);
};

export const createUserRepositoryEndpoint = async (
  request: FastifyRequest<{ Body: CreateUserRepositoryRequest }>,
  reply: FastifyReply,
) => {
  const { repo, appURL } = request.body;

  const response = await createUserRepository({
    repo,
    appURL,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send(response);
};
