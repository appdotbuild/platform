import fs from 'node:fs/promises';
import { exec as nativeExec } from 'child_process';
import { promisify } from 'node:util';
import { getInstallationToken } from './utils';

const exec = promisify(nativeExec);

export async function cloneRepository({
  repo,
  githubAccessToken,
  tempDirPath,
}: {
  repo: string;
  githubAccessToken: string;
  tempDirPath: string;
}) {
  const token = await getInstallationToken(githubAccessToken);
  const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;

  try {
    await fs.mkdir(tempDirPath, { recursive: true });
    console.log(`Cloning repository into ${tempDirPath}`);
    const { stdout, stderr } = await exec(
      `git clone ${remoteUrl} ${tempDirPath}`,
    );

    console.log(stdout);
    console.error(stderr);
  } catch (error) {
    console.error(error);
  }

  return tempDirPath;
}
