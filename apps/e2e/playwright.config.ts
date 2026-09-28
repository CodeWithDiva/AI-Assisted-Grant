import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against a running web app and API.
 *
 * Locally: start `pnpm dev`, then `pnpm e2e` (uses the Chrome already installed).
 * CI: the workflow builds and starts both apps, installs Chromium, and sets the URLs below.
 */
export const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173';
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reuse the machine's Chrome locally; CI installs Playwright's Chromium instead.
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
  ],
});
