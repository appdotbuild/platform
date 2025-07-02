import type { Endpoints } from '@octokit/types';
import { logger } from '../logger';
import { type GithubEntityInitialized } from './entity';

type CreateRepositoryRequest = {
  githubEntity: GithubEntityInitialized;
  appURL?: string;
};

type PostCreateOrganizationRepositoryResponse =
  Endpoints['POST /orgs/{org}/repos']['response'];

type PostCreateUserRepositoryResponse =
  Endpoints['POST /user/repos']['response'];

export const createRepository = async ({
  githubEntity,
  appURL,
}: CreateRepositoryRequest) => {
  const method = githubEntity.isOrg
    ? createOrgRepository
    : createUserRepository;

  return method({
    githubEntity,
    appURL,
  });
};

const createUserRepository = async ({
  githubEntity,
  appURL,
}: CreateRepositoryRequest) => {
  try {
    const response: PostCreateUserRepositoryResponse =
      await githubEntity.octokit.rest.repos.createForAuthenticatedUser({
        name: githubEntity.repo,
        ...(appURL && { homepage: appURL }),
        description: 'Created by App.build',
        private: false,
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

const createOrgRepository = async ({
  githubEntity,
  appURL,
}: CreateRepositoryRequest) => {
  try {
    const response: PostCreateOrganizationRepositoryResponse =
      await githubEntity.octokit.rest.repos.createInOrg({
        org: githubEntity.owner,
        name: githubEntity.repo,
        ...(appURL && { homepage: appURL }),
        description: 'Created by App.build',
        private: false,
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
