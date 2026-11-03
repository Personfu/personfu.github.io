const assert = require('node:assert/strict');
const { launchSecureBrowser } = require('../../scripts/secure-browser.cjs');
async function main() {
  const browser = await launchSecureBrowser({ headless: true });
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><title>Inert browser boundary</title><p>synthetic</p>');
    assert.equal(await page.title(), 'Inert browser boundary');
  } finally { await browser.close(); }
  console.log('Inert browser check passed; no game, external transport or account operation');
}
main().catch(() => { console.error('Inert browser check failed'); process.exitCode = 1; });
