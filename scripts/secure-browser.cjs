const { chromium } = require('@playwright/test');
const { secureBrowserExecutable, assertPatchedVersion } = require('../tests/security/browser-policy.cjs');

async function launchSecureBrowser(options = {}) {
  if (['executablePath', 'channel', 'ignoreDefaultArgs', 'chromiumSandbox'].some(key => Object.hasOwn(options, key)) ||
      (options.args || []).some(arg => /no-sandbox|disable-setuid-sandbox|disable-gpu-sandbox|disable-web-security|single-process/.test(arg))) {
    throw new Error('QA callers cannot replace the pinned executable or weaken browser isolation');
  }
  const browser = await chromium.launch({ ...options, executablePath: secureBrowserExecutable(), chromiumSandbox: true });
  try { assertPatchedVersion(browser.version()); console.log('Verified QA browser:', browser.version()); return browser; }
  catch (error) { await browser.close(); throw error; }
}
module.exports = { launchSecureBrowser };
