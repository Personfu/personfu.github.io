const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { crc32 } = require('node:zlib');
const evidenceDir = process.env.CW_ROOKIE_EVIDENCE_DIR
  ? path.resolve(process.env.CW_ROOKIE_EVIDENCE_DIR)
  : path.resolve(__dirname, '../../docs/evidence');
const gamePath = process.env.CW_ROOKIE_GAME_PATH || '/CyberWorld/ascension.html';

// The long walking run uses explicit screenshots instead of a renderer-frame
// trace. The short phone test below records its own context trace.
test.use({ serviceWorkers: 'block', reducedMotion: 'no-preference', trace: 'off' });

async function initialize(page, name) {
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwWorld && window.__cwGameplay && window.__cwRookie && window.__cwAscensionShell);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(name);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('#cwr-card')).toBeVisible();
  await expect(page.locator('#cwr-card')).toContainText('Walk into the glowing ring');
}
async function state(page) { return page.evaluate(() => window.__cwRookie.state()); }
async function operative(page) { return page.evaluate(() => window.__cwGameplay.state()); }
async function closeQuickPlay(page) {
  await page.getByRole('button', { name: 'Close quick play', exact: true }).click();
  await expect(page.locator('#cwr-modal')).toBeHidden();
}
async function hub(page) {
  if (await page.locator('#cwr-modal').isVisible()) {
    const another = page.locator('#cwr-modal [data-rookie=hub]');
    if (await another.count()) { await another.click(); return; }
    await closeQuickPlay(page);
  }
  await page.locator('#cwr-launch').click();
  await expect(page.locator('#cwr-dialog-title')).toContainText('A small adventure');
}
async function startJob(page, job) {
  await hub(page);
  await page.locator(`#cwr-modal [data-rookie=start][data-job=${job}]`).click();
  await expect(page.locator('#cwr-modal')).toBeHidden();
  await expect.poll(async () => (await state(page)).active).toBe(job);
}

