const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { crc32 } = require('node:zlib');

const gamePath = process.env.CW_BLACKOUT_GAME_PATH || '/CyberWorld/ascension.html';
const evidenceDir = process.env.CW_BLACKOUT_EVIDENCE_DIR || path.resolve(__dirname, '../../docs/evidence');
const stages = ['Intercept breach', 'Break malware shield', 'Restore relay'];

// The playtest uses many ordinary input events. Keep an explicit screenshot
// record without storing every render-frame observation in a browser trace.
test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference', trace: 'off' });

async function snapshot(page) { return page.evaluate(() => window.__cwWorld.snapshot()); }
async function operative(page) { return page.evaluate(() => window.__cwGameplay.state()); }
async function load(page) {
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwCombatUI && window.__cwWorld && window.__cwAscensionShell && window.__cwGameplay);
  await expect(page.locator('#cwas-blackout-play')).toBeVisible();
}
async function openBrief(page, touch = false) {
  await page.locator('#cwas-blackout-play')[touch ? 'tap' : 'click']();
  await expect(page.locator('#cwcombat-prep')).toBeVisible();
  await expect(page.locator('#cwcombat-prep-title')).toHaveText('BLACKOUT RUN');
  await expect(page.locator('#cwas-creator')).toBeHidden();
  await expect(page.locator('#cwcombat-pace-options')).toBeHidden();
  expect((await snapshot(page)).combat).toBeNull();
}
async function startBrief(page, touch = false) {
  await page.locator('#cwcombat-prep-start')[touch ? 'tap' : 'click']();
  await expect(page.locator('#cwcombat-prep')).toBeHidden();
  await expect(page.locator('#cwcombat-hud')).toBeVisible();
  expect((await snapshot(page)).combat).toMatchObject({
    difficulty: 'blackout', label: 'Blackout Run', eligibleReward: false,
    maxHealth: 120, totalWaves: 3, totalEnemies: 6,
    objective: { stage: 1, totalStages: 3, totalTargets: 6, relayRestored: false }
  });
}
async function screenshot(page, name) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, name) });
}
function totalXp(op) {
  let xp = op.xp;
  for (let level = 1; level < op.level; level++) xp += Math.floor(100 * Math.pow(1.35, level - 1));
  return xp;
}
async function download(page) {
  const pending = page.waitForEvent('download');
  await page.locator('#cwcombat-blackout-reward').click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('cyberworld-blackout-run-reward.zip');
  return fs.readFileSync(await file.path());
}
function unzip(buffer) {
  let offset = 0;
  const files = {};
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    expect(buffer.readUInt16LE(offset + 8)).toBe(0);
    const length = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26), extra = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString();
    const bytes = buffer.subarray(offset + 30 + nameLength + extra, offset + 30 + nameLength + extra + length);
    expect(crc32(bytes)).toBe(buffer.readUInt32LE(offset + 14));
    files[name] = bytes;
    offset += 30 + nameLength + extra + length;
  }
  expect(buffer.readUInt32LE(offset)).toBe(0x02014b50);
  expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
  return files;
}

