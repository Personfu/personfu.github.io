const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { crc32 } = require('node:zlib');
const screenshotDir = process.env.CW_FIELD_EVIDENCE_DIR
  ? path.resolve(process.env.CW_FIELD_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../docs/evidence');
const gamePath = process.env.CW_FIELD_GAME_PATH || '/CyberWorld/ascension.html';

test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference' });

async function initialize(page, handle = 'LAST-MILE-QA') {
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwCity && window.__cwWorld && window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(handle);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
}

// Exercise the existing movement input through real collision geometry. This
// never changes a position, sample, mission state or reward directly.
async function walk(page, x, z) {
  await page.evaluate(async ({ x, z }) => {
    const start = performance.now(), angle = .25;
    await new Promise((resolve, reject) => {
      function step() {
        const p = window.__cwWorld.snapshot().world;
        const dx = x - p.x, dz = z - p.z, distance = Math.hypot(dx, dz);
        if (distance < .28) { window.__cwWorld.setMovement(0, 0); resolve(); return; }
        if (performance.now() - start > 18000) {
          window.__cwWorld.setMovement(0, 0);
          reject(new Error(`Physical route blocked at ${p.x},${p.z} toward ${x},${z}`)); return;
        }
        window.__cwWorld.setMovement((dx * Math.cos(angle) - dz * Math.sin(angle)) / distance,
          (dx * Math.sin(angle) + dz * Math.cos(angle)) / distance);
        requestAnimationFrame(step);
      }
      step();
    });
  }, { x, z });
}
async function route(page, points) { for (const point of points) await walk(page, ...point); }
async function cityField(page) { return page.evaluate(() => window.__cwCity.state().field); }
async function closeField(page) { await page.getByRole('button', { name: 'Close field contract', exact: true }).click(); }
async function visit(page, id, points) {
  await route(page, points);
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().focus?.id)).toBe(id);
  await page.keyboard.press('e');
  await expect(page.locator('#cwas-field-title')).toBeVisible();
  await closeField(page);
}
async function download(page, selector) {
  const waiting = page.waitForEvent('download'); await page.locator(selector).click();
  const result = await waiting;
  return { name: result.suggestedFilename(), bytes: fs.readFileSync(await result.path()) };
}
function unzipStored(buffer) {
  const entries = {}; let at = 0;
  while (buffer.readUInt32LE(at) === 0x04034b50) {
    expect(buffer.readUInt16LE(at + 8)).toBe(0);
    const length = buffer.readUInt32LE(at + 18), names = buffer.readUInt16LE(at + 26), extra = buffer.readUInt16LE(at + 28);
    const name = buffer.subarray(at + 30, at + 30 + names).toString('utf8');
    const data = buffer.subarray(at + 30 + names + extra, at + 30 + names + extra + length);
    expect(crc32(data)).toBe(buffer.readUInt32LE(at + 14));
    entries[name] = data; at += 30 + names + extra + length;
  }
  expect(buffer.readUInt32LE(at)).toBe(0x02014b50);
  expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
  expect(buffer.readUInt16LE(buffer.length - 12)).toBe(Object.keys(entries).length);
  return entries;
}

