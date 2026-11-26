import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import securityPolicy from './electron/securityPolicy.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const development = command === 'serve';
  const csp = securityPolicy.buildCsp({ development, apiUrl: env.VITE_API_URL || undefined });
  return {
    plugins: [react(), {
      name: 'zent-content-security-policy',
      transformIndexHtml: {
        order: 'post',
        handler: () => [{
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
          injectTo: 'head-prepend',
        }],
      },
    }],
    base: './',
    server: { port: 5180, strictPort: true, host: 'localhost' },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
