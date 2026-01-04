import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declaration to fix "Cannot find name 'process'" error in environments without node types
declare const process: any;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.CLIENT_ID': JSON.stringify(env.CLIENT_ID)
    }
  };
});