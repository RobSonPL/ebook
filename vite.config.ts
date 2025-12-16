import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // To pozwala używać process.env.API_KEY w kodzie klienckim na Vercel
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});