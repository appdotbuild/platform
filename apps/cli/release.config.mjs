export default {
  extends: 'semantic-release-monorepo',
  branches: ['main'],
  tagFormat: '@app.build/cli-v${version}',

  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'bun tools/update-version.ts ${nextRelease.version}',
        publishCmd:
          process.env.BETA_RELEASE === 'true'
            ? 'cd ./tmp && bun publish --access public --tag beta'
            : 'cd ./tmp && bun publish --access public',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: ['CHANGELOG.md'],
      },
    ],
  ],
};
