import type { FastifyReply } from 'fastify';

import { githubApp } from './app';
import type { FastifyRequest } from 'fastify';
import type { Octokit } from '@octokit/rest';
import { getOrgInstallationId } from './utils';

type Paths = {
  path: string;
  content: string;
};

type CommitRequest = {
  repo: string;
  owner: string;
  paths: Paths[];
};

export const createInitialCommit = async (
  request: FastifyRequest<{ Body: CommitRequest }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths } = request.body;

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
    return reply.status(400).send({
      status: 'error',
      message: 'Repository already has commits or is already initialized',
    });
  }

  await createOrUpdateCommit(octokit, {
    repo,
    owner,
    paths,
    message: 'AppDotBuild: Initial commit',
    forceUpdate: true,
  });

  return reply.send({
    status: 'success',
    message: 'Initial commit created',
  });
};

export const commitChanges = async (
  request: FastifyRequest<{ Body: CommitRequest & { message: string } }>,
  reply: FastifyReply,
) => {
  const { repo, owner, paths, message } = request.body;

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

  const baseTreeSha = commitData.tree.sha;

  await createOrUpdateCommit(octokit, {
    repo,
    owner,
    paths,
    message,
    baseTreeSha,
    latestCommitSha,
  });

  return reply.send({
    status: 'success',
    message: 'Changes committed',
  });
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
    await octokit.git.createRef({
      owner,
      repo,
      ref: fullRef,
      sha,
    });
    console.log(`✅ Created ref ${fullRef}`);
  } catch (err: any) {
    if (
      err.status === 422 &&
      err.message.includes('Reference already exists')
    ) {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha,
        force: forceUpdate,
      });
      console.log(`🔁 Updated existing ref ${fullRef}`);
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
  });

  await createOrUpdateRef(octokit, {
    owner,
    repo,
    branch: 'main',
    sha: commitSha,
    forceUpdate,
  });
}
