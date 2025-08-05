// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginTanstackQuery from '@tanstack/eslint-plugin-query';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginReact.configs.flat['jsx-runtime'],
  pluginReactHooks.configs['recommended-latest'],
  ...pluginTanstackQuery.configs['flat/recommended'],
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    rules: {
      // Block all relative imports (any import path starting with '.')
      'no-console': ['error', { allow: ['error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['.*'],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'public',
      'public/**/*',
      'eslint.config.mjs',
    ],
  },
);