// Observe the actual world, walk toward the nearest live construct, hold the
// displayed Punch key and use Burst when close. No API actions, teleports,
// health edits, model ticks, progress writes or perfect-dodge automation.
async function finishRun(page) {
  const observed = { stages: new Set(), bursts: 0, movement: false, combo: false };
  const held = new Set();
  const deadline = Date.now() + 75000;
  let previousStage = 0;
  async function move(keys) {
    for (const key of held) if (!keys.includes(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  }
  const initial = (await snapshot(page)).world;
  await page.keyboard.down('j');
  try {
    while (Date.now() < deadline) {
      const world = await snapshot(page), combat = world.combat;
      expect(combat, 'The action mission must remain active until an earned result.').not.toBeNull();
      observed.stages.add(combat.objective.stage);
      if (combat.objective.stage !== previousStage && combat.phase === 'active') {
        await expect(page.locator('#cwcombat-objective-title')).toHaveText(stages[combat.objective.stage - 1]);
        previousStage = combat.objective.stage;
      }
      observed.combo ||= combat.combo >= 2;
      observed.movement ||= Math.hypot(world.world.x - initial.x, world.world.z - initial.z) > .5;
      expect(combat.objective.defeated).toBe(combat.kills);
      if (combat.kills < 6) expect(combat.objective.relayRestored).toBe(false);
      if (combat.phase === 'victory') return { combat, observed };
      if (combat.phase === 'defeat') throw new Error(`Blackout novice controls lost at stage ${combat.wave}, ${combat.kills}/6 constructs.`);
      const nearest = combat.enemies.filter(enemy => enemy.hp > 0 && enemy.phase !== 'dead').map(enemy => ({
        ...enemy, distance: Math.hypot(enemy.x - combat.player.x, enemy.z - combat.player.z)
      })).sort((a, b) => a.distance - b.distance)[0];
      const keys = [];
      if (nearest && nearest.distance > 3.2) {
        const dx = nearest.x - combat.player.x, dz = nearest.z - combat.player.z;
        // WASD is relative to the visible orbit camera, just as for a player.
        const localX = dx * Math.cos(world.cameraOrbit) - dz * Math.sin(world.cameraOrbit);
        const localZ = dx * Math.sin(world.cameraOrbit) + dz * Math.cos(world.cameraOrbit);
        if (Math.abs(localX) > .35) keys.push(localX > 0 ? 'd' : 'a');
        if (Math.abs(localZ) > .35) keys.push(localZ > 0 ? 's' : 'w');
      }
      await move(keys);
      if (nearest && nearest.distance < 4.9 && combat.cooldowns.burst <= 0 && combat.energy >= 18) {
        await page.keyboard.press('k'); observed.bursts++;
      }
      await page.waitForTimeout(90);
    }
    throw new Error('Blackout run exceeded 75 seconds of ordinary movement, held Punch and Burst.');
  } finally {
    await move([]); await page.keyboard.up('j');
  }
}

test('two clicks enter Blackout, three real stages earn a distinct once-only downloadable reward', async ({ page }) => {
  test.setTimeout(190000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await load(page);
  expect(await page.evaluate(() => window.__cwCombatUI.blackoutFiles())).toBeNull();
  await openBrief(page); // The first click creates a local guest without a form.
  const before = await operative(page);
  expect(before.callsign).toBe('GUEST RUNNER');
  expect(before.completed['combat:blackout-run']).toBeFalsy();
  expect(await page.evaluate(() => window.__cwCombatUI.blackoutFiles())).toBeNull();
  await startBrief(page); // The second click starts actual enemies and controls.
  await expect(page.locator('#cwcombat-stage-track li')).toHaveCount(3);
  for (let index = 0; index < stages.length; index++) {
    await expect(page.locator(`#cwcombat-stage-track [data-stage="${index + 1}"]`)).toContainText(['INTERCEPT', 'CONTAIN', 'RESTORE'][index]);
  }
  await expect(page.locator('#cwas-modal')).toBeHidden();
  await screenshot(page, 'blackout-action-live.png');
  await page.keyboard.down('w'); await page.waitForTimeout(950); await page.keyboard.up('w');
  const beforeMouse = (await snapshot(page)).combat.player.attackUntil;
  await page.mouse.move(700, 410); await page.mouse.down(); await page.waitForTimeout(450); await page.mouse.up();
  const afterMouse = (await snapshot(page)).combat.player.attackUntil;
  expect(afterMouse).toBeGreaterThan(beforeMouse);
  await page.waitForTimeout(700);
  expect((await snapshot(page)).combat.player.attackUntil).toBe(afterMouse);
  const first = await finishRun(page);
  expect([...first.observed.stages]).toEqual([1, 2, 3]);
  expect(first.observed.bursts).toBeGreaterThan(0);
  expect(first.observed.movement).toBe(true);
  expect(first.observed.combo).toBe(true);
  expect(first.combat).toMatchObject({ kills: 6, wave: 3, eligibleReward: false, objective: { completed: true, relayRestored: true, stageDefeated: 2 } });
  await expect(page.locator('#cwcombat-defeated')).toHaveText('6 / 6');
  await expect(page.locator('#cwcombat-result')).toContainText('SIGNAL RESTORED.');
  await expect(page.locator('#cwcombat-result')).toContainText('RELAY-RUNNER EARNED');
  const earned = await operative(page);
  expect(totalXp(earned) - totalXp(before)).toBe(180);
  expect(earned.credits - before.credits).toBe(90);
  expect(earned.inventory['RELAY-RUNNER']).toBe(1);
  expect(earned.completed['combat:blackout-run']).toBeTruthy();
  expect(earned.inventory['PHASE-GAUNTLET']).toBeFalsy();
  expect(earned.completed['combat:breach-foundry']).toBeFalsy();
  expect(earned.flags.combatBest).toEqual(before.flags.combatBest);
  const files = unzip(await download(page));
  expect(Object.keys(files).sort()).toEqual(['blackout-run-badge.svg', 'blackout-run-mission-report.json', 'relay-runner-receipt.json']);
  expect(JSON.parse(files['relay-runner-receipt.json'])).toMatchObject({
    format: 'cyberworld-blackout-reward-v1', mission: 'combat:blackout-run', callsign: 'GUEST RUNNER',
    item: 'RELAY-RUNNER', xp: 180, credits: 90, reward_frequency: 'first-completion-only', official_certification: false
  });
  expect(JSON.parse(files['blackout-run-mission-report.json'])).toMatchObject({
    mission: 'combat:blackout-run', synthetic: true, local_achievement: true, stages,
    relay_restored: true, targets_defeated: 6
  });
  expect(files['blackout-run-badge.svg'].toString()).toContain('NO AGENCY AFFILIATION');
  await screenshot(page, 'blackout-action-reward.png');
  await download(page);
  expect(await operative(page)).toEqual(earned);
  await page.locator('#cwcombat-retry').click();
  await expect(page.locator('#cwcombat-prep-title')).toHaveText('BLACKOUT RUN');
  await startBrief(page);
  const replay = await finishRun(page);
  expect(replay.combat.kills).toBe(6);
  await expect(page.locator('#cwcombat-result')).toContainText('no duplicate XP, credits or gear');
  expect(await operative(page)).toEqual(earned);
  await page.locator('#cwcombat-return').click();
  await expect(page.locator('#cwcombat-hud')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => window.__cwCombatUI && window.__cwWorld && window.__cwAscensionShell);
  expect((await operative(page)).inventory['RELAY-RUNNER']).toBe(1);
  expect((await operative(page)).callsign).toBe('GUEST RUNNER');
  expect(errors).toEqual([]);
});

test.describe('phone action mission', () => {
  test.use({ hasTouch: true });
  test('phone also enters in two taps with readable goals and usable on-screen combat controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await load(page);
    await openBrief(page, true);
    await expect(page.locator('#cwcombat-prep-copy')).toContainText('no technical knowledge needed');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await screenshot(page, 'blackout-action-phone-brief.png');
    await startBrief(page, true);
    await expect(page.locator('#cwcombat-objective')).toBeVisible();
    await expect(page.locator('#cwcombat-reticle')).toBeVisible();
    await expect(page.locator('#cwcombat-objective-title')).toHaveText(stages[0]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    for (const selector of ['#cwcombat-objective', '#cwcombat-health', '#cwcombat-strike', '#cwcombat-burst', '#cwcombat-dodge', '#cwcombat-overclock', '#cwcombat-exit']) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box.x, selector).toBeGreaterThanOrEqual(0);
      expect(box.y, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(391);
      expect(box.y + box.height, selector).toBeLessThanOrEqual(845);
      if (selector !== '#cwcombat-objective' && selector !== '#cwcombat-health') {
        expect(box.width, selector).toBeGreaterThanOrEqual(44);
        expect(box.height, selector).toBeGreaterThanOrEqual(44);
      }
    }
    const move = await page.locator('[data-move="1,0"]').boundingBox();
    expect(move.width).toBeGreaterThanOrEqual(44); expect(move.height).toBeGreaterThanOrEqual(44);
    const before = (await snapshot(page)).world;
    await page.mouse.move(move.x + move.width / 2, move.y + move.height / 2);
    await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up();
    const after = (await snapshot(page)).world;
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(.3);
    await page.locator('#cwcombat-burst').tap();
    expect((await snapshot(page)).combat.cooldowns.burst).toBeGreaterThan(0);
    await screenshot(page, 'blackout-action-phone-hud.png');
    expect(await page.evaluate(() => window.__cwCombatUI.blackoutFiles())).toBeNull();
    await page.locator('#cwcombat-exit').tap();
    await expect(page.locator('#cwcombat-hud')).toBeHidden();
    expect((await operative(page)).completed['combat:blackout-run']).toBeFalsy();
    expect((await operative(page)).inventory['RELAY-RUNNER']).toBeFalsy();
  });
});
