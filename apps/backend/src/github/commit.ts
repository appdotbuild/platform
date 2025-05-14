import type { FastifyReply } from 'fastify';

import { githubApp } from './app';
import type { FastifyRequest } from 'fastify';
import type { Octokit } from '@octokit/rest';
import { getOrgInstallationId, getUserInstallationId } from './utils';
import type { WithGithubAccessToken, WithInstallationId } from './types';

type Paths = {
  path: string;
  content: string;
};

type InitialCommitRequest = {
  repo: string;
  owner: string;
  paths: Paths[];
};

type CommitRequest = {
  repo: string;
  owner: string;
  paths: Paths[];
  message: string;
  branch: string;
};

type CommitResponse = {
  statusCode: number;
  status: string;
  message: string;
  url?: string;
};

const BOT_USER_EMAIL = process.env.GITHUB_APP_BOT_EMAIL;

export const createUserInitialCommit = async ({
  repo,
  owner,
  paths,
  githubAccessToken,
}: WithGithubAccessToken<InitialCommitRequest>): Promise<CommitResponse> => {
  const installationId = await getUserInstallationId(githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to create commit: No installation found for ${owner}`,
    };
  }

  return createInitialCommit({ installationId, repo, owner, paths });
};

export const createOrgInitialCommit = async ({
  repo,
  owner,
  paths,
  githubAccessToken,
}: WithGithubAccessToken<InitialCommitRequest>): Promise<CommitResponse> => {
  const installationId = await getOrgInstallationId(owner, githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to create commit: No installation found for ${owner}`,
    };
  }

  return createInitialCommit({ installationId, repo, owner, paths });
};

const createInitialCommit = async ({
  repo,
  owner,
  paths,
  installationId,
}: WithInstallationId<InitialCommitRequest>): Promise<CommitResponse> => {
  const octokit = await githubApp.getInstallationOctokit(
    Number(installationId),
  );

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/main`,
  });

  const latestCommitSha = refData.object.sha;

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });

  if (
    commitData.parents.length > 0 ||
    commitData.message === 'AppDotBuild: Initial commit'
  ) {
    return {
      statusCode: 400,
      status: 'error',
      message: 'Repository already has commits or is already initialized',
    };
  }

  const response = await createOrUpdateCommit(octokit, {
    repo,
    owner,
    paths,
    message: 'AppDotBuild: Initial commit',
    forceUpdate: true,
  });

  return {
    statusCode: 200,
    status: 'success',
    message: 'Initial commit created',
    url: response.data.object.url,
  };
};

export const createUserCommit = async ({
  repo,
  owner,
  paths,
  message,
  branch = 'main',
  githubAccessToken,
}: WithGithubAccessToken<CommitRequest>): Promise<CommitResponse> => {
  const installationId = await getUserInstallationId(githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to create commit: No installation found for ${owner}`,
    };
  }

  return commitChanges({ installationId, repo, owner, paths, message, branch });
};

export const createOrgCommit = async ({
  repo,
  owner,
  paths,
  message,
  branch = 'main',
  githubAccessToken,
}: WithGithubAccessToken<CommitRequest>): Promise<CommitResponse> => {
  const installationId = await getOrgInstallationId(owner, githubAccessToken);

  if (!installationId) {
    return {
      statusCode: 400,
      status: 'error',
      message: `Failed to create commit: No installation found for ${owner}`,
    };
  }

  return commitChanges({ installationId, repo, owner, paths, message, branch });
};

const commitChanges = async ({
  repo,
  owner,
  paths,
  message,
  branch = 'main',
  installationId,
}: WithInstallationId<CommitRequest>): Promise<CommitResponse> => {
  const octokit = await githubApp.getInstallationOctokit(
    Number(installationId),
  );

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const latestCommitSha = refData.object.sha;

  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });

  const baseTreeSha = commitData.tree.sha;

  const response = await createOrUpdateCommit(octokit, {
    repo,
    owner,
    paths,
    message,
    baseTreeSha,
    latestCommitSha,
  });

  return {
    statusCode: 200,
    status: 'success',
    message: 'Changes committed',
    url: response.data.object.url,
  };
};

