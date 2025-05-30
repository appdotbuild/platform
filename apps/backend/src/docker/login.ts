import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { logger } from '../logger';
import { getECRCredentials } from '../ecr';

function dockerLogin({
  username,
  password,
  registryUrl,
}: {
  username: string;
  password: string;
  registryUrl: string;
}) {
  return new Promise((resolve) => {
    const result = execSync(
      `docker login --username ${username} --password-stdin ${registryUrl}`,
      {
        input: password,
        stdio: 'inherit',
      },
    );

    resolve(result);
  });
}

async function needsLogin() {
  const dockerfilePath = path.join(os.homedir(), '.docker', 'config.json');

  if (!fs.existsSync(dockerfilePath)) {
    logger.info('Docker config file does not exist.');
    return true;
  }

  const stats = fs.statSync(dockerfilePath);
  const mtime = new Date(stats.mtime);

  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 11 * 60 * 60 * 1000);

  const modifiedRecently = mtime > twelveHoursAgo;

  return !modifiedRecently;
}

export async function dockerLoginIfNeeded() {
  const shouldLogin = await needsLogin();

  if (!shouldLogin) {
    logger.info('Docker config already exists, no login needed');
    return Promise.resolve();
  }

  logger.info('Getting ECR credentials');
  return getECRCredentials().then(({ username, password, registryUrl }) => {
    logger.info('Logging in to ECR');
    return dockerLogin({ username, password, registryUrl });
  });
}
