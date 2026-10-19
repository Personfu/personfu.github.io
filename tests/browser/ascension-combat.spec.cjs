const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { crc32 } = require('node:zlib');
const gamePath = process.env.CW_COMBAT_GAME_PATH || '/CyberWorld/ascension.html';
const evidenceDir = process.env.CW_COMBAT_EVIDENCE_DIR || path.resolve(__dirname, '../../docs/evidence');

// Explicit screenshots and assertions cover this timed, input-heavy playtest.
// Recording 1,500+ coach calls caused Chrome context teardown to stall on the
// local Windows host after every gameplay assertion had already passed.
test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference', trace: 'off' });

async function initialize(page, handle = 'FOUNDRY-QA') {
  // Fonts are decorative. Keep timing-based sparring independent of a remote
  // font host and let screenshots use the game's local fallback fonts.
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwCombatUI && window.__cwWorld && window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(handle);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
}
async function state(page) { return page.evaluate(() => window.__cwWorld.snapshot().combat); }
async function download(page, selector) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: fs.readFileSync(await file.path()) };
}
function unzip(buffer) {
  let at = 0;
  const files = {};
  while (buffer.readUInt32LE(at) === 0x04034b50) {
    const length = buffer.readUInt32LE(at + 18), nameLength = buffer.readUInt16LE(at + 26), extra = buffer.readUInt16LE(at + 28);
    const name = buffer.subarray(at + 30, at + 30 + nameLength).toString();
    const bytes = buffer.subarray(at + 30 + nameLength + extra, at + 30 + nameLength + extra + length);
    expect(crc32(bytes)).toBe(buffer.readUInt32LE(at + 14)); files[name] = bytes;
    at += 30 + nameLength + extra + length;
  }
  expect(buffer.readUInt32LE(at)).toBe(0x02014b50);
  expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
  return files;
}

// This coach reads the same tells as a player and presses actual displayed
// abilities. It never changes health, position, enemies, cooldowns or rewards.
async function clearArena(page) {
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const combat = await state(page);
    if (combat.phase === 'victory') return combat;
    if (combat.phase === 'defeat') throw new Error('UI-driven foundry run ended in defeat.');
    if (combat.phase !== 'active') { await page.waitForTimeout(90); continue; }
    const nearby = combat.enemies.filter(enemy => enemy.hp > 0 && enemy.phase !== 'dead').map(enemy => ({
      ...enemy, distance: Math.hypot(enemy.x - combat.player.x, enemy.z - combat.player.z)
    })).sort((a, b) => a.distance - b.distance);
    const imminent = nearby.some(enemy => enemy.phase === 'windup' && enemy.timer < .32 && Math.hypot(combat.player.x - enemy.attackX, combat.player.z - enemy.attackZ) < enemy.attackRadius);
    if (imminent && combat.cooldowns.dodge < .02 && combat.energy >= 18) await page.keyboard.press('Space');
    else if (nearby[0]?.distance < 4.7 && combat.cooldowns.burst < .02 && combat.energy >= 30) {
      const burst = page.locator('#cwcombat-burst');
      if (await burst.isEnabled()) await burst.click();
    }
    if (nearby[0]?.distance < 3.15 && combat.cooldowns.strike < .02) await page.keyboard.press('j');
    await page.waitForTimeout(90);
  }
  throw new Error('Combat coach timed out before clearing the three visible waves.');
}

