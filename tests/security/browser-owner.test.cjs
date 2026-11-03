const assert = require('node:assert/strict');
const { test } = require('node:test');
const { launchSecureBrowser } = require('../../scripts/secure-browser.cjs');
test('standalone QA launchers reject browser substitution and sandbox bypass', async () => {
  for (const options of [{ channel: 'chrome' }, { executablePath: '/tmp/other' }, { chromiumSandbox: false }, { ignoreDefaultArgs: true }, { args: ['--no-sandbox'] }]) {
    await assert.rejects(launchSecureBrowser(options), /cannot replace/);
  }
});
