const { test, expect } = require('@playwright/test');
const gamePath = process.env.CW_INPUT_GAME_PATH || '/CyberWorld/ascension.html';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', trace: 'off' });

async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function input(page, axes = [0, 0], buttons = []) {
  await page.evaluate(({ axes, buttons }) => {
    window.__modalInputPad.axes = axes;
    window.__modalInputPad.buttons = Array.from({ length: 4 }, (_, index) => ({ pressed: buttons.includes(index), touched: buttons.includes(index), value: buttons.includes(index) ? 1 : 0 }));
  }, { axes, buttons });
  await frames(page);
}
async function initialize(page, name) {
  await page.addInitScript(() => {
    window.__modalInputPad = { id: 'QA virtual standard controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 4 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__modalInputPad] });
  });
  await page.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwRookie && window.__cwCombatUI && window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(name);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
}

for (const dialog of ['quick play', 'combat preparation']) {
  test(`${dialog} blocks gamepad movement and shortcuts, and held buttons require release after closing`, async ({ page }) => {
    await initialize(page, dialog === 'quick play' ? 'PAD-QUICK' : 'PAD-PREP');
    if (dialog === 'quick play') await page.locator('#cwr-launch').click();
    else {
      const dismiss = page.locator('#cwr-dismiss');
      if (await dismiss.isVisible()) await dismiss.click();
      await page.locator('#cwas-combat-open').click();
    }
    const modal = page.locator(dialog === 'quick play' ? '#cwr-modal' : '#cwcombat-prep');
    await expect(modal).toBeVisible();
    const before = await page.evaluate(() => ({ world: window.__cwWorld.snapshot().world, focus: window.__cwAscension.state().overclock }));

    // Only controller input is injected: no gameplay state, position, rewards,
    // health, timers or completion records are changed by the test.
    await input(page, [1, 1], [2, 3]);
    await page.waitForTimeout(300);
    await expect(modal).toBeVisible();
    await expect(page.locator('#cwas-modal')).toBeHidden();
    const paused = await page.evaluate(() => ({ world: window.__cwWorld.snapshot().world, focus: window.__cwAscension.state().overclock, overclockActive: window.__cwAscension.state().overclockActive, combat: window.__cwWorld.snapshot().combat }));
    expect(paused.world).toEqual(before.world);
    expect(paused.focus).toBe(before.focus);
    expect(paused.overclockActive).toBe(false);
    expect(paused.combat).toBeNull();

    // Releasing the stick while keeping X/Y held must not turn closing the
    // dialog into a deferred Overclock or a hidden Operations shortcut.
    await input(page, [0, 0], [2, 3]);
    if (dialog === 'quick play') await page.locator('#cwr-modal [data-rookie=close]').first().click();
    else await page.locator('#cwcombat-prep-back').click();
    await expect(modal).toBeHidden();
    await page.waitForTimeout(150);
    await expect(page.locator('#cwas-modal')).toBeHidden();
    expect(await page.evaluate(() => window.__cwAscension.state().overclock)).toBe(before.focus);
    expect(await page.evaluate(() => window.__cwWorld.snapshot().world)).toEqual(before.world);

    // A new button press after release still works normally, proving this is
    // modal input isolation rather than disabling gamepad support altogether.
    await input(page);
    await input(page, [0, 0], [3]);
    await expect(page.locator('#cwas-modal')).toBeVisible();
    await expect(page.locator('#cwas-dialog-title')).toContainText('OPERATIONS');
    await input(page);
    await page.keyboard.press('Escape');
    await input(page, [0, 0], [2]);
    expect(await page.evaluate(() => window.__cwAscension.state().overclock)).toBe(before.focus - 25);
    expect(await page.evaluate(() => window.__cwAscension.state().overclockActive)).toBe(true);
    await input(page);
  });
}
