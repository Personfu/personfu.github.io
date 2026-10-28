const { test, expect } = require('@playwright/test');

test('phone evidence inspector contains long hex rows and exports a real case pack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/CyberWorld/ascension.html');
  await page.waitForFunction(() => window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill('EVIDENCE-PHONE');
  await page.locator('#cwas-creator-form button[type="submit"]').click();
  if (await page.locator('#cwr-dismiss').isVisible()) await page.locator('#cwr-dismiss').click();
  await page.locator('#cwas-objective-open').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-action="case-download"]').click();
  expect((await download).suggestedFilename()).toBe('cyberworld-route-zero-mission.zip');
  await page.locator('[data-action="case-inspect"]').click();
  await page.locator('[data-evidence-file]').selectOption('1');
  await page.locator('[data-evidence-mode="hex"]').click();
  await expect(page.locator('[data-evidence-output]')).toContainText('d4 c3 b2 a1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const area = await page.locator('[data-evidence-output]').boundingBox();
  expect(area.width).toBeLessThan(390);
  expect(await page.locator('[data-evidence-output]').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
});
