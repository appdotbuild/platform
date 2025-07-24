import { Octokit } from '@octokit/rest';

const BATABRICKS_DOMAIN = '@databricks.com';
const PLATFORM_ADMIN_ROLES = ['platform_admin', 'staff'] as const;
const ROLES = [...PLATFORM_ADMIN_ROLES, 'member'] as const;
type UserRole = (typeof ROLES)[number];

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

export async function generateUserRole({
  githubUsername,
  githubAccessToken,
  email,
}: {
  githubUsername: string;
  githubAccessToken: string;
  email: string;
}): Promise<UserRole> {
  const isNeonEmployeeResult = await isNeonEmployee(
    githubAccessToken,
    githubUsername,
  );
  const isDatabricksEmployeeResult = isDatabricksEmployee(email);
  if (isNeonEmployeeResult || isDatabricksEmployeeResult) {
    return 'staff';
  }

  return 'member';
}

export function isPrivilegedUser(userRole: UserRole) {
  return PLATFORM_ADMIN_ROLES.some((role) => role === userRole);
}