test('The Last Mile requires physical corroboration, preserves the clinic and restores a moving delivery route', async ({ page, browser }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await initialize(page);
  const before = await page.evaluate(() => window.__cwGameplay.state());
  expect({ level: before.level, xp: before.xp }).toEqual({ level: 1, xp: 0 });
  await page.locator('#cwas-field-open').click();
  await expect(page.locator('#cwas-field-title')).toContainText('The Last Mile');
  await expect(page.locator('[data-city-action=field-reward]')).toHaveCount(0);
  const pack = unzipStored((await download(page, '[data-city-action=field-download]')).bytes);
  expect(Object.keys(pack)).toEqual(expect.arrayContaining(['last-mile-brief.txt', 'uplink-change.log', 'sealed-maintenance-manifest.csv', 'clinic-delivery-observations.csv']));
  expect(pack['uplink-change.log'].toString()).toContain('approval=missing');
  expect(pack['sealed-maintenance-manifest.csv'].toString()).toContain('independent-read-only');
  expect(pack['clinic-delivery-observations.csv'].toString()).toContain('8');
  await page.locator('[data-city-action=field-start]').click();
  if (await page.locator('#cwas-modal').isVisible()) await closeField(page);
  expect((await cityField(page)).samples).toEqual([]);
  await page.keyboard.down('Shift');
  await visit(page, 'field-uplink', [[-6, 12], [-6, -15.4]]);
  expect((await cityField(page)).samples).toEqual(['field-uplink']);
  await visit(page, 'field-backup', [[-6, -9], [-28, -9], [-26, -9], [-26, -6]]);
  expect((await cityField(page)).samples).toEqual(['field-uplink', 'field-backup']);
  await visit(page, 'field-clinic', [[-26, -3], [-12, -3], [-6, -5], [10, -5], [8, 0], [8, 3]]);
  expect((await cityField(page)).samples).toEqual(['field-uplink', 'field-backup', 'field-clinic']);
  await route(page, [[8, 6], [-6, 6], [-12, 2.6]]);
  await page.keyboard.up('Shift');
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().focus?.id)).toBe('field-switch');
  await page.keyboard.press('e');
  const allSurveyed = await cityField(page);
  await page.locator('[data-city-action=field-route][data-value=shutdown]').click();
  await expect(page.locator('[data-field-feedback]')).toContainText('clinic');
  expect(await cityField(page)).toEqual(allSurveyed);
  expect(await page.evaluate(() => window.__cwWorld.snapshot().field.convoy.recovered)).toBe(false);
  await page.locator('[data-city-action=field-route][data-value=primary]').click();
  await expect(page.locator('[data-field-feedback]')).toContainText('independent');
  expect(await cityField(page)).toEqual(allSurveyed);
  await page.locator('[data-city-action=field-route][data-value=fallback]').click();
  expect((await cityField(page)).route).toBe('fallback');
  const earlyVerify = page.locator('[data-city-action=field-step][data-value=verify]');
  if (await earlyVerify.isEnabled()) {
    await earlyVerify.click();
    await expect(page.locator('[data-field-feedback]')).toContainText('snapshot');
    expect((await cityField(page)).steps).toEqual([]);
  } else await expect(earlyVerify).toBeDisabled();
  for (const [index, step] of ['snapshot', 'isolate', 'restore', 'verify'].entries()) {
    await page.locator(`[data-city-action=field-step][data-value=${step}]`).click();
    expect((await cityField(page)).steps).toHaveLength(index + 1);
  }
  const completed = await cityField(page);
  expect(completed.phase).toBe('complete');
  const rewarded = await page.evaluate(() => window.__cwGameplay.state());
  // The first 100 XP promote a fresh operative; the remaining 120 stay in tier 2.
  expect({ level: rewarded.level, xp: rewarded.xp }).toEqual({ level: 2, xp: 120 });
  expect(rewarded.credits).toBe(before.credits + 110);
  expect(rewarded.inventory['CONTINUITY-PRISM']).toBe(1); expect(rewarded.completed['city:last-mile']).toBeTruthy();
  const reward = unzipStored((await download(page, '[data-city-action=field-reward]')).bytes);
  expect(Object.keys(reward)).toEqual(expect.arrayContaining(['last-mile-keeper.svg', 'continuity-prism-receipt.json', 'last-mile-field-report.json']));
  expect(reward['last-mile-keeper.svg'].toString()).toContain('<svg');
  expect(reward['continuity-prism-receipt.json'].toString()).toContain('CONTINUITY-PRISM');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, 'last-mile-recovered-desktop.png') });
  await download(page, '[data-city-action=field-reward]');
  expect(await page.evaluate(() => window.__cwGameplay.state())).toEqual(rewarded);
  await closeField(page);
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().field.convoy.moving)).toBe(true);
  const firstPosition = await page.evaluate(() => window.__cwWorld.snapshot().field.convoy.position);
  await expect.poll(() => page.evaluate(first => {
    const position = window.__cwWorld.snapshot().field.convoy.position;
    return Math.hypot(position.x - first.x, position.z - first.z);
  }, firstPosition)).toBeGreaterThan(.3);
  await page.screenshot({ path: path.join(screenshotDir, 'last-mile-delivery-world.png') });
  await page.reload(); await page.waitForFunction(() => window.__cwCity && window.__cwAscensionShell);
  await page.locator('#cwas-continue').click();
  expect(await cityField(page)).toEqual(completed);
  expect(await page.evaluate(() => window.__cwGameplay.state().inventory['CONTINUITY-PRISM'])).toBe(1);
  await page.locator('#cwas-field-open').click();
  await expect(page.locator('[data-city-action=field-start]')).toHaveCount(0);
  await download(page, '[data-city-action=field-reward]');
  expect((await page.evaluate(() => window.__cwGameplay.state())).xp).toBe(rewarded.xp);
  await closeField(page); await page.locator('#cwas-settings').click();
  const exported = JSON.parse((await download(page, '#cwas-save-export')).bytes.toString());
  expect(exported.city.field).toEqual(completed);
  const restoreContext = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  try {
    const restore = await restoreContext.newPage();
    await initialize(restore, 'BEFORE-IMPORT');
    expect((await cityField(restore)).phase).toBe('available');
    await restore.locator('#cwas-settings').click();
    await restore.locator('#cwas-save-import').setInputFiles({ name: 'earned-field-save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
    await expect(restore.locator('#cwas-toast')).toContainText('Progress restored');
    expect(await cityField(restore)).toEqual(completed);
    expect(await restore.evaluate(() => window.__cwGameplay.state().inventory['CONTINUITY-PRISM'])).toBe(1);
    await restore.reload(); await restore.waitForFunction(() => window.__cwCity && window.__cwAscensionShell);
    await restore.locator('#cwas-continue').click();
    expect(await cityField(restore)).toEqual(completed);
  } finally { await restoreContext.close(); }
  expect(errors).toEqual([]);
});

test('phone field contract card and download controls fit and remain tappable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await initialize(page, 'FIELD-PHONE');
  await page.locator('#cwas-field-open').click();
  await expect(page.locator('#cwas-field-title')).toContainText('The Last Mile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const dialog = await page.locator('.cwas-dialog').boundingBox();
  expect(dialog.x).toBeGreaterThanOrEqual(0); expect(dialog.x + dialog.width).toBeLessThanOrEqual(390);
  for (const action of ['field-download', 'field-start']) {
    const button = page.locator(`[data-city-action=${action}]`);
    await button.scrollIntoViewIfNeeded();
    const bounds = await button.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.height).toBeGreaterThanOrEqual(40);
  }
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.locator('.cwas-dialog-body').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(screenshotDir, 'last-mile-phone.png') });
  const pack = await download(page, '[data-city-action=field-download]');
  expect(unzipStored(pack.bytes)['last-mile-brief.txt'].toString()).toContain('THE LAST MILE');
  await page.locator('[data-city-action=field-start]').click();
  expect((await cityField(page)).phase).toBe('survey');
  if (await page.locator('#cwas-modal').isVisible()) await closeField(page);
  await expect(page.locator('#cwas-touch-interact')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
