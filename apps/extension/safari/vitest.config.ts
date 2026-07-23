import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/tests/setup.ts')],
  },
});