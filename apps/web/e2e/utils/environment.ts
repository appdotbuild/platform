export function isCIEnvironment(): boolean {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
}

export function isPRBuild(): boolean {
  if (!isCIEnvironment()) return false;

  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    return true;
  }

  if (
    process.env.GITHUB_REF &&
    process.env.GITHUB_REF.startsWith('refs/pull/')
  ) {
    return true;
  }

  return false;
}

export function isMainBranchInCI(): boolean {
  if (!isCIEnvironment()) return false;

  if (process.env.GITHUB_REF === 'refs/heads/main') {
    return true;
  }

  if (process.env.GITHUB_REF_NAME === process.env.GITHUB_DEFAULT_BRANCH) {
    return true;
  }

  const defaultBranches = ['main', 'master', 'develop'];

  if (
    process.env.GITHUB_REF_NAME &&
    defaultBranches.includes(process.env.GITHUB_REF_NAME)
  ) {
    return true;
  }

  return false;
}
