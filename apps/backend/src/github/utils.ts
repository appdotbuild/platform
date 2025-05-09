import { Octokit } from '@octokit/rest';
import { githubApp } from './app';

const userInstallations = new Map<string, Set<number>>();

export async function getUserData(githubAccessToken: string): Promise<{
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

// TODO: Add caching to this function
export async function getOrgInstallationId(
  org: string,
  githubAccessToken: string,
) {
  const { user, userInstallations } = await getUserData(githubAccessToken);

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

export async function isNeonEmployee(githubAccessToken: string) {
  try {
    const octokit = new Octokit({
      auth: githubAccessToken,
    });
    const user = await octokit.rest.users.getAuthenticated();
    const res = await octokit.rest.orgs.getMembershipForUser({
      org: 'neondatabase-labs',
      username: user.data.login,
    });

    return !!res.data;
  } catch (err) {
    return false;
  }
}