test('Breach Foundry uses real movement, combo abilities, three waves, one-time rewards and valid downloadable souvenirs', async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await initialize(page);
  const before = await page.evaluate(() => window.__cwGameplay.state());
  expect(await page.evaluate(() => window.__cwCombatUI.rewardFiles())).toBeNull();
  expect(await page.evaluate(() => window.__cwCombatUI.downloadReward())).toBe(false);
  await page.locator('#cwas-combat-open').click();
  await expect(page.locator('#cwcombat-hud')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/cwas-in-combat/);
  await expect(page.locator('.cwas-objective')).toBeHidden();
  await expect(page.locator('#cwas-settings')).toBeVisible();
  const initial = await page.evaluate(() => window.__cwWorld.snapshot().world);
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  const moved = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(moved.x - initial.x, moved.z - initial.z)).toBeGreaterThan(.5);
  await page.keyboard.press('j');
  await expect(page.locator('#cwas-modal')).toBeHidden();
  await expect(page.locator('#cwcombat-strike')).toBeDisabled();
  await page.keyboard.press('l');
  expect((await state(page)).overclockUntil).toBeGreaterThan((await state(page)).time);
  await page.locator('#cwas-settings').click();
  const paused = await state(page); await page.waitForTimeout(450);
  expect((await state(page)).time).toBe(paused.time);
  await page.keyboard.press('Escape');
  const kit = unzip((await download(page, '#cwcombat-brief')).bytes);
  expect(kit['breach-foundry-field-guide.txt'].toString()).toContain('DEFENSIVE COUNTER');
  expect(JSON.parse(kit['defense-counters.json'])).toMatchObject({ synthetic: true, live_targets: false });
  // File I/O and screenshots are intentionally outside the scored run. Start
  // fresh through the same Leave / Enter controls available to a player.
  await page.locator('#cwcombat-exit').click();
  await page.locator('#cwas-combat-open').click();
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'breach-foundry-live-combat.png') });
  const won = await clearArena(page);
  expect(won.kills).toBe(8); expect(won.wave).toBe(3);
  await expect(page.locator('#cwcombat-result')).toBeVisible();
  await expect(page.locator('#cwcombat-result')).toContainText('FIRST VICTORY');
  const earned = await page.evaluate(() => window.__cwGameplay.state());
  expect(earned.credits).toBe(before.credits + 140);
  expect(earned.inventory['PHASE-GAUNTLET']).toBe(1);
  expect(earned.completed['combat:breach-foundry']).toBeTruthy();
  expect(earned.flags.combatBest.wins).toBe(1);
  const reward = unzip((await download(page, '#cwcombat-reward')).bytes);
  expect(reward['breach-foundry-badge.svg'].toString()).toContain('<svg');
  const receipt = JSON.parse(reward['phase-gauntlet-receipt.json']);
  expect(receipt).toMatchObject({ module: 'PHASE-GAUNTLET', official_certification: false, local_victories: 1 });
  await page.screenshot({ path: path.join(evidenceDir, 'breach-foundry-victory.png') });
  await page.locator('#cwcombat-retry').click();
  await clearArena(page);
  await expect(page.locator('#cwcombat-result')).toContainText('NO REPEAT XP, CREDITS OR GEAR');
  const repeated = await page.evaluate(() => window.__cwGameplay.state());
  expect({ xp: repeated.xp, credits: repeated.credits, level: repeated.level }).toEqual({ xp: earned.xp, credits: earned.credits, level: earned.level });
  expect(repeated.inventory['PHASE-GAUNTLET']).toBe(1);
  expect(repeated.flags.combatBest.wins).toBe(2);
  await page.locator('#cwcombat-return').click();
  await expect(page.locator('#cwcombat-hud')).toBeHidden();
  expect(await state(page)).toBeNull();
  await page.reload(); await page.waitForFunction(() => window.__cwCombatUI && window.__cwAscensionShell);
  await page.locator('#cwas-continue').click();
  expect((await page.evaluate(() => window.__cwGameplay.state())).inventory['PHASE-GAUNTLET']).toBe(1);
  expect((await page.evaluate(() => window.__cwGameplay.state())).flags.combatBest.wins).toBe(2);
  expect(errors).toEqual([]);
});

test.describe('phone combat', () => {
test.use({ hasTouch: true });
test('combat defeat can retry without losing campaign progress and phone abilities stay tappable', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await initialize(page, 'FOUNDRY-PHONE');
  const before = await page.evaluate(() => window.__cwGameplay.state());
  await page.locator('#cwas-combat-open').click();
  await expect(page.locator('#cwcombat-hud')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  for (const ability of ['strike', 'burst', 'dodge', 'overclock']) {
    const bounds = await page.locator('#cwcombat-' + ability).boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(44); expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  const move = page.locator('[data-move="1,0"]'), bounds = await move.boundingBox();
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  const position = await page.evaluate(() => window.__cwWorld.snapshot().world);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
  const afterPad = await page.evaluate(() => window.__cwWorld.snapshot().world);
  expect(Math.hypot(afterPad.x - position.x, afterPad.z - position.z)).toBeGreaterThan(.2);
  await page.locator('#cwcombat-dodge').tap();
  expect((await state(page)).dodges).toBe(1);
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'breach-foundry-phone.png') });
  await expect.poll(async () => (await state(page)).phase, { timeout: 55000, intervals: [500] }).toBe('defeat');
  await expect(page.locator('#cwcombat-result')).toContainText('SIGNAL INTERRUPTED');
  expect(await page.evaluate(() => window.__cwGameplay.state())).toEqual(before);
  await page.locator('#cwcombat-retry').tap();
  expect((await state(page)).health).toBe(100);
  expect((await state(page)).wave).toBe(1);
  await page.locator('#cwcombat-exit').tap();
  await expect(page.locator('#cwcombat-hud')).toBeHidden();
  expect(await page.evaluate(() => window.__cwGameplay.state())).toEqual(before);
});
});
