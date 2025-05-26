/**
 * This script is used to prepare the package.json file for the release.
 * It removes the workspace dependencies from the package.json file.
 *
 * When we prepare the cli file with bun, we have every dependency inside the file
 * so there's no need for any dependency to be installed in the project.
 *
 * But the package json that gets distributed has `workspace:*` versions since
 * we are using internal packages from the monorepo.
 *
 * This file basically takes the packages json, and removes any dependency that
 * has a `workspace:*` version, so when we install the CLI using `npx @app.build/cli`
 * it will not fail
 */
import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export async function prepareRelease() {
  const pkgPath = path.resolve(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJson;

  const deps = ['dependencies', 'peerDependencies', 'devDependencies'];

  for (const depType of deps) {
    if (!pkg[depType]) continue;

    const entries: [string, string][] = Object.entries(pkg[depType]);

    for (const [name, version] of entries) {
      if (version.startsWith('workspace:')) {
        delete pkg[depType][name];
      }
    }
  }

  const tmpPkgPath = path.join(__dirname, '../tmp');
  const tmpPkgEntrypoint = path.join(tmpPkgPath, 'dist/src/cli.js');

  fs.writeFileSync(
    path.join(__dirname, '../tmp', 'package.json'),
    JSON.stringify(pkg, null, 2),
    'utf-8',
  );
  fs.copyFileSync(
    path.join(__dirname, '../README.md'),
    path.join(__dirname, '../tmp', 'README.md'),
  );
}
