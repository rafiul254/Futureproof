import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // `server-only` throws outside a React Server Component; stub it so the
    // server-side lib/ modules stay unit-testable.
    alias: { 'server-only': 'node:util' },
  },
  test: {
    environment: 'node',
    include: ['{lib,tests,i18n}/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.test.ts'],
    },
  },
});
