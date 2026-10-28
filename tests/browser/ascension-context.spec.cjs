const { test, expect } = require('@playwright/test');

test('skyline camera tilt stays above the physical rooftop', async ({ page }) => {
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(() => window.__cwWorld && window.__cwRookie);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill('SKYLINE-QA');
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await page.locator('#cwr-dismiss').click();
  await page.mouse.move(700, 530);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(780, 400, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, 1600);
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().cameraElevation)).toBeCloseTo(.1, 2);
  await page.waitForTimeout(700);
  const snapshot = await page.evaluate(() => window.__cwWorld.snapshot());
  const p = snapshot.cameraPosition;
  const ground = p.x >= 11.4 && p.x <= 14.6 && p.z >= 12 && p.z <= 23 ? (p.z - 12) / 11 * 4.2 : p.x >= 11.4 && p.x <= 23 && p.z >= 23 && p.z <= 31 ? 4.2 : 0;
  expect(p.y).toBeGreaterThanOrEqual(ground + .74);
  await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().cityArt.artStatus)).toBe('ready');
  expect(snapshot.cityArt.drawObjects).toBeLessThanOrEqual(25);
  await page.screenshot({ path: 'docs/evidence/signal-noir-city-district.png' });
});

test('beginner Walk here moves the real character before collecting the welcome marker', async ({ page }) => {
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(() => window.__cwRookie && window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill('WALK-FIRST');
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('#cwr-card')).toBeVisible();
  await expect(page.locator('#cwg-action-go')).toHaveText('WALK HERE');
  const before = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(await page.evaluate(() => window.__cwRookie.state().intro)).toBe(0);
  await page.locator('#cwg-action-go').click();
  await expect.poll(() => page.evaluate(() => window.__cwRookie.state().intro)).toBe(1);
  const after = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(after.x-before.x, after.z-before.z)).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.__cwGameplay.state().inventory['SPARK-COMPANION'] || 0)).toBe(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`nearby interaction is visible and usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/CyberWorld/ascension.html');
    await page.waitForFunction(() => window.__cwAscensionShell && window.__cwWorld);
    await page.locator('#cwas-begin').click();
    await page.locator('#cwas-handle').fill('PROMPT-QA');
    await page.locator('#cwas-creator-form button[type=submit]').click();
    if (await page.locator('#cwr-dismiss').isVisible()) await page.locator('#cwr-dismiss').click();
    await page.keyboard.down('a');
    await page.waitForTimeout(650);
    await page.keyboard.up('a');
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.up('w');
    await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().focus?.id)).toBe('zero');
    await expect(page.locator('#cwg-action')).toBeVisible();
    await expect(page.locator('#cwg-action-title')).toHaveText('AGENT ZERO');
    const prompt = await page.locator('#cwg-action').boundingBox();
    expect(prompt.x).toBeGreaterThanOrEqual(0);
    expect(prompt.x + prompt.width).toBeLessThanOrEqual(viewport.width);
    expect(prompt.y + prompt.height).toBeLessThanOrEqual(viewport.height);
    if (viewport.width < 600) {
      const touch = await page.locator('#cwas-touch-interact').boundingBox();
      expect(prompt.y + prompt.height).toBeLessThan(touch.y);
      const dpad = await page.locator('.cwas-dpad').boundingBox();
      expect(prompt.x).toBeGreaterThan(dpad.x + dpad.width);
      await expect(page.locator('.cwas-mobile-hint')).toBeVisible();
    } else {
      await expect(page.locator('.cwas-desktop-hint')).toBeVisible();
      expect(await page.locator('.cwas-controls-hint').evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(10);
    }
    await page.locator('#cwg-action-go').click();
    await expect(page.locator('#cwas-dialog-title')).toContainText('Agent Zero');
    await expect(page.locator('#cwg-action')).toBeHidden();
  });
}
