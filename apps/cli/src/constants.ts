import path from 'path';
import os from 'os';

export const APP_CONFIG_DIR = path.join(
  os.homedir(),
  '.config',
  'app-dot-build-cli',
);

export const APP_USER_HISTORY_DIR = path.join(
  os.homedir(),
  'input-history.json',
  'app-dot-build-cli',
);
