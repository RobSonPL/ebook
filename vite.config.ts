import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use (process as any) to avoid TypeScript errors with 'cwd' if types are missing
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Expose API_KEY to client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});