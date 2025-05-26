import { exec as execNative } from 'child_process';
import { promisify } from 'node:util';
import { cliName, targetEnvs } from './cross-env-entrypoint';

const exec = promisify(execNative);

export function createCrossEnvExecutables(cliEntrypointPath: string) {
  try {
    return Promise.all(
      targetEnvs.map(async (targetEnv) => {
        await exec(
          `bun build ${cliEntrypointPath} --target=${targetEnv.target} --compile --minify --sourcemap --outfile tmp/dist/${cliName}-${targetEnv.target}`,
        );
      }),
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Only run if the file is executed directly (for CI)
if (require.main === module) {
  const cliEntrypointPath = process.argv[2];
  if (!cliEntrypointPath) {
    console.error(
      'Usage: node create-cross-env-executables.js <cli-entrypoint-path>',
    );
    process.exit(1);
  }

  createCrossEnvExecutables(cliEntrypointPath)
    .then(() => {
      console.log('Cross-environment executables created successfully');
    })
    .catch((error) => {
      console.error('Failed to create cross-environment executables:', error);
      process.exit(1);
    });
}
