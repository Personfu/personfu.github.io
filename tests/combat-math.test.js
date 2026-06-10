// Unit tests for CyberWorld combat math.
// Run with:  node tests/combat-math.test.js
// Zero dependencies — uses Node's built-in assert.

'use strict';

const assert = require('assert');
const cm = require('./combat-math');

let passed = 0;
let failed = 0;
function test(name, fn) {
	try {
		fn();
		console.log('  ✓ ' + name);
		passed++;
	} catch (e) {
		console.log('  ✗ ' + name);
		console.log('      ' + (e && e.message ? e.message : e));
		failed++;
	}
}

console.log('combat-math: computeExploitDamage');
test('base damage with no weakness, no defense', () => {
	const r = cm.computeExploitDamage({ atk: 10, level: 1, skills: {} }, { def: 0, skillDomain: 'web' });
	assert.strictEqual(r.damage, 10 + 1);
	assert.strictEqual(r.weaknessBonus, 0);
});
test('damage reduced by enemy defense', () => {
	const r = cm.computeExploitDamage({ atk: 10, level: 2, skills: {} }, { def: 4, skillDomain: 'web' });
	assert.strictEqual(r.damage, 10 + 3 - 4);
});
test('weakness bonus applied when exploitedWeakness flag set', () => {
	const r = cm.computeExploitDamage(
		{ atk: 10, level: 1, skills: { network: 40 } },
		{ def: 0, skillDomain: 'network' },
		{ exploitedWeakness: true }
	);
	assert.strictEqual(r.weaknessBonus, Math.floor(40 * 0.15));
	assert.strictEqual(r.damage, 10 + 1 + 6);
});
test('damage never drops below 1', () => {
	const r = cm.computeExploitDamage({ atk: 2, level: 1, skills: {} }, { def: 50 });
	assert.strictEqual(r.damage, 1);
});

console.log('\ncombat-math: noiseForVerb');
test('recon noise = 5', () => assert.strictEqual(cm.noiseForVerb('recon'), 5));
test('patch noise = 8', () => assert.strictEqual(cm.noiseForVerb('patch'), 8));
test('run noise = 0', () => assert.strictEqual(cm.noiseForVerb('run'), 0));
test('exploit noise within [15, 25]', () => {
	const n0 = cm.noiseForVerb('exploit', () => 0);
	const n1 = cm.noiseForVerb('exploit', () => 0.9999);
	assert.strictEqual(n0, 15);
	assert.ok(n1 >= 15 && n1 <= 25, 'expected 15..25, got ' + n1);
});

console.log('\ncombat-math: socStrike');
test('soc strike scales with level', () => {
	const a = cm.socStrike(1, 0);
	const b = cm.socStrike(10, 0);
	assert.ok(b.damage > a.damage);
});
test('shield absorbs up to half of strike damage', () => {
	const r = cm.socStrike(5, 100);
	assert.strictEqual(r.absorbed, Math.floor(r.damage / 2));
	assert.strictEqual(r.hpLoss, r.damage - r.absorbed);
});

console.log('\ncombat-math: levelForXp');
test('xp 0 -> level 1', () => assert.strictEqual(cm.levelForXp(0), 1));
test('xp 400 -> level 2 (threshold)', () => assert.strictEqual(cm.levelForXp(400), 2));
test('xp 900 -> level 3', () => assert.strictEqual(cm.levelForXp(900), 3));
test('level caps at 10', () => assert.strictEqual(cm.levelForXp(9999999), 10));

console.log('\ncombat-math: clampRep');
test('rep clamps at +100', () => assert.strictEqual(cm.clampRep(95, 20), 100));
test('rep clamps at -100', () => assert.strictEqual(cm.clampRep(-95, -20), -100));
test('rep neutral addition', () => assert.strictEqual(cm.clampRep(10, 5), 15));

console.log('\ncombat-math: daemonHpForTier');
test('tier 1 baseline', () => assert.strictEqual(cm.daemonHpForTier(40, 1), 40));
test('tier 2 = +40%', () => assert.strictEqual(cm.daemonHpForTier(40, 2), Math.floor(40 * 1.4)));
test('tier 4 = +120%', () => assert.strictEqual(cm.daemonHpForTier(40, 4), Math.floor(40 * 2.2)));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
