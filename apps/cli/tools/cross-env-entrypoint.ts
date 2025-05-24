#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import os from 'os';
import path from 'path';
import { execSync } from 'node:child_process';

export const cliName = 'cli';
export const targetEnvs = [
  {
    target: 'bun-linux-x64',
    platform: 'linux',
    arch: 'x64',
    libc: 'glibc',
  },
  {
    target: 'bun-linux-arm64',
    platform: 'linux',
    arch: 'arm64',
    libc: 'glibc',
  },
  {
    target: 'bun-windows-x64',
    platform: 'win32',
    arch: 'x64',
  },
  {
    target: 'bun-darwin-x64',
    platform: 'darwin',
    arch: 'x64',
  },
  {
    target: 'bun-darwin-arm64',
    platform: 'darwin',
    arch: 'arm64',
  },
  {
    target: 'bun-linux-x64-musl',
    platform: 'linux',
    arch: 'x64',
    libc: 'musl',
  },
  {
    target: 'bun-linux-arm64-musl',
    platform: 'linux',
    arch: 'arm64',
    libc: 'musl',
  },
];

const getLinuxLibc = () => {
  // Try to detect musl vs glibc
  try {
    const ldd = execSync('ldd --version', {
      encoding: 'utf8',
    });
    if (ldd?.toLowerCase().includes('musl')) {
      return 'musl';
    }
  } catch {
    // fallback below
  }
  return 'glibc';
};

export const crossEnvEntrypoint = () => {
  const platform = os.platform();
  const arch = os.arch();
  let libc: string | undefined = undefined;
  if (platform === 'linux') {
    libc = getLinuxLibc();
  }

  // Find the best matching targetEnv
  const targetEnv = targetEnvs.find((env) => {
    if (env.platform !== platform) return false;
    if (env.arch !== arch) return false;
    if (platform === 'linux') {
      // libc must match if present
      if (env.libc && libc) return env.libc === libc;
      // If env.libc is not set, only match if libc is also not set
      if (!env.libc && !libc) return true;
      return false;
    }
    return true;
  });

  let binary;
  if (!targetEnv) {
    // Fallback: use the Node.js entrypoint
    binary = path.join(__dirname, '../tmp/dist/cli.js');
    console.warn(
      '[cross-env-entrypoint] No native binary found for this platform/arch/libc, falling back to dist/cli.js',
    );
    spawnSync('node', [binary, ...process.argv.slice(2)], { stdio: 'inherit' });
    return;
  }

  // Compose the binary filename
  let binaryName = `${cliName}-${targetEnv.target}`;
  binary = path.join(__dirname, '../tmp/dist', binaryName);

  const result = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' });
  if (result.error) {
    // Node failed to spawn the process
    console.error(result.error);
    process.exit(1);
  }
  // Forward the exit code (or signal) from the child process
  if (typeof result.status === 'number') {
    process.exit(result.status);
  } else if (result.signal) {
    // If the process was killed by a signal, exit with a special code
    process.kill(process.pid, result.signal);
  } else {
    process.exit(1); // fallback
  }
};

// only run if the file is executed directly
if (require.main === module) {
  crossEnvEntrypoint();
}
