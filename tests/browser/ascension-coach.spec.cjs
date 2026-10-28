const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../../CyberWorld/ascension-data.js');

const gamePath = process.env.CW_COACH_GAME_PATH || '/CyberWorld/ascension.html';
const evidenceDir = process.env.CW_COACH_EVIDENCE_DIR || path.resolve(__dirname, '../../docs/evidence');
test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', trace: 'off' });

async function readCampaign(page) { return page.evaluate(() => window.__cwAscension.state()); }
async function dismissStarter(page) {
  const dismiss = page.locator('#cwr-dismiss');
  if (await dismiss.isVisible()) await dismiss.click();
}
async function initialize(page, name) {
  await page.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
  await page.goto(gamePath);
  await page.waitForFunction(() => window.__cwAscension && window.__cwAscensionShell && window.__cwWorld);
  await page.locator('#cwas-begin').click();
  await page.locator('#cwas-handle').fill(name);
  await page.locator('#cwas-creator-form button[type=submit]').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await page.waitForTimeout(200);
  await dismissStarter(page);
}
async function operations(page) {
  if (await page.locator('#cwas-modal').isVisible()) await page.locator('#cwas-modal [data-action=tab][data-value=missions]').click();
  else await page.locator('[data-deck=missions]').click();
}
async function openCase(page, id) {
  await operations(page);
  await page.locator('[data-action=mission][data-value="' + id + '"]').click();
  await page.locator('[data-action=investigate]').click();
  await expect(page.locator('.cwas-coach')).toBeVisible();
}
async function useClue(page, index) {
  await page.locator('[data-action=coach-use][data-value="' + index + '"]').click();
  await expect(page.locator('#cwas-coach-message')).toContainText(/Clue copied|tool ran/);
}
async function nextClue(page, index) {
  await page.locator('[data-action=coach-next][data-value="' + index + '"]').click();
}
async function guidedFinding(page, id) {
  const guide = data.coachGuides[id];
  for (let index = 0; index < guide.steps.length; index++) {
    await expect(page.locator('.cwas-coach-step h4')).toHaveText(guide.steps[index].title);
    await useClue(page, index);
    const state = await readCampaign(page);
    expect(state.completed[id]).not.toBe(true);
    expect(state.records[id].stage).toBe('puzzle');
    for (const [name, value] of Object.entries(guide.steps[index].fields)) await expect(page.locator('[data-puzzle] [name="' + name + '"]')).toHaveValue(value);
    if (index < guide.steps.length - 1) await nextClue(page, index + 1);
  }
}
async function verify(page) { await page.locator('[data-puzzle] button[type=submit]').click(); }
async function recover(page) {
  await expect(page.locator('#cwas-recovery-coach')).toContainText('NEXT ACTION 1 OF 5');
  for (const action of ['snapshot', 'isolate', 'rotate', 'restore', 'verify']) await page.locator('[data-action=respond][data-value=' + action + ']').click();
  await expect(page.locator('#cwas-recovery-coach')).toContainText('All five recovery steps are complete');
  await page.locator('[data-action=debrief]').click();
}
async function fileCase(page) { await page.locator('[data-action=complete]').click(); }
async function solveCase(page, id) {
  await openCase(page, id);
  await guidedFinding(page, id);
  await verify(page);
  if (data.missions.find(m => m.id === id).containment) await recover(page);
  await fileCase(page);
}

