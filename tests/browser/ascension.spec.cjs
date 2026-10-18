const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const screenshotDir = path.resolve(__dirname, '../../docs/screenshots');
async function initialize(page, name = 'GRID-QA') {
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(() => window.__cwAscensionShell && window.__cwWorld);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(name);
  await page.locator('#cwas-creator-form button[type="submit"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
}
test('true 3D city, creator, movement, modal pause and settings work', async ({ page }) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(() => window.__cwWorld && window.__cwWorld.snapshot().renderer === 'webgl');
  await expect(page.locator('#cwas-title')).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-title.png') });
  await page.locator('#cwas-begin').click();
  await page.locator('[data-color="#b797ff"]').click();
  await page.locator('#cwas-handle').fill('PERSON-QA');
  await page.locator('#cwas-specialization').selectOption('packet');
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-operative.png') });
  await page.locator('#cwas-creator-form button[type="submit"]').click();
  await expect(page.locator('#cwas-callsign')).toHaveText('PERSON-QA');
  const before = await page.evaluate(() => window.__cwWorld.snapshot().world);
  await page.keyboard.down('d');
  await page.waitForTimeout(550);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.2);
  await page.keyboard.press('a');
  await expect(page.locator('#cwas-modal')).toBeHidden();
  await page.keyboard.press('m');
  await expect(page.locator('#cwas-dialog-title')).toContainText('The Grid');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-plaza.png') });
  await page.locator('#cwas-radio-open').click();
  await expect(page.locator('#cwas-modal')).toBeVisible();
  await expect(page.locator('#cwas-dialog-title')).toContainText('Agent Zero');
  const paused = await page.evaluate(() => window.__cwWorld.snapshot().world);
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  const still = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(still.x - paused.x, still.z - paused.z)).toBeLessThan(0.02);
  await page.locator('[data-action="enter-soc"]').click();
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().district)).toBe('soc');
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-soc.png') });
  await page.locator('#cwas-settings').click();
  await expect(page.locator('#cwas-settings-title')).toBeVisible();
  await page.locator('#cwas-setting-quality').selectOption('medium');
  expect(await page.evaluate(() => window.__cwWorld.snapshot().diagnostics.quality)).toBe('medium');
  await page.locator('#cwas-setting-quality').selectOption('custom');
  await page.locator('#cwas-setting-shadows').uncheck();
  expect(await page.evaluate(() => window.__cwWorld.snapshot().diagnostics.graphics.shadows)).toBe(false);
  await page.locator('#cwas-setting-motion').click();
  expect(await page.evaluate(() => window.__cwWorld.snapshot().reducedMotion)).toBe(true);
  await page.locator('[data-shell-close]').click();
  await page.reload();
  await page.waitForFunction(() => window.__cwAscensionShell);
  await page.locator('#cwas-continue').click();
  await expect(page.locator('#cwas-callsign')).toHaveText('PERSON-QA');
  expect(await page.evaluate(() => window.__cwWorld.snapshot().reducedMotion)).toBe(true);
  expect(errors).toEqual([]);
});
test('touch layout and accessible Cyberdeck stay inside a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initialize(page, 'MOBILE-QA');
  await expect(page.locator('#cwas-touch-interact')).toBeVisible();
  const before = await page.evaluate(() => window.__cwWorld.snapshot().world);
  const moveButton = await page.locator('[data-move="1,0"]').boundingBox();
  await page.mouse.move(moveButton.x + moveButton.width / 2, moveButton.y + moveButton.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  const after = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-mobile.png') });
  await page.locator('[data-deck="missions"]').click();
  await expect(page.locator('#cwas-modal')).toBeVisible();
  const dialog = await page.locator('.cwas-dialog').boundingBox();
  expect(dialog.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(screenshotDir, 'ascension-mobile-deck.png') });
});
test('two real tabs discover each other and remove departed peers', async ({ context, page }) => {
  await initialize(page, 'TAB-ONE');
  const other = await context.newPage();
  await other.goto('/CyberWorld/ascension.html');
  await other.waitForFunction(() => window.__cwAscensionShell);
  await other.locator('#cwas-continue').click();
  await expect(other.locator('body')).toHaveAttribute('data-phase', 'playing');
  const oneId = await page.evaluate(() => window.__cwAscensionNet.status().sessionId);
  const otherId = await other.evaluate(() => window.__cwAscensionNet.status().sessionId);
  expect(oneId).not.toBe(otherId);
  // Real public Presence changes are batched by the provider. Validate the
  // actual opposite session, not any unrelated connected visitor or fake count.
  await expect.poll(() => Promise.all([[page, otherId], [other, oneId]].map(([tab, id]) => tab.evaluate(peerId => ({
    found: window.__cwAscensionNet.peers().some(peer => peer.sessionId === peerId),
    mode: window.__cwAscensionNet.status().mode,
    peerCount: window.__cwAscensionNet.peers().length,
  }), id))), { timeout: 20000, message: 'Both actual tab sessions discover each other through the available real transport' }).toMatchObject([{ found: true }, { found: true }]);
  expect(await page.evaluate(() => window.__cwAscensionNet.peers().every(peer => !('email' in peer)))).toBe(true);
  await other.close();
  await expect.poll(() => page.evaluate(id => window.__cwAscensionNet.peers().some(peer => peer.sessionId === id), otherId), { timeout: 20000, message: 'The actual departed session is removed after provider leave delivery' }).toBe(false);
});
test('installed public game reloads offline without escaping into member routes', async ({ context, page }) => {
  await initialize(page, 'OFFLINE-QA');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__cwAscensionShell && window.__cwWorld);
  await page.locator('#cwas-continue').click();
  await expect(page.locator('#cwas-callsign')).toHaveText('OFFLINE-QA');
  await expect.poll(() => page.locator('#cwas-presence-label').innerText()).toMatch(/SOLO|BROWSER|OFFLINE|LOCAL/);
  await context.setOffline(false);
});
