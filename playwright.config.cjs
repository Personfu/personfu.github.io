const { defineConfig } = require('@playwright/test');
const { secureBrowserExecutable } = require('./tests/security/browser-policy.cjs');
module.exports = defineConfig({
  globalSetup: './tests/security/browser-preflight.mjs',
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { executablePath: secureBrowserExecutable(), chromiumSandbox: true },
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: { command: 'node scripts/preview-ascension.cjs', url: 'http://127.0.0.1:4173/CyberWorld/ascension.html', reuseExistingServer: true, timeout: 15000 },
});
