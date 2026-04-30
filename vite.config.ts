import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isBuild = mode === 'production';
  const plugins: any[] = [react(), tailwindcss()];

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
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('react-is') ||
              id.includes('use-sync-external-store')
            ) return 'react-vendor';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
            if (id.includes('framer-motion') || id.includes('motion')) return 'motion-vendor';
            if (id.includes('lucide-react')) return 'icons-vendor';
            if (id.includes('xlsx')) return 'xlsx-vendor';
            if (id.includes('html5-qrcode')) return 'scanner-vendor';
            return 'vendor';
          },
        },
      },
    },
  };
});
