import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  outputDir: 'test-results/http',
  timeout: 30000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-http-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:3002',
    headless: true,
    channel: 'msedge',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --mode production --port 3002 --strictPort',
    url: 'http://127.0.0.1:3002',
    // Exercise the existing optional refresh contract explicitly; production defaults off.
    env: { VITE_USE_MOCK: 'false', VITE_API_BASE_URL: '/api', VITE_AUTH_REFRESH: 'true' },
    reuseExistingServer: false,
    timeout: 60000,
  },
});
