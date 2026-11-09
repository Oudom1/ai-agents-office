import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Respect the environment-specific API URL instead of overriding it with an obsolete Railway host.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    preview: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      allowedHosts: ['ai-agents-office-frontend-production.up.railway.app'],
    },
    base: process.env.GITHUB_ACTIONS ? '/ai-agents-office/' : '/',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://ai-agents-office-api-v2.onrender.com'),
    },
  };
});
