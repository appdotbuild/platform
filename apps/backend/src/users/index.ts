import { Octokit } from '@octokit/rest';

const BATABRICKS_DOMAIN = '@databricks.com';

async function isNeonEmployee(
  githubAccessToken: string,
  username: string,
): Promise<boolean> {
  try {
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

function isDatabricksEmployee(email: string) {
  return email.endsWith(BATABRICKS_DOMAIN);
}

export async function isPrivilegedUser({
  githubUsername,
  githubAccessToken,
  email,
}: {
  githubUsername: string;
  githubAccessToken: string;
  email: string;
}) {
  return (
    (await isNeonEmployee(githubAccessToken, githubUsername)) ||
    isDatabricksEmployee(email)
  );
}

// Deprecated: Use isPrivilegedUser instead
export function checkIsPrivilegedUser({
  githubUsername,
  githubAccessToken,
  email,
}: {
  githubUsername: string;
  githubAccessToken: string;
  email: string;
}) {
  return isPrivilegedUser({ githubUsername, githubAccessToken, email });
}
