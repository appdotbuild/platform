import type { Config } from 'tailwindcss';
import baseConfig from '@appdotbuild/design/tailwind.config';

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html',
    '../../packages/design/base/**/*.{ts,tsx}',
    '../../packages/design/components/**/*.{ts,tsx}',
    '../../packages/design/hooks/**/*.{ts,tsx}',
    '../../packages/design/lib/**/*.{ts,tsx}',
    '../../packages/design/shadcn/**/*.{ts,tsx}',
  ],
  presets: [baseConfig],
} satisfies Config as any;
