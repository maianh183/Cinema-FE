import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: 'test-results/e2e',
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/setup.js',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    channel: 'msedge',
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:mock -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
