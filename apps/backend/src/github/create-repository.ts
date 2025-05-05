import type { FastifyReply } from 'fastify';

import { githubApp } from './app';
import type { FastifyRequest } from 'fastify';
import type { Endpoints } from '@octokit/types';
import { getOrgInstallationId } from './utils';

type CommitRequest = {
  repo: string;
  owner: string;
  appURL?: string;
};

type PostCreateOrganizationRepositoryResponse =
  Endpoints['POST /orgs/{org}/repos']['response'];

export const createRepository = async (
  request: FastifyRequest<{ Body: CommitRequest }>,
  reply: FastifyReply,
) => {
  const { repo, owner, appURL } = request.body;

  const installationId = await getOrgInstallationId(
    owner,
    request.user.githubAccessToken,
  );

  if (!installationId) {
    return reply.status(400).send({
      error: `Failed to create repository: No installation found for ${owner}`,
    });
  }

  const octokit = await githubApp.getInstallationOctokit(
    Number(installationId),
  );

  try {
    const res: PostCreateOrganizationRepositoryResponse =
      await octokit.rest.repos.createInOrg({
        org: owner,
        name: repo,
        // homepage: appURL,
        description: 'Created by appdotbuild',
        private: true, // remove later
        auto_init: true,
      });

    console.log('✅ Repository created successfully!', res);

    return reply.status(200).send({
      status: 'success',
      message: 'Repository created',
      repo: res.data.html_url,
    });
  } catch (error: any) {
    return reply
      .status(400)
      .send({ error: `Failed to create repository: ${error.message}` });
  }
};
