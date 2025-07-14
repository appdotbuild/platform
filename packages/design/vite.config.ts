import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['**/*.stories.ts', '**/*.stories.tsx', 'node_modules'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AppdotbuildDesign',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'tailwindcss',
        '@tailwindcss/vite',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-collapsible',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-icons',
        '@radix-ui/react-label',
        '@radix-ui/react-popover',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slot',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-tooltip',
        '@tanstack/react-table',
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'zod',
        'react-hook-form',
        '@hookform/resolvers',
        'zustand',
        'next-themes',
        'sonner',
        'use-debounce',
        'immer',
        'cmdk',
        'ai',
        '@assistant-ui/react',
        '@assistant-ui/react-ai-sdk',
        '@assistant-ui/react-markdown',
        '@assistant-ui/react-syntax-highlighter',
        '@multiavatar/multiavatar',
        'react-markdown',
        'react-syntax-highlighter',
        'remark-gfm',
        'remark-math',
        'rehype-katex',
        'tailwindcss-animate',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
