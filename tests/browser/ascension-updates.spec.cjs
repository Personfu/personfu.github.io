const { test, expect } = require('@playwright/test');

test('Grid patches require an explicit verified save and reload once after activation', async ({ page }) => {
  await page.addInitScript(() => {
    const serviceEvents = {}, registrationEvents = {}, installingEvents = {};
    const registration = { waiting: null, installing: null, addEventListener(name, callback) { registrationEvents[name] = callback; } };
    const mock = { controller: {}, addEventListener(name, callback) { serviceEvents[name] = callback; }, register: async () => registration };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: mock });
    window.__patchTest = {
      available() {
        const worker = { state: 'installed', postMessage(message) { sessionStorage.setItem('patch-test-messages', String(Number(sessionStorage.getItem('patch-test-messages') || 0) + 1)); sessionStorage.setItem('patch-test-type', message.type); } };
        registration.installing = { state: 'installing', addEventListener(name, callback) { installingEvents[name] = callback; } };
        registrationEvents.updatefound(); registration.waiting = worker; registration.installing.state = 'installed'; installingEvents.statechange();
      },
      activated() { serviceEvents.controllerchange(); serviceEvents.controllerchange(); },
    };
  });
  await page.goto('/CyberWorld/ascension.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__cwAscensionShell && window.__cwAscension);
  await page.locator('#cwas-settings').click();
  await expect(page.locator('#cwas-apply-update')).toHaveCount(0);
  await page.evaluate(() => window.__patchTest.available());
  await expect(page.locator('#cwas-apply-update')).toBeVisible();
  await page.evaluate(() => {
    const save = window.__cwAscension.exportState(); save.notes = 'Preserve this operation across an explicit patch.';
    window.__cwAscension.importState(save);
    window.__patchCityBefore = window.__cwCity ? JSON.stringify(window.__cwCity.state()) : null;
  });
  // Reopening settings must preserve the waiting-patch action.
  await page.locator('[data-shell-close]').click();
  await page.locator('#cwas-settings').click();
  await page.evaluate(() => {
    window.__originalStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'cw.ascension.v1') throw new Error('Quota exceeded'); return window.__originalStorageWrite.call(this, key, value); };
  });
  await page.locator('#cwas-apply-update').click();
  await expect(page.locator('#cwas-grid-patch [role=alert]')).toContainText('could not be saved');
  expect(await page.evaluate(() => sessionStorage.getItem('patch-test-messages'))).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalStorageWrite; });
  await page.locator('#cwas-apply-update').click();
  expect(await page.evaluate(() => sessionStorage.getItem('patch-test-type'))).toBe('ACTIVATE_PATCH');
  expect(await page.evaluate(() => sessionStorage.getItem('patch-test-messages'))).toBe('1');
  await expect(page.locator('#cwas-apply-update')).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cw.ascension.v1')).notes)).toBe('Preserve this operation across an explicit patch.');
  if (await page.evaluate(() => window.__patchCityBefore !== null)) expect(await page.evaluate(() => localStorage.getItem('cw.ascension.city.v1'))).toBe(await page.evaluate(() => window.__patchCityBefore));
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  await Promise.all([page.waitForEvent('framenavigated', frame => frame === page.mainFrame()), page.evaluate(() => window.__patchTest.activated())]);
  await page.waitForFunction(() => window.__cwAscensionShell);
  expect(navigations).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cw.ascension.v1')).notes)).toBe('Preserve this operation across an explicit patch.');
});
