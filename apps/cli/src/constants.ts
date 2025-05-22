import path from 'path';
import os from 'os';

export const APP_CONFIG_DIR = path.join(
  os.homedir(),
  '.config',
  'app-dot-build-cli',
);