test('a new explorer learns the first case one clue at a time, keeps control of submission and can switch coaching off', async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await initialize(page, 'FIRST-CLUE');
  expect((await readCampaign(page)).coach).toBe(true);
  const before = await page.evaluate(() => window.__cwGameplay.state());
  await openCase(page, 'route-zero');
  await expect(page.locator('.cwas-coach')).toContainText('Find the computer that changed a delivery route without permission.');
  await page.locator('.cwas-coach-terms summary').click();
  await expect(page.locator('.cwas-coach-terms')).toContainText('A small piece of a message');
  await verify(page);
  await expect(page.locator('#cwas-status')).toContainText('02, 12 and 22 seconds');
  expect((await readCampaign(page)).count).toBe(0);
  expect((await page.evaluate(() => window.__cwGameplay.state())).credits).toBe(before.credits);

  await guidedFinding(page, 'route-zero');
  expect((await readCampaign(page)).records['route-zero'].stage).toBe('puzzle');
  expect((await readCampaign(page)).count).toBe(0);
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'coach-first-case.png') });
  await page.locator('[data-action=coach-review]').click();
  await expect(page.locator('[data-puzzle] [name=source]')).toBeFocused();
  await expect(page.locator('[data-puzzle] [name=source]')).toBeInViewport();
  expect((await readCampaign(page)).records['route-zero'].stage).toBe('puzzle');
  expect((await readCampaign(page)).count).toBe(0);
  await page.screenshot({ path: path.join(evidenceDir, 'coach-review-finding.png') });
  await verify(page);
  expect((await readCampaign(page)).count).toBe(0);
  await recover(page);
  expect((await readCampaign(page)).count).toBe(0);
  await fileCase(page);
  expect((await readCampaign(page)).count).toBe(1);
  const earned = await page.evaluate(() => window.__cwGameplay.state());
  expect(earned.inventory['TRAFFIC-LENS']).toBe(1);
  expect(earned.credits).toBe(before.credits + 90);

  await operations(page);
  await page.locator('[data-action=coach-mode][data-value=expert]').click();
  expect((await readCampaign(page)).coach).toBe(false);
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => window.__cwAscensionShell && window.__cwAscension);
  await page.locator('#cwas-continue').click();
  await dismissStarter(page);
  expect((await readCampaign(page)).coach).toBe(false);
  expect((await readCampaign(page)).count).toBe(1);
  await operations(page);
  await page.locator('[data-action=coach-mode][data-value=coach]').click();
  expect((await readCampaign(page)).coach).toBe(true);
  expect((await page.evaluate(() => window.__cwGameplay.state())).inventory['TRAFFIC-LENS']).toBe(1);
  expect((await page.evaluate(() => window.__cwGameplay.state())).credits).toBe(earned.credits);
  expect(errors).toEqual([]);
});

test('worked guides still require actual bounds tests and SHA-256 comparison before a player can file later cases', async ({ page }) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await initialize(page, 'LEARN-BY-DOING');
  for (const id of ['route-zero', 'trusted-package', 'ghost-route', 'repeated-machine']) await solveCase(page, id);
  expect((await readCampaign(page)).count).toBe(4);

  await openCase(page, 'bounds-of-trust');
  await useClue(page, 0);
  expect((await readCampaign(page)).records['bounds-of-trust'].testsPassed).toBe(false);
  await verify(page);
  await expect(page.locator('#cwas-status')).toContainText('actually checks all five');
  expect((await readCampaign(page)).count).toBe(4);
  await nextClue(page, 1);
  await useClue(page, 1);
  await expect(page.locator('#cwas-tool-result')).toContainText('index -1: REJECT / PASS');
  await expect(page.locator('#cwas-tool-result')).not.toContainText('FAIL');
  expect((await readCampaign(page)).records['bounds-of-trust'].testsPassed).toBe(true);
  expect((await readCampaign(page)).records['bounds-of-trust'].stage).toBe('puzzle');
  await verify(page); await fileCase(page);

  await openCase(page, 'assembly-line');
  await nextClue(page, 1); await useClue(page, 1);
  await nextClue(page, 2); await useClue(page, 2);
  expect((await readCampaign(page)).records['assembly-line'].hashesCompared).toBe(false);
  await verify(page);
  await expect(page.locator('#cwas-status')).toContainText('Press Compute SHA-256');
  expect((await readCampaign(page)).count).toBe(5);
  await nextClue(page, 1); await nextClue(page, 0);
  await useClue(page, 0);
  await expect(page.locator('#cwas-tool-result')).toContainText(data.missions[5].expectedDigest);
  await expect(page.locator('#cwas-tool-result')).toContainText('The digests differ');
  expect((await readCampaign(page)).records['assembly-line'].hashesCompared).toBe(true);
  expect((await readCampaign(page)).records['assembly-line'].stage).toBe('puzzle');
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'coach-real-tools.png') });
  await verify(page); await fileCase(page);
  expect((await readCampaign(page)).count).toBe(6);
  expect((await page.evaluate(() => window.__cwGameplay.state())).inventory['PROVENANCE-LENS']).toBe(1);
  expect(errors).toEqual([]);
});
