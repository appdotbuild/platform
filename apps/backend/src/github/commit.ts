import type { Octokit } from '@octokit/rest';
import { type GithubEntityInitialized } from './entity';

type Paths = {
  path: string;
  content: string;
};

type CreateInitialCommitRequest = {
  githubEntity: GithubEntityInitialized;
  paths: Paths[];
};

type CreateCommitRequest = {
  githubEntity: GithubEntityInitialized;
  paths: Paths[];
  message: string;
  branch: string;
};

type CommitResponse = {
  statusCode: number;
  status: string;
  message: string;
  commitSha?: string;
};

const BOT_USER_EMAIL = process.env.GITHUB_APP_BOT_EMAIL;

export const createInitialCommit = async ({
  githubEntity,
  paths,
}: CreateInitialCommitRequest): Promise<CommitResponse> => {
  const { octokit, owner, repo } = githubEntity;

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
    commitData.message === 'App.Build: Initial commit'
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
    message: 'App.Build: Initial commit',
    forceUpdate: true,
  });

  return {
    statusCode: 200,
    status: 'success',
    message: 'Initial commit created',
    commitSha: response.data.object.sha,
  };
};

export const commitChanges = async ({
  githubEntity,
  paths,
  message,
  branch = 'main',
}: CreateCommitRequest) => {
  const { octokit, owner, repo } = githubEntity;

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
    commitSha: response.data.object.sha,
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
      name: 'App.Build',
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
