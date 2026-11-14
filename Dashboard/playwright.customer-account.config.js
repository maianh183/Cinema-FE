import { defineConfig } from '@playwright/test';

// Both real frontends read the same HTTP fixture; no production backend is implied.
export default defineConfig({
  testDir: './tests/integration',
  testMatch: 'customer-account.spec.js',
  outputDir: 'test-results/customer-account-integration',
  timeout: 45000,
  workers: 1,
  reporter: 'list',
  use: { channel: 'msedge', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run dev -- --mode production --port 3004 --strictPort',
      url: 'http://127.0.0.1:3004',
      env: { VITE_USE_MOCK: 'false', VITE_API_BASE_URL: '/api' },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm --prefix ../Customer run dev -- --port 5176 --strictPort',
      url: 'http://127.0.0.1:5176',
      env: { VITE_USE_MOCK: 'false', VITE_API_BASE_URL: '/api' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
