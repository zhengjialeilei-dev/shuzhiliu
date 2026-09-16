import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../../', import.meta.url)),
  test: {
    include: ['scripts/teaching/*.test.ts'],
    environment: 'jsdom',
    restoreMocks: true,
    clearMocks: true,
  },
});
