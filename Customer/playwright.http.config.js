import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: 'test-results/http',
  testDir: './tests/http',
  timeout: 20000,
  workers: 1,
  reporter: 'list',
  use: { channel: 'msedge', baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
});
