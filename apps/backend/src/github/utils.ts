import { Octokit } from '@octokit/rest';
import { githubApp } from './app';

const userInstallations = new Map<string, Set<number>>();

export async function getUserData(githubAccessToken: string): Promise<{
  data: { login: string };
}> {
  const octokit = new Octokit({
    auth: githubAccessToken,
  });

  return await octokit.rest.users.getAuthenticated();
}

export async function getUserDataWithInstallations(
  githubAccessToken: string,
): Promise<{
  user: { data: { login: string } };
  userInstallations: Map<string, Set<number>>;
}> {
  const octokit = new Octokit({
    auth: githubAccessToken,
  });

  const [user, installations] = await Promise.all([
    octokit.rest.users.getAuthenticated(),
    octokit.rest.apps.listInstallationsForAuthenticatedUser(),
  ]);

  installations.data.installations.forEach((installation) => {
    const installations =
      userInstallations.get(user.data.login) || new Set<number>();

    installations.add(installation.id);
    userInstallations.set(user.data.login, installations);
  });

  return { user, userInstallations };
}

export async function getUserInstallationId(githubAccessToken: string) {
  const { user, userInstallations } = await getUserDataWithInstallations(
    githubAccessToken,
  );

  const res = await githubApp.octokit.rest.apps.getUserInstallation({
    username: user.data.login,
  });
  const installationId = res.data.id;

  // TODO: we might not need this check
  if (!userInstallations.get(user.data.login)?.has(installationId)) {
    return null;
  }

  return installationId;
}

// TODO: Add caching to this function
export async function getOrgInstallationId(
  org: string,
  githubAccessToken: string,
) {
  const { user, userInstallations } = await getUserDataWithInstallations(
    githubAccessToken,
  );

  try {
    const res = await githubApp.octokit.rest.apps.getOrgInstallation({
      org,
    });
    const installationId = res.data.id;

    if (!userInstallations.get(user.data.login)?.has(installationId)) {
      return null;
    }

    return installationId;
  } catch {
    return null;
  }
}

export async function isNeonEmployee(
  githubAccessToken: string,
  username: string,
) {
  try {
    if (
      username === 'lennartkats-db' ||
      username === 'michaelp-db' ||
      username === 'bilalaslamseattle'
    ) {
      return true;
    }

    const octokit = new Octokit({
      auth: githubAccessToken,
    });
    const res = await octokit.rest.orgs.getMembershipForUser({
      org: 'neondatabase-labs',
      username,
    });

    return !!res.data;
  } catch (err) {
    return false;
  }
}

export async function checkIfRepoExists({
  username,
  repoName,
  githubAccessToken,
}: {
  username: string;
  repoName: string;
  githubAccessToken: string;
}): Promise<boolean> {
  const installationId = await getUserInstallationId(githubAccessToken);

  if (!installationId) {
    throw new Error(`Failed to check for repository: No installation found`);
  }

  const octokit = await githubApp.getInstallationOctokit(
    Number(installationId),
  );

  try {
    await octokit.rest.repos.get({
      owner: username,
      repo: repoName,
    });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function getInstallationToken(githubAccessToken: string) {
  const installationId = await getUserInstallationId(githubAccessToken);

  if (!installationId) {
    throw new Error('Installation ID not found');
  }

  const installationOctokit = await githubApp.getInstallationOctokit(
    installationId,
  );
  const { token } = (await installationOctokit.auth({
    type: 'installation',
  })) as { token: string };

  return token;
}