// The same public movement input used by the directional pad goes through the
// real collision/movement loop. Read-only snapshots supply destinations and
// camera orientation. This never assigns positions, quest flags, HP or rewards.
async function walk(page, target, { collect = false, tolerance = 0.45 } = {}) {
  await page.keyboard.down('Shift');
  try {
    await page.evaluate(async ({ target, collect, tolerance }) => {
      const started = performance.now();
      await new Promise((resolve, reject) => {
        function stop(error) {
          window.__cwWorld.setMovement(0, 0);
          if (error) reject(error); else resolve();
        }
        function frame() {
          const snap = window.__cwWorld.snapshot(), p = snap.world;
          const item = snap.rookie?.targets?.find(value => value.id === target.id);
          // A final pickup opens its celebration immediately. Stop on the
          // actual pickup transition rather than trying to walk through a modal.
          if (collect && (!item || item.state === 'done')) { stop(); return; }
          const dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
          if (distance <= tolerance) { stop(); return; }
          if (performance.now() - started > 15000) {
            stop(new Error(`Physical beginner route blocked at ${p.x.toFixed(2)},${p.z.toFixed(2)} toward ${target.id} (${target.x},${target.z})`)); return;
          }
          const angle = Number.isFinite(snap.cameraOrbit) ? snap.cameraOrbit : 0.25;
          window.__cwWorld.setMovement((dx * Math.cos(angle) - dz * Math.sin(angle)) / distance,
            (dx * Math.sin(angle) + dz * Math.cos(angle)) / distance);
          requestAnimationFrame(frame);
        }
        frame();
      });
    }, { target, collect, tolerance });
  } finally { await page.keyboard.up('Shift'); }
}
async function walkTarget(page, id, options) {
  await expect.poll(() => page.evaluate(id => !!window.__cwWorld.snapshot().rookie?.targets?.find(target => target.id === id), id)).toBe(true);
  const target = await page.evaluate(id => window.__cwWorld.snapshot().rookie.targets.find(target => target.id === id), id);
  await walk(page, target, options);
}
async function collectNext(page, expectedJob) {
  const target = await page.evaluate(() => window.__cwWorld.snapshot().rookie.targets.find(item => item.state === 'next'));
  expect(target).toBeTruthy();
  await walk(page, target, { collect: true });
  await expect.poll(() => page.evaluate(({ id, job }) => {
    const snap = window.__cwWorld.snapshot().rookie;
    const current = snap.targets.find(item => item.id === id);
    return snap.job !== job || !current || current.state === 'done';
  }, { id: target.id, job: expectedJob })).toBe(true);
  return target;
}
async function useBeacon(page) {
  await walkTarget(page, 'rookie-beacon', { tolerance: 2.3 });
  await expect(page.locator('#cwr-card [data-rookie=beacon]')).toBeVisible();
  await page.locator('#cwr-card [data-rookie=beacon]').click();
  await expect(page.locator('#cwr-modal .cwr-color-clue strong')).toBeVisible();
}
async function finishFirstLight(page, makeMistake = false) {
  await collectNext(page, 'intro');
  await expect.poll(async () => (await state(page)).intro).toBe(1);
  await expect(page.locator('#cwr-card')).toContainText('golden sparks');
  for (let i = 0; i < 3; i++) await collectNext(page, 'intro');
  await expect.poll(async () => (await state(page)).intro).toBe(2);
  await useBeacon(page);
  await expect(page.locator('#cwr-modal .cwr-color-clue strong')).toHaveText('BLUE');
  if (makeMistake) {
    const before = await operative(page), collected = (await state(page)).sparks;
    await page.locator('#cwr-modal [data-rookie=color][data-color=amber]').click();
    await expect(page.locator('#cwr-match-feedback')).toContainText('No problem');
    await expect(page.locator('#cwr-match-feedback')).toContainText('BLUE');
    expect((await state(page)).sparks).toEqual(collected); expect((await state(page)).intro).toBe(2);
    const after = await operative(page);
    expect({ xp: after.xp, credits: after.credits, inventory: after.inventory }).toEqual({ xp: before.xp, credits: before.credits, inventory: before.inventory });
  }
  await page.locator('#cwr-modal [data-rookie=color][data-color=blue]').click();
  await expect(page.locator('#cwr-dialog-title')).toContainText('You brought the light back');
  await expect.poll(async () => (await state(page)).done.includes('intro')).toBe(true);
}
async function download(page, selector) {
  const waiting = page.waitForEvent('download');
  await page.locator(selector).click();
  const result = await waiting;
  return { name: result.suggestedFilename(), bytes: fs.readFileSync(await result.path()) };
}
function unzip(buffer) {
  const entries = {}; let at = 0;
  while (at + 30 <= buffer.length && buffer.readUInt32LE(at) === 0x04034b50) {
    expect(buffer.readUInt16LE(at + 8)).toBe(0);
    const size = buffer.readUInt32LE(at + 18), nameLength = buffer.readUInt16LE(at + 26), extra = buffer.readUInt16LE(at + 28);
    const name = buffer.subarray(at + 30, at + 30 + nameLength).toString('utf8');
    const start = at + 30 + nameLength + extra, data = buffer.subarray(start, start + size);
    expect(data.length).toBe(size); expect(crc32(data)).toBe(buffer.readUInt32LE(at + 14));
    entries[name] = data; at = start + size;
  }
  expect(buffer.readUInt32LE(at)).toBe(0x02014b50); expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
  expect(buffer.readUInt16LE(buffer.length - 12)).toBe(Object.keys(entries).length);
  return entries;
}

