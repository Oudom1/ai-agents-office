import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const RAILWAY_API = 'https://ai-agents-office-production.up.railway.app';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/ai-agents-office/' : '/',
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(RAILWAY_API),
  },
});
