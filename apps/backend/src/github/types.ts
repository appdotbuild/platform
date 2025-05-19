export type WithGithubAccessToken<T> = T & {
  githubAccessToken: string;
};
export type WithInstallationId<T> = T & {
  installationId: number;
};
