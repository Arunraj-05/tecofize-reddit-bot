import { defineConfig, loadEnv } from 'vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [devvit()],
    define: {
      'process.env.EXPRESS_PUBLIC_URL': JSON.stringify(env['EXPRESS_PUBLIC_URL'] ?? ''),
      'process.env.DEVVIT_SECRET': JSON.stringify(env['DEVVIT_SECRET'] ?? ''),
    },
  };
});
