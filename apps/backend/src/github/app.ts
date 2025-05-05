import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import { type Options } from '@octokit/app/dist-types/types';

const APP_ID = Number(process.env.GITHUB_APP_ID);
const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY;

export const githubApp = new App<Options & { Octokit: typeof Octokit }>({
  appId: APP_ID,
  privateKey: PRIVATE_KEY,
  Octokit,
});