test.describe('first-time city adventures through physical movement', () => {
  // Long real-time walking is easier to inspect in explicit screenshots; tracing
  // every renderer frame makes the trace disproportionately large.
  test('a new player follows First Light, earns four city jobs, downloads rewards and keeps progress', async ({ page }) => {
    test.setTimeout(180000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    fs.mkdirSync(evidenceDir, { recursive: true });
    await initialize(page, 'FIRST-LIGHT-QA');
    const before = await operative(page);
    expect(before.level).toBe(1); expect(before.xp).toBe(0);
    await expect(page.locator('#cwr-card')).toContainText('NO TIMER');
    await expect(page.locator('#cwas-modal')).toBeHidden();
    await page.screenshot({ path: path.join(evidenceDir, 'rookie-first-step.png') });

    // No tutorial dismissal, case answers, direct state grants or teleporting.
    await finishFirstLight(page, true);
    const firstWin = await operative(page);
    expect(firstWin.xp).toBe(60); expect(firstWin.credits).toBe(before.credits + 40);
    expect(firstWin.inventory['SPARK-COMPANION']).toBe(1); expect(firstWin.completed['rookie:intro']).toBeTruthy();
    expect(firstWin.flags.rookie.records.intro).toEqual({ wins: 1, best: 95 });
    const reward = await download(page, '#cwr-modal [data-rookie=reward]');
    expect(reward.name).toBe('cyberworld-first-light-reward.zip');
    const rewardFiles = unzip(reward.bytes);
    expect(Object.keys(rewardFiles)).toEqual(expect.arrayContaining(['first-light-badge.svg', 'spark-companion.json', 'you-did-it.txt']));
    expect(rewardFiles['first-light-badge.svg'].toString()).toContain('FIRST LIGHT');
    expect(JSON.parse(rewardFiles['spark-companion.json'].toString())).toMatchObject({ callsign: 'FIRST-LIGHT-QA', item: 'SPARK-COMPANION', official_certification: false });
    await closeQuickPlay(page);
    await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().rookie.view?.companion)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().rookie.view?.restoredBeacon)).toBe(true);
    await page.screenshot({ path: path.join(evidenceDir, 'rookie-first-light-companion.png') });

    await hub(page);
    const guide = unzip((await download(page, '#cwr-modal [data-rookie=guide]')).bytes);
    expect(guide['start-here.txt'].toString()).toContain('No prior knowledge needed');
    expect(guide['my-adventures.csv'].toString()).toContain('Drone Delivery');
    await page.locator('#cwr-modal [data-rookie=start][data-job=sweep]').click();
    await expect(page.locator('#cwr-modal')).toBeHidden();
    // Taking a route can naturally collect a later spark on the way. Continue
    // until the actual five unique pickups finish rather than forcing an order.
    for (let visits = 0; visits < 5 && (await state(page)).active === 'sweep'; visits++) await collectNext(page, 'sweep');
    await expect(page.locator('#cwr-dialog-title')).toContainText('Spark Sweep complete');
    expect([...(await state(page)).collected].sort()).toEqual([0, 1, 2, 3, 4]);
    expect((await state(page)).records.sweep).toEqual({ wins: 1, best: 100 });
    expect((await operative(page)).inventory['SPARK-TRAIL']).toBe(1);

    await startJob(page, 'courier');
    await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().rookie.view?.courier)).toBe(true);
    const droneBefore = await page.evaluate(() => window.__cwWorld.snapshot().rookie.view.courierPosition);
    expect(droneBefore && Number.isFinite(droneBefore.x) && Number.isFinite(droneBefore.z)).toBe(true);
    const delivered = [];
    for (let i = 0; i < 3; i++) {
      const target = await collectNext(page, 'courier'); delivered.push(target.id);
      if (i < 2) {
        expect((await state(page)).step).toBe(i + 1);
        const view = await page.evaluate(() => window.__cwWorld.snapshot().rookie.view);
        expect(view.courier).toBe(true);
        expect(Math.hypot(view.courierPosition.x - droneBefore.x, view.courierPosition.z - droneBefore.z)).toBeGreaterThan(0.3);
        await page.screenshot({ path: path.join(evidenceDir, `rookie-drone-stop-${i + 1}.png`) });
      }
    }
    expect(delivered).toEqual(['courier-0', 'courier-1', 'courier-2']);
    await expect(page.locator('#cwr-dialog-title')).toContainText('Drone Delivery complete');
    expect((await operative(page)).inventory['COURIER-PIN']).toBe(1);

    await startJob(page, 'match');
    await useBeacon(page);
    for (let round = 0; round < 5; round++) {
      const word = (await page.locator('#cwr-modal .cwr-color-clue strong').innerText()).trim().toLowerCase();
      expect(['blue', 'amber', 'violet']).toContain(word);
      await page.locator(`#cwr-modal [data-rookie=color][data-color=${word}]`).click();
      if (round < 4) await expect(page.locator('#cwr-dialog-title')).toContainText(`Signal Match · ${round + 2} / 5`);
    }
    await expect(page.locator('#cwr-dialog-title')).toContainText('Signal Match complete');
    let completed = await operative(page);
    expect(completed.credits).toBe(before.credits + 130);
    expect(completed.inventory['NEON-SWITCH']).toBe(1);
    expect(completed.flags.rookie.done).toEqual(['intro', 'sweep', 'courier', 'match']);

    // A real physical replay improves the record without issuing gear twice.
    await startJob(page, 'intro'); await finishFirstLight(page);
    const repeated = await operative(page);
    expect({ level: repeated.level, xp: repeated.xp, credits: repeated.credits, inventory: repeated.inventory, completed: repeated.completed })
      .toEqual({ level: completed.level, xp: completed.xp, credits: completed.credits, inventory: completed.inventory, completed: completed.completed });
    expect(repeated.flags.rookie.records.intro).toEqual({ wins: 2, best: 100 });
    expect(repeated.flags.rookie.done).toHaveLength(4);
    await closeQuickPlay(page);
    await page.locator('#cwas-settings').click();
    const exported = JSON.parse((await download(page, '#cwas-save-export')).bytes.toString());
    expect(exported.operative.flags.rookie).toEqual(repeated.flags.rookie);
    expect(await page.evaluate(value => window.CW_ROOKIE.valid(value), exported.operative.flags.rookie)).toBe(true);
    for (const privateKey of ['accessToken', 'account', 'password']) expect(Object.keys(exported.operative)).not.toContain(privateKey);
    completed = repeated;
    await page.reload();
    await page.waitForFunction(() => window.__cwRookie && window.__cwAscensionShell);
    await page.locator('#cwas-continue').click();
    expect((await operative(page)).flags.rookie).toEqual(completed.flags.rookie);
    await expect.poll(() => page.evaluate(() => window.__cwWorld.snapshot().rookie.view?.companion)).toBe(true);
    expect((await operative(page)).inventory['SPARK-COMPANION']).toBe(1);
    await expect(page.locator('#cwr-card')).toBeHidden();
    await page.screenshot({ path: path.join(evidenceDir, 'rookie-city-reloaded.png') });
    expect(errors).toEqual([]);
  });
});

