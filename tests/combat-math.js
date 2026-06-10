// Pure combat math extracted from CyberWorld/gameplay.js.
// These are the same formulas the runtime uses — kept in sync by hand.
// Exported here so they can be unit-tested in Node without a DOM.

'use strict';

// Damage formula: base attack scaled by player level, reduced by enemy defense, with weakness bonus.
function computeExploitDamage(player, daemon, opts) {
	var atk = (player.atk != null ? player.atk : 8) + Math.floor(player.level * 1.5);
	var def = daemon.def || 0;
	var weaknessBonus = 0;
	if (opts && opts.exploitedWeakness && daemon.skillDomain && player.skills) {
		var domainSkill = player.skills[daemon.skillDomain] || 0;
		weaknessBonus = Math.floor(domainSkill * 0.15);
	}
	var dmg = Math.max(1, atk - def + weaknessBonus);
	return { damage: dmg, weaknessBonus: weaknessBonus };
}

// Noise/detection — each verb has different stealth profile.
// RECON: +5, EXPLOIT: 15-25, PATCH: +8, RUN: 0.
function noiseForVerb(verb, rng) {
	rng = rng || function () { return 0.5; };
	if (verb === 'recon') return 5;
	if (verb === 'patch') return 8;
	if (verb === 'run') return 0;
	if (verb === 'exploit') return 15 + Math.floor(rng() * 11);
	return 0;
}

// SOC SENTINEL strike — triggers at noise >= 100, deals tier-scaled damage.
function socStrike(playerLevel, shield) {
	var dmg = 8 + Math.floor(playerLevel * 1.2);
	var absorbed = Math.min(shield || 0, Math.floor(dmg / 2));
	return { damage: dmg, absorbed: absorbed, hpLoss: dmg - absorbed };
}

// XP-to-level curve: tier N requires 100 * N * N XP cumulatively.
function levelForXp(xp) {
	var lvl = 1;
	while (lvl < 10 && xp >= 100 * (lvl + 1) * (lvl + 1)) lvl++;
	return lvl;
}

// Faction reputation clamp: rep stays in [-100, 100].
function clampRep(current, delta) {
	return Math.max(-100, Math.min(100, (current || 0) + delta));
}

// Daemon HP scaling with tier — tier I baseline, tier IV is 4x.
function daemonHpForTier(baseHp, tier) {
	return Math.floor(baseHp * (1 + (tier - 1) * 0.4));
}

module.exports = {
	computeExploitDamage: computeExploitDamage,
	noiseForVerb: noiseForVerb,
	socStrike: socStrike,
	levelForXp: levelForXp,
	clampRep: clampRep,
	daemonHpForTier: daemonHpForTier
};
