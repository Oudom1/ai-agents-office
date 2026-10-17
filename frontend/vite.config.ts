import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const RAILWAY_API = 'https://ai-agents-office-production.up.railway.app';

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['ai-agents-office-frontend-production.up.railway.app'],
  },
  base: process.env.GITHUB_ACTIONS ? '/ai-agents-office/' : '/',
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(RAILWAY_API),
  },
});
