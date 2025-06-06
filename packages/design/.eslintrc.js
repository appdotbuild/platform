/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@appdotbuild/eslint-config/react-internal.js'],
  parser: '@typescript-eslint/parser',
  rules: {
    'no-redeclare': 'off',
  },
  parserOptions: {
    project: '../tsconfig.lint.json',
    tsconfigRootDir: __dirname,
  },
};