test('phone tutorial, real touch movement and Quick Play choices stay readable and inside the viewport', async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    serviceWorkers: 'block', reducedMotion: 'no-preference', baseURL: test.info().project.use.baseURL || 'http://127.0.0.1:4173' });
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await initialize(page, 'FIRST-LIGHT-PHONE');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    const card = await page.locator('#cwr-card').boundingBox();
    expect(card.x).toBeGreaterThanOrEqual(0); expect(card.x + card.width).toBeLessThanOrEqual(390);
    await expect(page.locator('#cwr-card')).toContainText('WASD, arrow keys or the on-screen arrows');
    const move = page.locator('[data-move="1,0"]'); await expect(move).toBeVisible();
    const box = await move.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(40);
    const before = await page.evaluate(() => window.__cwWorld.snapshot().world);
    const touch = await context.newCDPSession(page);
    try {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      await page.waitForTimeout(380);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await touch.detach(); }
    const after = await page.evaluate(() => window.__cwWorld.snapshot().world);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.3);
    await page.locator('#cwr-launch').click();
    await expect(page.locator('#cwr-dialog-title')).toContainText('A small adventure');
    await expect(page.locator('#cwr-modal')).toContainText('No cybersecurity experience needed');
    const dialog = await page.locator('#cwr-modal .cwr-dialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0); expect(dialog.x + dialog.width).toBeLessThanOrEqual(390);
    for (const job of ['intro', 'sweep', 'courier', 'match', 'practice']) {
      const button = page.locator(`#cwr-modal [data-rookie=start][data-job=${job}]`);
      await button.scrollIntoViewIfNeeded(); await expect(button).toBeVisible();
      const bounds = await button.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390); expect(bounds.height).toBeGreaterThanOrEqual(40);
    }
    const guide = await download(page, '#cwr-modal [data-rookie=guide]');
    expect(unzip(guide.bytes)['start-here.txt'].toString()).toContain('No countdown or credit loss');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'rookie-phone-quick-play-options.png') });
    await page.locator('#cwr-dialog-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(evidenceDir, 'rookie-phone-quick-play.png') });
    expect(errors).toEqual([]);
  } finally {
    const tracePath = test.info().outputPath('rookie-phone-trace.zip');
    await context.tracing.stop({ path: tracePath });
    await test.info().attach('Phone interaction trace', { path: tracePath, contentType: 'application/zip' });
    await context.close();
  }
});
