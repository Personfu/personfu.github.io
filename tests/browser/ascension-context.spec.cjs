const { test, expect } = require('@playwright/test');

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`nearby interaction is visible and usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/CyberWorld/ascension.html');
    await page.waitForFunction(() => window.__cwAscensionShell && window.__cwWorld);
    await page.locator('#cwas-begin').click();
    await page.locator('#cwas-handle').fill('PROMPT-QA');
    await page.locator('#cwas-creator-form button[type=submit]').click();
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
