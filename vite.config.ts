import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    return {
      root: 'study-09_26-02_10-main',
      build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [dyadComponentTagger(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'study-09_26-02_10-main'),
        }
      }
    };
});