import { Octokit } from '@octokit/rest';
import { githubApp } from './app';
import type { GithubEntityInitialized } from './entity';

const userInstallations = new Map<string, Set<number>>();

const DEFAULT_INSTALLATION = {
  installationId: Number(process.env.DEFAULT_APPDOTBUILDER_ORG_INSTALLATION_ID),
  isDefaultInstallation: true,
};

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

export async function getUserInstallationId(
  githubAccessToken: string,
): Promise<{
  installationId: number;
  isDefaultInstallation: boolean;
}> {
  try {
    const { user, userInstallations } = await getUserDataWithInstallations(
      githubAccessToken,
    );

    const res = await githubApp.octokit.rest.apps.getUserInstallation({
      username: user.data.login,
    });
    const installationId = res.data.id;

    // TODO: we might not need this check
    if (!userInstallations.get(user.data.login)?.has(installationId)) {
      return DEFAULT_INSTALLATION;
    }

    return { installationId, isDefaultInstallation: false };
  } catch (error) {
    return DEFAULT_INSTALLATION;
  }
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

export async function checkIfRepoExists({
  githubEntity,
  appName,
}: {
  githubEntity: GithubEntityInitialized;
  appName: string;
}): Promise<boolean> {
  try {
    const { octokit, owner } = githubEntity;

    await octokit.rest.repos.get({
      owner,
      repo: appName,
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
  const { installationId, isDefaultInstallation } = await getUserInstallationId(
    githubAccessToken,
  );

  if (!installationId && !isDefaultInstallation) {
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
