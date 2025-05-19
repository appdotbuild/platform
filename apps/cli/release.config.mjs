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
      '@semantic-release/npm',
      {
        pkgRoot: './tmp',
        prepare: true,
      },
    ],
  ],
};
