import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end journey and accessibility tests, run against the production build
 * on a phone-sized Chromium. `npm run test:e2e`
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4180',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
