import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
    },
    reporters:
      process.env.GITHUB_ACTIONS === 'true'
        ? ['verbose', 'github-actions']
        : ['verbose'],
    environment: 'node',
  },
});
