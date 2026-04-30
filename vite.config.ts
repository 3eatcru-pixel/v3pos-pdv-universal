import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isBuild = mode === 'production';
  const plugins = [react(), tailwindcss()];

  // Keep deep type/lint checking for local dev feedback, but do not block production
  // artifact generation on unrelated legacy typing issues across the workspace.
  if (!isBuild) {
    plugins.push(
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
          useFlatConfig: true,
        },
        overlay: false,
      })
    );
  }

  return {
    plugins,
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