async function createOrUpdateRef(
  octokit: Octokit,
  {
    owner,
    repo,
    branch,
    sha,
    forceUpdate = false,
  }: {
    owner: string;
    repo: string;
    branch: string;
    sha: string;
    forceUpdate?: boolean;
  },
) {
  const fullRef = `refs/heads/${branch}`;

  try {
    const response = await octokit.git.createRef({
      owner,
      repo,
      ref: fullRef,
      sha,
    });
    console.log(`✅ Created ref ${fullRef}`);
    return response;
  } catch (err: any) {
    if (
      err.status === 422 &&
      err.message.includes('Reference already exists')
    ) {
      const response = await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha,
        force: forceUpdate,
      });
      console.log(`🔁 Updated existing ref ${fullRef}`);
      return response;
    } else {
      throw err;
    }
  }
}

async function createOrUpdateCommit(
  octokit: Octokit,
  {
    repo,
    owner,
    paths,
    message,
    latestCommitSha,
    baseTreeSha,
    forceUpdate = false,
  }: {
    repo: string;
    owner: string;
    paths: Paths[];
    message: string;
    latestCommitSha?: string;
    baseTreeSha?: string;
    forceUpdate?: boolean;
  },
) {
  const blobs = await Promise.all(
    paths.map(async ({ path, content }) => {
      const {
        data: { sha: blobSha },
      } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content).toString('base64'),
        encoding: 'base64',
      });
      return { path, sha: blobSha };
    }),
  );

  const {
    data: { sha: treeSha },
  } = await octokit.rest.git.createTree({
    owner,
    repo,
    tree: blobs.map(({ path, sha }) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha,
    })),
    ...(baseTreeSha && { base_tree: baseTreeSha }),
  });

  const {
    data: { sha: commitSha },
  } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: treeSha,
    parents: latestCommitSha ? [latestCommitSha] : [],
    author: {
      name: 'AppDotBuild',
      email: BOT_USER_EMAIL,
    },
  });

  return await createOrUpdateRef(octokit, {
    owner,
    repo,
    branch: 'main',
    sha: commitSha,
    forceUpdate,
  });
}

export const createUserInitialCommitEndpoint = async (
  request: FastifyRequest<{ Body: InitialCommitRequest }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths } = request.body;

  if (!repo || !paths) {
    return reply.status(400).send({
      error: 'Missing required fields',
    });
  }

  const response = await createUserInitialCommit({
    repo,
    owner,
    paths,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send({
    message: response.message,
    status: response.status,
  });
};

export const createOrgInitialCommitEndpoint = async (
  request: FastifyRequest<{ Body: InitialCommitRequest }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths } = request.body;

  if (!repo || !paths) {
    return reply.status(400).send({
      error: 'Missing required fields',
    });
  }

  const response = await createOrgInitialCommit({
    repo,
    owner,
    paths,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send({
    message: response.message,
    status: response.status,
  });
};

export const userCommitChangesEndpoint = async (
  request: FastifyRequest<{
    Body: CommitRequest;
  }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths, message, branch = 'main' } = request.body;

  if (!repo || !owner || !paths || !message) {
    return reply.status(400).send({
      error: 'Missing required fields',
    });
  }

  const response = await createUserCommit({
    repo,
    owner,
    paths,
    message,
    branch,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send({
    message: response.message,
    status: response.status,
  });
};

export const orgCommitChangesEndpoint = async (
  request: FastifyRequest<{
    Body: CommitRequest;
  }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths, message, branch = 'main' } = request.body;

  if (!repo || !owner || !paths || !message) {
    return reply.status(400).send({
      error: 'Missing required fields',
    });
  }

  const response = await createOrgCommit({
    repo,
    owner,
    paths,
    message,
    branch,
    githubAccessToken: request.user.githubAccessToken,
  });

  return reply.status(response.statusCode).send({
    message: response.message,
    status: response.status,
  });
};
