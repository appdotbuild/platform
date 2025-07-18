import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { PluginOption } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() as PluginOption,
    tailwindcss() as PluginOption,
  ],
  server: {
    port: 3001,
  },
  build: {
    outDir: 'dist',
  },
  define: {
    'process.env': {},
  },
});
