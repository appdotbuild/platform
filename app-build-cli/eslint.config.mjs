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
      'no-console': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  }
);
