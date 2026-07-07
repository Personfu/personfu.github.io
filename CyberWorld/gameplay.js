/* CyberWorld gameplay overlay — adds real solo playable loops on top of the compiled bundle.
   - Persistent operative state (XP, level, credits, inventory, completed missions) in localStorage.
   - Mission console with daily directives + per-module missions.
   - Turn-based hack-combat encounters (EXPLOIT / PATCH / TRACE / RUN).
   - Hotkey M to toggle. Integrates with augment.js routing. */

(function () {
	'use strict';
	if (window.__cwGameplayLoaded) return;
	window.__cwGameplayLoaded = true;

	// ---------- Persistent state ----------
	var SAVE_KEY = 'cw.operative.v1';
	var DEFAULT_STATE = {
		callsign: 'OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000),
		level: 1, xp: 0, credits: 0,
		hp: 100, maxHp: 100,
		shield: 30, maxShield: 30,
		inventory: {},
		completed: {},
		flags: { run: { active: false, missionId: null }, tutorialDone: false, path: 'sentinel' },
		field: { clears: 0, bestRoute: 0 }
	};
	function loadState() {
		try {
			var raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return Object.assign({}, DEFAULT_STATE);
			var s = JSON.parse(raw);
			return Object.assign({}, DEFAULT_STATE, s, {
				inventory: Object.assign({}, DEFAULT_STATE.inventory, s.inventory || {}),
				completed: s.completed || {},
				field: Object.assign({}, DEFAULT_STATE.field, s.field || {}),
				flags: Object.assign({}, DEFAULT_STATE.flags, s.flags || {}, {
					run: Object.assign({}, DEFAULT_STATE.flags.run, (s.flags && s.flags.run) || {})
				})
			});
		} catch (e) { return Object.assign({}, DEFAULT_STATE); }
	}
	function saveState() {
		try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
	}
	var state = loadState();
	var FIELD_TARGET_PACKETS = 6;
	var FIELD_MAX_DAEMONS = 3;

	function xpForLevel(L) { return Math.floor(100 * Math.pow(1.35, L - 1)); }
	function gainXp(n) {
		state.xp += n;
		while (state.xp >= xpForLevel(state.level)) {
			state.xp -= xpForLevel(state.level);
			state.level++;
			state.maxHp += 10; state.hp = state.maxHp;
			state.maxShield += 5; state.shield = state.maxShield;
			toast('LEVEL UP — TIER ' + state.level);
		}
		saveState(); render();
	}
	function gainCredits(n) { state.credits += n; saveState(); render(); }
	function gainItem(id, qty) {
		state.inventory[id] = (state.inventory[id] || 0) + (qty || 1);
		saveState(); render();
	}
	function consumeItem(id) {
		if (!state.inventory[id] || state.inventory[id] <= 0) return false;
		state.inventory[id]--;
		if (state.inventory[id] <= 0) delete state.inventory[id];
		saveState(); render();
		return true;
	}

	// ---------- Mission catalog ----------
	var MISSIONS = [
		{ id: 'tut-ping',    sector: 'Mainframe Core',  title: 'PING the Gateway',
		  brief: 'Professor Cipher teaches your first defensive operation: identify the gateway, send a discovery ping, and confirm a clean blue-team uplink.',
		  reward: { xp: 35, credits: 60, item: 'STARTER-DECK' }, kind: 'instant' },
		{ id: 'tut-scan',    sector: 'Mainframe Core',  title: 'Scan Open Ports',
		  brief: 'Run a quick port sweep on three known service nodes.',
		  reward: { xp: 35, credits: 50, item: 'PORT-MAP' }, kind: 'instant' },
		{ id: 'mc-convoy',   sector: 'Mainframe Core',  title: 'Route the Data Convoy',
		  brief: 'Pilot the operative through the city grid, collect encrypted shards, and exfil before trace heat spikes.',
		  reward: { xp: 70, credits: 120, item: 'DATA-SHARD' }, kind: 'field', req: { level: 1 } },
		{ id: 'lan-sniff',   sector: 'LAN Valley',      title: 'Sniff Suspicious Beacons',
		  brief: 'Capture three beacon frames from the rogue access point.',
		  reward: { xp: 60, credits: 90, item: 'PCAP' }, kind: 'instant', req: { level: 2 } },
		{ id: 'lan-honey',   sector: 'LAN Valley',      title: 'Deploy Honeypot',
		  brief: 'Spin up a decoy SSH service and log the first intruder.',
		  reward: { xp: 75, credits: 120 }, kind: 'instant', req: { level: 2 } },
		{ id: 'dn-trace',    sector: 'Darknet Depths',  title: 'Trace the Phantom',
		  brief: 'Trace a hostile operative through four relay hops.',
		  reward: { xp: 110, credits: 160 }, kind: 'combat', enemy: 'PHANTOM-DRONE', req: { level: 3 } },
		{ id: 'dn-rootkit',  sector: 'Darknet Depths',  title: 'Exfil the Rootkit Sample',
		  brief: 'Breach the cartel locker and extract a rootkit signature.',
		  reward: { xp: 150, credits: 220, item: 'ROOTKIT-SIG' }, kind: 'combat', enemy: 'CARTEL-WARDEN', req: { level: 4 } },
		{ id: 'dn-convoy',   sector: 'Darknet Depths',  title: 'Black Relay Convoy',
		  brief: 'Run a hostile relay corridor while watcher daemons sweep the packet lanes.',
		  reward: { xp: 180, credits: 280, item: 'RELAY-TRACE' }, kind: 'field', req: { level: 5 } },
		{ id: 'dn-cave',     sector: 'Darknet Depths',  title: 'Map the Relay Cave',
		  brief: 'Descend into the Dark Relay Cave, tag watcher nests, and pull the route map without triggering a trace spike.',
		  reward: { xp: 210, credits: 320, item: 'CAVE-MAP' }, kind: 'field', req: { level: 5 } },
		{ id: 'dn-matriarch', sector: 'Darknet Depths', title: 'Relay Matriarch',
		  brief: 'Challenge the watcher boss that controls the cave beacon lattice.',
		  reward: { xp: 280, credits: 420, item: 'WATCHER-CORE' }, kind: 'combat', enemy: 'RELAY-MATRIARCH', req: { level: 6 } },
		{ id: 'sc-raid',     sector: 'Stormcore',       title: 'Stormcore Breach',
		  brief: 'Push through Stormcore ICE and tag the throne node.',
		  reward: { xp: 250, credits: 400, item: 'STORM-KEY' }, kind: 'combat', enemy: 'STORMCORE-ICE', req: { level: 6 } },
		{ id: 'sc-caves',    sector: 'Stormcore',       title: 'Firewall Caves',
		  brief: 'Navigate the storm-lit firewall caves, collect calibration shards, and open the raid backdoor.',
		  reward: { xp: 320, credits: 520, item: 'FIREWALL-CALIBRATOR' }, kind: 'field', req: { level: 7 } },
		{ id: 'sc-overseer', sector: 'Stormcore',       title: 'Overseer Blackout',
		  brief: 'Face the Stormcore Overseer in a defensive boss fight and break the blackout loop.',
		  reward: { xp: 480, credits: 800, item: 'OVERSEER-SEAL' }, kind: 'combat', enemy: 'STORM-OVERSEER', req: { level: 8 } }
	];

	var ENEMY_TEMPLATES = {
		'PHANTOM-DRONE': {
			baseHp: 60, atk: 8, def: 2,
			loot: { credits: 60 },
			tactic: 'harass',
			boss: false
		},
		'CARTEL-WARDEN': {
			baseHp: 110, atk: 12, def: 4,
			loot: { credits: 120, item: 'CIPHER-KEY' },
			tactic: 'pressure',
			boss: false
		},
		'STORMCORE-ICE': {
			baseHp: 220, atk: 18, def: 8,
			loot: { credits: 250, item: 'ICE-CORE' },
			tactic: 'fortify',
			boss: true
		},
		'RELAY-MATRIARCH': {
			baseHp: 180, atk: 16, def: 6,
			loot: { credits: 210, item: 'MATRIARCH-SIGNAL' },
			tactic: 'pressure',
			boss: true
		},
		'STORM-OVERSEER': {
			baseHp: 320, atk: 22, def: 10,
			loot: { credits: 420, item: 'BLACKOUT-KERNEL' },
			tactic: 'fortify',
			boss: true
		},
		'TRAINING-DAEMON': {
			baseHp: 30, atk: 4, def: 0,
			loot: { credits: 20 },
			tactic: 'probe',
			boss: false
		}
	};

	function scaleEnemy(template, level, isBoss) {
		var multiplier = 1 + Math.min(0.9, Math.max(0, (level - 1) * 0.08));
		var hp = Math.round(template.baseHp * multiplier * (isBoss ? 1.8 : 1));
		var atk = Math.round((template.atk + Math.floor(level * 1.5)) * (isBoss ? 1.2 : 1));
		var def = Math.round((template.def + Math.floor(level * 0.7)) * (isBoss ? 1.15 : 1));
		return {
			hp: hp,
			maxHp: hp,
			atk: atk,
			def: def,
			loot: Object.assign({}, template.loot),
			state: 'patrol',
			phase: 1,
			boss: !!template.boss || isBoss,
			tactic: template.tactic,
			name: template === null ? 'UNKNOWN' : ''
		};
	}

	function createCombatEnemy(templateId, level, isBoss) {
		var template = ENEMY_TEMPLATES[templateId] || ENEMY_TEMPLATES['TRAINING-DAEMON'];
		var enemy = scaleEnemy(template, level, isBoss);
		enemy.name = templateId;
		enemy.accuracy = isBoss ? 78 : 64;
		return enemy;
	}

	function isBossEncounter(mission) {
		if (mission && mission.id === 'sc-raid') return true;
		return state.level >= 8 && Math.random() < 0.22;
	}

	function chooseEnemyForMission(mission) {
		var templateId = mission && mission.enemy ? mission.enemy : 'TRAINING-DAEMON';
		return createCombatEnemy(templateId, state.level, isBossEncounter(mission));
	}

	function missionAvailable(m) {
		if (state.completed[m.id]) return false;
		if (m.req && m.req.level && state.level < m.req.level) return false;
		return true;
	}

	function getNextMission() {
		for (var i = 0; i < MISSIONS.length; i++) {
			if (missionAvailable(MISSIONS[i])) return MISSIONS[i];
		}
		return null;
	}

	function setActiveRun(mission) {
		state.flags.run = state.flags.run || { active: false, missionId: null };
		state.flags.run.active = true;
		state.flags.run.missionId = mission ? mission.id : null;
		saveState();
	}

	function clearActiveRun() {
		state.flags.run = state.flags.run || { active: false, missionId: null };
		state.flags.run.active = false;
		state.flags.run.missionId = null;
		saveState();
	}

	function completeMission(m) {
		state.completed[m.id] = Date.now();
		if (m.reward.xp) gainXp(m.reward.xp);
		if (m.reward.credits) gainCredits(m.reward.credits);
		if (m.reward.item) gainItem(m.reward.item, 1);
		toast('MISSION COMPLETE: ' + m.title);
		if (state.flags.run && state.flags.run.missionId === m.id) {
			clearActiveRun();
		}
	}

	function startMission(m) {
		if (!missionAvailable(m)) { toast('Mission locked'); return; }
		setActiveRun(m);
		if (root) root.dataset.tab = (m.kind === 'combat' ? 'combat' : 'run');
		if (m.kind === 'instant') {
			completeMission(m);
		} else if (m.kind === 'combat') {
			startCombat(m.enemy, function (won) {
				if (won) completeMission(m);
				else {
					toast('MISSION FAILED — recover and retry');
					clearActiveRun();
				}
				render();
			}, m);
		} else if (m.kind === 'field') {
			toggle(false);
			activateLiveOps(m);
		}
	}

	// ---------- Combat engine ----------
	var combat = null;
	function startCombat(enemyId, onEnd, mission) {
		var enemy;
		if (typeof enemyId === 'string' && ENEMY_TEMPLATES[enemyId]) {
			enemy = createCombatEnemy(enemyId, state.level, isBossEncounter(mission));
		} else if (enemyId && typeof enemyId === 'object') {
			enemy = enemyId;
		} else {
			enemy = chooseEnemyForMission(mission);
		}
		combat = {
			enemyId: enemy.name || enemyId,
			enemy: enemy,
			log: ['ENGAGED ' + (enemy.name || 'UNKNOWN')],
			turn: 'player',
			onEnd: onEnd,
			mission: mission
		};
		if (root) root.dataset.tab = 'combat';
		render();
	}
	function endCombat(won) {
		var c = combat; combat = null;
		if (won && c.enemy.loot) {
			if (c.enemy.loot.credits) gainCredits(c.enemy.loot.credits);
			if (c.enemy.loot.item) gainItem(c.enemy.loot.item, 1);
		}
		if (!won) {
			state.hp = Math.max(20, Math.floor(state.maxHp * 0.5));
			state.shield = Math.floor(state.maxShield * 0.5);
			saveState();
		}
		if (c.onEnd) c.onEnd(won);
		if (root) root.dataset.tab = 'run';
		render();
	}
	function playerAct(action) {
		if (!combat || combat.turn !== 'player') return;
		var c = combat;
		var dmg, msg;
		if (action === 'nmap') {
			c.log.push('> nmap --scan ' + c.enemyId);
			dmg = 10;
			c.enemy.hp -= dmg;
			c.enemy.accuracy = Math.max(35, c.enemy.accuracy - 10);
			c.enemy.def = Math.max(0, c.enemy.def - 1);
			msg = 'NMAP strips 10 HP, -10 ACC, -1 DEF';
		} else if (action === 'sqlninja') {
			c.log.push('> sqlninja --command breach ' + c.enemyId);
			var hackRoll = 55 + Math.floor(Math.random() * 35) + Math.max(0, 10 - c.enemy.def * 2);
			var hit = hackRoll >= c.enemy.accuracy;
			dmg = hit ? 16 + Math.floor(Math.random() * 9) : 4 + Math.floor(Math.random() * 5);
			c.enemy.hp -= dmg;
			c.enemy.def = Math.max(0, c.enemy.def - (hit ? 2 : 1));
			msg = hit ? 'SQLNinja command breach for ' + dmg : 'SQLNinja command glances for ' + dmg;
		} else if (action === 'boom') {
			c.log.push('> boom --payload detonate ' + c.enemyId);
			c.fx = 'boom';
			dmg = 20 + Math.floor(Math.random() * 8) - Math.max(0, c.enemy.def - 1);
			c.enemy.hp -= dmg;
			c.enemy.accuracy = Math.max(30, c.enemy.accuracy - 6);
			msg = 'BOOM detonates for ' + dmg;
			setTimeout(function () { if (combat) { combat.fx = ''; render(); } }, 280);
		} else if (action === 'patch') {
			if (!consumeItem('PATCH-KIT')) { c.log.push('No PATCH-KIT available'); render(); return; }
			var heal = 18 + Math.floor(Math.random() * 8);
			state.hp = Math.min(state.maxHp, state.hp + heal);
			state.shield = Math.min(state.maxShield, state.shield + 6);
			saveState();
			msg = 'PATCH-KIT restores ' + heal + ' HP';
		} else if (action === 'run') {
			c.log.push('Disengaged.');
			endCombat(false);
			return;
		}
		c.log.push(msg);
		if (c.enemy.hp <= 0) {
			c.log.push('TARGET NEUTRALIZED');
			render();
			setTimeout(function () { endCombat(true); }, 400);
			return;
		}
		c.turn = 'enemy';
		render();
		setTimeout(enemyAct, 600);
	}
	function enemyAct() {
		if (!combat) return;
		var c = combat;
		var pct = c.enemy.hp / c.enemy.maxHp;
		if (!c.enemy.boss && pct < 0.28 && c.enemy.state !== 'retreat') {
			c.enemy.state = 'retreat';
			c.enemy.atk = Math.max(1, c.enemy.atk - 2);
			c.log.push('ENEMY RETREATS TO RECOVER');
		}
		else if (state.shield < 12 && pct > 0.45) {
			c.enemy.state = 'chase';
			c.log.push('ENEMY CHARGES THROUGH DEFENSE');
		}
		else {
			c.enemy.state = 'patrol';
		}
		if (c.enemy.boss && pct < 0.5 && c.enemy.phase === 1) {
			c.enemy.phase = 2;
			c.enemy.atk += 4;
			c.enemy.def += 2;
			c.log.push('BOSS ENRAGED — PHASE 2');
		}
		var hitRoll = 35 + Math.floor(Math.random() * 70);
		if (hitRoll > c.enemy.accuracy) {
			c.log.push('Enemy attack misses the trace window');
			c.turn = 'player';
			render();
			return;
		}
		var raw = c.enemy.atk + Math.floor(Math.random() * 6) - (c.enemy.state === 'retreat' ? 4 : 2);
		if (c.enemy.state === 'chase') raw += 2;
		var absorbed = Math.min(state.shield, Math.max(0, Math.floor(raw * 0.6)));
		state.shield -= absorbed;
		var hpHit = Math.max(0, raw - absorbed);
		state.hp -= hpHit;
		saveState();
		c.log.push('Enemy hits for ' + raw + ' (' + absorbed + ' shield / ' + hpHit + ' hp)');
		if (c.enemy.state === 'retreat' && Math.random() < 0.4) {
			var regen = Math.min(6, c.enemy.maxHp - c.enemy.hp);
			c.enemy.hp += regen;
			if (regen) c.log.push('Enemy recovers ' + regen + ' HP while falling back');
		}
		if (state.hp <= 0) {
			state.hp = 0;
			c.log.push('OPERATIVE DOWNED');
			render();
			setTimeout(function () { endCombat(false); }, 500);
			return;
		}
		c.turn = 'player';
		render();
	}

	// ---------- Toast ----------
	function toast(msg) {
		var el = document.querySelector('.cw-augment-toast');
		if (!el) {
			el = document.createElement('div');
			el.className = 'cw-augment-toast';
			document.body.appendChild(el);
		}
		el.textContent = msg;
		el.classList.add('show');
		clearTimeout(el.__t);
		el.__t = setTimeout(function () { el.classList.remove('show'); }, 1800);
	}

	// ---------- UI ----------
	var root = null, open = false;
	function ensureRoot() {
		if (root) return root;
		root = document.createElement('div');
		root.className = 'cw-gp-root';
		root.innerHTML = ''
			+ '<div class="cw-gp-panel" role="dialog" aria-label="Operative Console">'
			+   '<header><span>OPERATIVE CONSOLE</span>'
			+     '<button class="cw-gp-close" type="button" aria-label="Close">×</button>'
			+   '</header>'
			+   '<div class="cw-gp-tabs">'
			+     '<button data-tab="run" class="active">Run</button>'
			+     '<button data-tab="field">Field</button>'
			+     '<button data-tab="combat">Combat</button>'
			+     '<button data-tab="inventory">Inventory</button>'
			+     '<button data-tab="profile">Profile</button>'
			+   '</div>'
			+   '<div class="cw-gp-body"></div>'
			+   '<footer class="cw-gp-foot"></footer>'
			+ '</div>';
		document.body.appendChild(root);

		root.querySelector('.cw-gp-close').addEventListener('click', toggle);
		root.querySelectorAll('.cw-gp-tabs button').forEach(function (b) {
			b.addEventListener('click', function () {
				root.querySelectorAll('.cw-gp-tabs button').forEach(function (x) { x.classList.remove('active'); });
				b.classList.add('active');
				root.dataset.tab = b.dataset.tab;
				render();
			});
		});
		root.dataset.tab = 'run';
		return root;
	}
	function toggle(force) {
		ensureRoot();
		open = (typeof force === 'boolean') ? force : !open;
		root.classList.toggle('open', open);
		if (open) render();
	}

	function escapeHtml(s) {
		return String(s).replace(/[&<>"']/g, function (c) {
			return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
		});
	}

	function renderMissions() {
		var rows = MISSIONS.map(function (m) {
			var done = !!state.completed[m.id];
			var locked = !missionAvailable(m) && !done;
			var rwd = [];
			if (m.reward.xp) rwd.push(m.reward.xp + ' XP');
			if (m.reward.credits) rwd.push(m.reward.credits + 'c');
			if (m.reward.item) rwd.push(m.reward.item);
			if (m.kind === 'field') rwd.push('FIELD RUN');
			return ''
				+ '<div class="cw-gp-mission ' + (done ? 'done' : locked ? 'locked' : '') + '">'
				+   '<div class="m-head">'
				+     '<strong>' + escapeHtml(m.title) + '</strong>'
				+     '<span class="m-tag">' + escapeHtml(m.sector) + '</span>'
				+   '</div>'
				+   '<p>' + escapeHtml(m.brief) + '</p>'
				+   '<div class="m-foot">'
				+     '<span class="m-reward">' + rwd.join(' · ') + (m.kind === 'combat' ? ' · COMBAT' : '') + '</span>'
				+     (done
				          ? '<span class="m-done">COMPLETE</span>'
				          : locked
				            ? '<span class="m-lock">REQ TIER ' + (m.req && m.req.level || '?') + '</span>'
				            : '<button class="m-start" data-mid="' + m.id + '">' + (m.kind === 'combat' ? 'ENGAGE' : (m.kind === 'field' ? 'FIELD' : 'EXECUTE')) + '</button>')
				+   '</div>'
				+ '</div>';
		}).join('');
		return rows || '<em>No missions available.</em>';
	}

	function renderRun() {
		var current = null;
		if (state.flags.run && state.flags.run.missionId) {
			current = MISSIONS.find(function (m) { return m.id === state.flags.run.missionId; }) || null;
		}
		if (!current) current = getNextMission();
		var completed = Object.keys(state.completed).length;
		var ready = current ? (current.kind === 'combat' ? 'ENGAGE' : (current.kind === 'field' ? 'FIELD' : 'EXECUTE')) : 'TRAIN';
		var fieldStatus = liveOps && liveOps.active ? 'FIELD ONLINE' : 'FIELD STANDBY';
		return ''
			+ '<div class="cw-gp-run">'
			+   '<div class="cw-gp-run-hero">'
			+     '<div>'
			+       '<span class="cw-gp-run-kicker">ACTIVE RUN</span>'
			+       '<strong>' + escapeHtml(current ? current.title : 'NO MISSIONS LEFT') + '</strong>'
			+       '<p>' + escapeHtml(current ? current.brief : 'The district is clear. Use combat training, reset the operative, or replay cleared sectors.') + '</p>'
			+     '</div>'
			+     '<div class="cw-gp-run-actions">'
			+       '<button class="cw-gp-run-start" data-mid="' + (current ? current.id : '') + '">' + ready + '</button>'
			+       '<button class="cw-gp-field-toggle" type="button">' + fieldStatus + '</button>'
			+     '</div>'
			+   '</div>'
			+   '<div class="cw-gp-run-grid">'
			+     '<div class="cw-gp-run-card"><span>Sector</span><strong>' + escapeHtml(current ? current.sector : 'NONE') + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Mode</span><strong>' + escapeHtml(current ? current.kind.toUpperCase() : 'IDLE') + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Cleared</span><strong>' + completed + ' / ' + MISSIONS.length + '</strong></div>'
			+   '</div>'
			+   '<div class="cw-gp-run-track">'
			+     MISSIONS.map(function (m) {
					var active = state.flags.run && state.flags.run.missionId === m.id;
					var done = !!state.completed[m.id];
					return '<button class="cw-gp-run-node ' + (active ? 'active ' : '') + (done ? 'done' : '') + '" data-mid="' + m.id + '"><span>' + escapeHtml(m.title) + '</span><small>' + escapeHtml(m.sector) + '</small></button>';
				}).join('')
			+   '</div>'
			+ '</div>';
	}

	function renderField() {
		var active = liveOps && liveOps.active;
		var route = active ? liveOps.routeName : 'City Gate Practice Route';
		var packets = active ? liveOps.score : 0;
		var heat = active ? Math.round(liveOps.heat) : 0;
		var shields = active ? Math.round(liveOps.shield) : state.shield;
		var best = state.field && state.field.bestRoute ? state.field.bestRoute : 0;
		return ''
			+ '<div class="cw-gp-field">'
			+   '<div class="cw-gp-field-hero">'
			+     '<div class="field-sprite" aria-hidden="true"></div>'
			+     '<div>'
			+       '<span class="cw-gp-run-kicker">' + (active ? 'FIELD ACTIVE' : 'FIELD READY') + '</span>'
			+       '<strong>' + escapeHtml(route) + '</strong>'
			+       '<p>Move with WASD or arrows. Collect encrypted shards, avoid daemons and firewall towers, pulse to cool trace heat, then enter the exfil gate.</p>'
			+     '</div>'
			+   '</div>'
			+   '<div class="cw-gp-run-grid">'
			+     '<div class="cw-gp-run-card"><span>Packets</span><strong>' + packets + ' / ' + FIELD_TARGET_PACKETS + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Trace Heat</span><strong>' + heat + '%</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Field Shield</span><strong>' + shields + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Clears</span><strong>' + ((state.field && state.field.clears) || 0) + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Best Route</span><strong>' + best + '</strong></div>'
			+     '<div class="cw-gp-run-card"><span>Mode</span><strong>' + (active ? 'LIVE' : 'STANDBY') + '</strong></div>'
			+   '</div>'
			+   '<div class="cw-gp-field-actions">'
			+     '<button class="field-launch" type="button">' + (active ? 'RESTART FIELD' : 'LAUNCH FIELD') + '</button>'
			+     '<button class="field-pulse" type="button" ' + (!active ? 'disabled' : '') + '>PULSE</button>'
			+     '<button class="field-extract" type="button" ' + (!active ? 'disabled' : '') + '>EXTRACT</button>'
			+     '<button class="field-standdown" type="button" ' + (!active ? 'disabled' : '') + '>STAND DOWN</button>'
			+   '</div>'
			+   '<div class="cw-gp-field-log">' + ((active && liveOps.log.length) ? liveOps.log.slice(-5).map(escapeHtml).join('<br>') : 'No active route. Launch the field to start a playable convoy run.') + '</div>'
			+ '</div>';
	}

	function renderCombat() {
		if (!combat) {
			return ''
				+ '<div class="cw-gp-empty">'
				+   '<p>No active engagement.</p>'
				+   '<button class="cw-gp-train">Spar with Training Daemon</button>'
				+ '</div>';
		}
		var c = combat;
		var pct = Math.max(0, Math.floor(100 * c.enemy.hp / c.enemy.maxHp));
		return ''
			+ '<div class="cw-gp-combat ' + (c.fx === 'boom' ? 'fx-boom' : '') + '">'
			+   '<div class="cb-target">'
			+     '<span class="cb-target-kicker">TARGET LOCKED</span>'
			+     '<strong>' + escapeHtml(c.enemyId) + '</strong>'
			+     '<small>MODE ' + escapeHtml(c.mission ? c.mission.kind.toUpperCase() : 'TRAIN') + ' · ' + (c.turn === 'player' ? 'YOUR MOVE' : 'ENEMY MOVE') + '</small>'
			+   '</div>'
			+   '<div class="cb-arena" aria-hidden="true">'
			+     '<div class="cb-operator"></div>'
			+     '<div class="cb-lane"></div>'
			+     '<div class="cb-enemy-sprite ' + (c.enemy.boss ? 'boss' : '') + '"></div>'
			+   '</div>'
			+   '<div class="cb-enemy">'
			+     '<div class="cb-bar"><span style="width:' + pct + '%"></span></div>'
			+     '<small>HP ' + c.enemy.hp + ' / ' + c.enemy.maxHp + ' · ACC ' + c.enemy.accuracy + ' · DEF ' + c.enemy.def + '</small>'
			+   '</div>'
			+   '<div class="cb-tooltips">'
			+     '<div><strong>NMAP</strong><span>-10 HP · -10 ACC · -1 DEF</span></div>'
			+     '<div><strong>SQLNINJA</strong><span>Command breach for higher damage</span></div>'
			+     '<div><strong>BOOM</strong><span>Detonate for burst damage + accuracy drop</span></div>'
			+   '</div>'
			+   '<div class="cb-actions">'
			+     '<button data-act="nmap" ' + (c.turn !== 'player' ? 'disabled' : '') + '>NMAP</button>'
			+     '<button data-act="sqlninja" ' + (c.turn !== 'player' ? 'disabled' : '') + '>SQLNINJA</button>'
			+     '<button data-act="boom" ' + (c.turn !== 'player' ? 'disabled' : '') + '>BOOM</button>'
			+     '<button data-act="patch"   ' + (c.turn !== 'player' ? 'disabled' : '') + '>PATCH-KIT (' + (state.inventory['PATCH-KIT'] || 0) + ')</button>'
			+     '<button data-act="run"     ' + (c.turn !== 'player' ? 'disabled' : '') + '>RUN</button>'
			+   '</div>'
			+   '<div class="cb-log">' + c.log.slice(-6).map(escapeHtml).join('<br>') + '</div>'
			+ '</div>';
	}

	function renderInventory() {
		var keys = Object.keys(state.inventory);
		if (!keys.length) return '<em>Inventory empty.</em>';
		return '<ul class="cw-gp-inv">' + keys.map(function (k) {
			return '<li><strong>' + escapeHtml(k) + '</strong><span>×' + state.inventory[k] + '</span></li>';
		}).join('') + '</ul>';
	}

	function renderProfile() {
		var need = xpForLevel(state.level);
		var pct = Math.floor(100 * state.xp / need);
		return ''
			+ '<div class="cw-gp-profile">'
			+   '<div class="pf-row"><span>Callsign</span><strong>' + escapeHtml(state.callsign) + '</strong></div>'
			+   '<div class="pf-row"><span>Tier</span><strong>' + state.level + '</strong></div>'
			+   '<div class="pf-row"><span>XP</span><strong>' + state.xp + ' / ' + need + '</strong></div>'
			+   '<div class="pf-bar"><span style="width:' + pct + '%"></span></div>'
			+   '<div class="pf-row"><span>HP</span><strong>' + state.hp + ' / ' + state.maxHp + '</strong></div>'
			+   '<div class="pf-row"><span>Shield</span><strong>' + state.shield + ' / ' + state.maxShield + '</strong></div>'
			+   '<div class="pf-row"><span>Credits</span><strong>' + state.credits + 'c</strong></div>'
			+   '<div class="pf-row"><span>Missions</span><strong>' + Object.keys(state.completed).length + ' / ' + MISSIONS.length + '</strong></div>'
			+   '<div class="pf-actions">'
			+     '<button class="pf-rest">REST (full restore)</button>'
			+     '<button class="pf-reset">RESET OPERATIVE</button>'
			+   '</div>'
			+ '</div>';
	}

	function render() {
		if (!root || !open) return;
		var tab = root.dataset.tab || 'run';
		var body = root.querySelector('.cw-gp-body');
		var foot = root.querySelector('.cw-gp-foot');

		if (tab === 'run')        body.innerHTML = renderRun();
		else if (tab === 'field') body.innerHTML = renderField();
		else if (tab === 'missions')   body.innerHTML = renderMissions();
		else if (tab === 'combat') body.innerHTML = renderCombat();
		else if (tab === 'inventory') body.innerHTML = renderInventory();
		else if (tab === 'profile') body.innerHTML = renderProfile();

		var fieldActive = liveOps && liveOps.active;
		foot.innerHTML = ''
			+ '<span>TIER ' + state.level + '</span>'
			+ (fieldActive
				? '<span>FIELD SHIELD ' + Math.max(0, Math.round(liveOps.shield)) + '</span>'
					+ '<span>HEAT ' + Math.round(liveOps.heat) + '%</span>'
					+ '<span>PACKETS ' + liveOps.score + '/' + FIELD_TARGET_PACKETS + '</span>'
				: '<span>HP ' + state.hp + '/' + state.maxHp + '</span>'
					+ '<span>SHIELD ' + state.shield + '/' + state.maxShield + '</span>')
			+ '<span>' + state.credits + 'c</span>'
			+ '<span>XP ' + state.xp + '/' + xpForLevel(state.level) + '</span>';

		// Event wiring (delegated re-bind safe since we replaced innerHTML)
		body.querySelectorAll('.cw-gp-run-node').forEach(function (b) {
			b.addEventListener('click', function () {
				var m = MISSIONS.find(function (x) { return x.id === b.dataset.mid; });
				if (m) startMission(m);
			});
		});
		var runStart = body.querySelector('.cw-gp-run-start');
		if (runStart) runStart.addEventListener('click', function () {
			var m = MISSIONS.find(function (x) { return x.id === runStart.dataset.mid; }) || getNextMission();
			if (m) startMission(m);
		});
		var fieldToggle = body.querySelector('.cw-gp-field-toggle');
		if (fieldToggle) fieldToggle.addEventListener('click', function () {
			activateLiveOps(null);
			toggle(false);
		});
		var fieldLaunch = body.querySelector('.field-launch');
		if (fieldLaunch) fieldLaunch.addEventListener('click', function () {
			activateLiveOps(null);
			toggle(false);
		});
		var fieldPulse = body.querySelector('.field-pulse');
		if (fieldPulse) fieldPulse.addEventListener('click', function () { pulseLiveOps(); render(); });
		var fieldExtract = body.querySelector('.field-extract');
		if (fieldExtract) fieldExtract.addEventListener('click', function () { tryFieldExtract(); render(); });
		var fieldStanddown = body.querySelector('.field-standdown');
		if (fieldStanddown) fieldStanddown.addEventListener('click', function () { deactivateLiveOps('Field route suspended'); render(); });
		body.querySelectorAll('.m-start').forEach(function (b) {
			b.addEventListener('click', function () {
				var m = MISSIONS.find(function (x) { return x.id === b.dataset.mid; });
				if (m) startMission(m);
			});
		});
		body.querySelectorAll('.cb-actions button').forEach(function (b) {
			b.addEventListener('click', function () { playerAct(b.dataset.act); });
		});
		var train = body.querySelector('.cw-gp-train');
		if (train) train.addEventListener('click', function () {
			root.dataset.tab = 'combat';
			startCombat('TRAINING-DAEMON', function () { render(); });
		});
		var rest = body.querySelector('.pf-rest');
		if (rest) rest.addEventListener('click', function () {
			state.hp = state.maxHp; state.shield = state.maxShield; saveState();
			toast('Fully restored'); render();
		});
		var reset = body.querySelector('.pf-reset');
		if (reset) reset.addEventListener('click', function () {
			if (confirm('Reset operative? This wipes XP, credits, inventory, missions.')) {
				localStorage.removeItem(SAVE_KEY);
				state = loadState();
				toast('Operative reset');
				render();
			}
		});
	}

	// ---------- Trigger surface ----------
	function mountFab() {
		if (!document.querySelector('.cw-gp-fab')) {
			var fab = document.createElement('button');
			fab.type = 'button';
			fab.className = 'cw-gp-fab';
			fab.setAttribute('aria-label', 'Open Operative Console (M)');
			fab.title = 'Operative Console (M)';
			fab.textContent = 'CONSOLE';
			fab.addEventListener('click', function () { toggle(); });
			document.body.appendChild(fab);
		}
		if (!document.querySelector('.cw-field-fab')) {
			var field = document.createElement('button');
			field.type = 'button';
			field.className = 'cw-field-fab';
			field.setAttribute('aria-label', 'Launch field mode');
			field.title = 'Field Mode (WASD / arrows)';
			field.textContent = 'FIELD';
			field.addEventListener('click', function () {
				if (liveOps && liveOps.active) deactivateLiveOps('Field route suspended');
				else activateLiveOps(null);
			});
			document.body.appendChild(field);
		}
		updateFieldFab();
	}

	// ---------- Live Ops layer ----------
	var liveOps = null;
	var liveKeys = {};
	function liveToast(msg) {
		if (!liveOps || !liveOps.toast) return;
		liveOps.toast.textContent = msg;
		liveOps.toast.classList.add('show');
		clearTimeout(liveOps.toastTimer);
		liveOps.toastTimer = setTimeout(function () { liveOps.toast.classList.remove('show'); }, 1200);
	}
	function randBetween(min, max) { return min + Math.random() * Math.max(0, max - min); }
	function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
	function dist(a, b) {
		var dx = a.x - b.x, dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
	function placeLiveNode(node, obj) {
		if (!node || !obj) return;
		node.style.setProperty('--x', Math.round(obj.x) + 'px');
		node.style.setProperty('--y', Math.round(obj.y) + 'px');
	}
	function routeNameForMission(mission) {
		if (mission && mission.id === 'sc-caves') return 'Stormcore Firewall Caves';
		if (mission && mission.id === 'dn-cave') return 'Dark Relay Cave Survey';
		if (mission && mission.id === 'dn-convoy') return 'Black Relay Convoy';
		if (mission && mission.id === 'mc-convoy') return 'City Gate Convoy';
		return 'City Gate Practice Route';
	}
	function liveEntity(className, label) {
		var node = document.createElement('div');
		node.className = className;
		node.dataset.liveEntity = '1';
		node.setAttribute('aria-hidden', 'true');
		if (label) node.title = label;
		return node;
	}
	function spawnPacket(bounds, i) {
		var cols = [0.18, 0.34, 0.51, 0.68, 0.82, 0.44, 0.72];
		var rows = [0.24, 0.58, 0.34, 0.68, 0.46, 0.79, 0.22];
		return {
			x: clamp(bounds.width * cols[i % cols.length] + randBetween(-22, 22), 92, bounds.width - 72),
			y: clamp(bounds.height * rows[i % rows.length] + randBetween(-18, 18), 104, bounds.height - 84),
			collected: false
		};
	}
	function spawnDaemon(bounds, i, mission) {
		var hard = mission && /^(dn-convoy|dn-cave|sc-caves)$/.test(mission.id);
		var speed = hard ? randBetween(0.38, 0.58) : randBetween(0.26, 0.44);
		var lanes = [0.47, 0.62, 0.78, 0.54, 0.86];
		var rows = [0.24, 0.72, 0.42, 0.84, 0.58];
		return {
			x: clamp(bounds.width * lanes[i % lanes.length], 118, bounds.width - 78),
			y: clamp(bounds.height * rows[i % rows.length], 118, bounds.height - 88),
			vx: (i % 2 ? 1 : -1) * speed,
			vy: (i % 3 ? 1 : -1) * speed * 0.62,
			stun: 0,
			type: i === FIELD_MAX_DAEMONS - 1 && hard ? 'sentinel' : 'watcher'
		};
	}
	function spawnTower(bounds, i) {
		return {
			x: clamp(bounds.width * (i ? 0.74 : 0.29), 110, bounds.width - 90),
			y: clamp(bounds.height * (i ? 0.36 : 0.64), 124, bounds.height - 96),
			range: i ? 92 : 78,
			hot: false
		};
	}
	function clearLiveEntities() {
		if (!liveOps || !liveOps.root) return;
		liveOps.root.querySelectorAll('[data-live-entity="1"]').forEach(function (node) {
			node.remove();
		});
	}
	function mountLiveOps() {
		var viewport = document.querySelector('.cw-stage .viewport');
		if (!viewport) return null;
		if (liveOps && liveOps.root && liveOps.root.isConnected) return liveOps;
		if (getComputedStyle(viewport).position === 'static') viewport.style.position = 'relative';
		var root = document.createElement('div');
		root.className = 'cw-live-ops';
		root.innerHTML = ''
			+ '<div class="lo-field-grid" aria-hidden="true"></div>'
			+ '<div class="lo-player" aria-hidden="true"></div>'
			+ '<div class="lo-gate" aria-hidden="true"></div>'
			+ '<div class="cw-live-toast"></div>';
		var hud = document.createElement('div');
		hud.className = 'cw-live-hud';
		hud.innerHTML = ''
			+ '<span id="lo-route">Field standby</span>'
			+ '<span id="lo-objective">Launch route</span>'
			+ '<span id="lo-score">Packets 0/' + FIELD_TARGET_PACKETS + '</span>'
			+ '<span id="lo-heat">Heat 0%</span>'
			+ '<span id="lo-shield">Shield 0</span>'
			+ '<span class="warn">WASD/arrows move - Space pulse - E exfil - Esc stand down</span>';
		viewport.appendChild(root);
		viewport.appendChild(hud);
		liveOps = {
			root: root,
			hud: hud,
			toast: root.querySelector('.cw-live-toast'),
			playerNode: root.querySelector('.lo-player'),
			gateNode: root.querySelector('.lo-gate'),
			active: false,
			ticking: false,
			routeName: 'City Gate Practice Route',
			mission: null,
			player: { x: 180, y: 180, speed: 3.25 },
			score: 0,
			heat: 0,
			shield: Math.max(58, state.shield + 24, state.maxShield + 18),
			pulseCooldown: 0,
			dashCooldown: 0,
			gateOpen: false,
			last: performance.now(),
			packets: [],
			daemons: [],
			towers: [],
			packetNodes: [],
			daemonNodes: [],
			towerNodes: [],
			log: []
		};
		updateLiveHud();
		return liveOps;
	}
	function resetLiveOps(mission) {
		var ops = mountLiveOps();
		if (!ops) return null;
		var viewport = document.querySelector('.cw-stage .viewport');
		var rect = viewport.getBoundingClientRect();
		clearLiveEntities();
		ops.active = true;
		ops.mission = mission || null;
		ops.routeName = routeNameForMission(mission);
		ops.player = { x: Math.max(110, rect.width * 0.16), y: Math.max(132, rect.height * 0.5), speed: 3.25 };
		ops.score = 0;
		ops.heat = 0;
		ops.shield = Math.max(58, state.shield + 24, state.maxShield + 18);
		ops.pulseCooldown = 0;
		ops.dashCooldown = 0;
		ops.gateOpen = false;
		ops.packets = [];
		ops.daemons = [];
		ops.towers = [];
		ops.packetNodes = [];
		ops.daemonNodes = [];
		ops.towerNodes = [];
		ops.log = ['Route online: ' + ops.routeName, 'Collect shards, avoid trace heat, exfil clean.'];
		ops.last = performance.now();
		var i;
		for (i = 0; i < FIELD_TARGET_PACKETS; i++) {
			var p = spawnPacket(rect, i);
			var pn = liveEntity('lo-packet', 'Encrypted data shard');
			ops.root.appendChild(pn);
			ops.packets.push(p);
			ops.packetNodes.push(pn);
			placeLiveNode(pn, p);
		}
		var daemonCount = mission && /^(dn-convoy|dn-cave|sc-caves)$/.test(mission.id) ? FIELD_MAX_DAEMONS : 3;
		for (i = 0; i < daemonCount; i++) {
			var d = spawnDaemon(rect, i, mission);
			var dn = liveEntity('lo-daemon ' + d.type, d.type === 'sentinel' ? 'Sentinel ICE' : 'Watcher daemon');
			ops.root.appendChild(dn);
			ops.daemons.push(d);
			ops.daemonNodes.push(dn);
			placeLiveNode(dn, d);
		}
		for (i = 0; i < 2; i++) {
			var t = spawnTower(rect, i);
			var tn = liveEntity('lo-tower', 'Firewall tower');
			ops.root.appendChild(tn);
			ops.towers.push(t);
			ops.towerNodes.push(tn);
			placeLiveNode(tn, t);
		}
		placeLiveNode(ops.playerNode, ops.player);
		placeLiveNode(ops.gateNode, { x: rect.width - 124, y: rect.height * 0.5 });
		ops.gateNode.classList.remove('open');
		document.body.classList.add('cw-live-mode');
		updateFieldFab();
		updateLiveHud();
		liveToast('Field route online');
		if (!ops.ticking) {
			ops.ticking = true;
			requestAnimationFrame(tickLiveOps);
		}
		return ops;
	}
	function activateLiveOps(mission) {
		resetLiveOps(mission || null);
	}
	function deactivateLiveOps(reason) {
		if (!liveOps) return;
		liveOps.active = false;
		liveOps.log.push(reason || 'Field route suspended');
		document.body.classList.remove('cw-live-mode');
		updateFieldFab();
		updateLiveHud();
		liveToast(reason || 'Field route suspended');
	}
	function updateFieldFab() {
		var btn = document.querySelector('.cw-field-fab');
		if (!btn) return;
		var active = liveOps && liveOps.active;
		btn.classList.toggle('active', !!active);
		btn.textContent = active ? 'STAND DOWN' : 'FIELD';
		btn.setAttribute('aria-label', active ? 'Stand down field mode' : 'Launch field mode');
	}
	function pulseLiveOps() {
		if (!liveOps || !liveOps.active) return;
		if (liveOps.pulseCooldown > 0) {
			liveToast('Pulse recharging');
			return;
		}
		liveOps.pulseCooldown = 58;
		liveOps.heat = Math.max(0, liveOps.heat - 34);
		liveOps.daemons.forEach(function (d) { d.stun = Math.max(d.stun, 68); });
		liveOps.log.push('Pulse fired: daemons stunned, trace heat reduced.');
		liveOps.root.style.setProperty('--pulse-x', Math.round(liveOps.player.x) + 'px');
		liveOps.root.style.setProperty('--pulse-y', Math.round(liveOps.player.y) + 'px');
		liveOps.root.classList.add('pulse');
		setTimeout(function () { if (liveOps && liveOps.root) liveOps.root.classList.remove('pulse'); }, 260);
		liveToast('Pulse fired');
		updateLiveHud();
	}
	function tryFieldExtract() {
		if (!liveOps || !liveOps.active) return;
		if (!liveOps.gateOpen) {
			liveToast('Gate locked: collect all shards');
			return;
		}
		var gatePos = { x: parseFloat(liveOps.gateNode.style.getPropertyValue('--x')) || 0, y: parseFloat(liveOps.gateNode.style.getPropertyValue('--y')) || 0 };
		if (dist(liveOps.player, gatePos) > 72) {
			liveToast('Move into the exfil gate');
			return;
		}
		completeFieldRun();
	}
	function completeFieldRun() {
		if (!liveOps || !liveOps.active) return;
		state.field = state.field || { clears: 0, bestRoute: 0 };
		state.field.clears++;
		state.field.bestRoute = Math.max(state.field.bestRoute || 0, liveOps.score);
		state.shield = Math.max(20, Math.min(state.maxShield, Math.round(liveOps.shield)));
		saveState();
		var mission = liveOps.mission;
		liveOps.log.push('Exfil complete: route secured.');
		deactivateLiveOps('Exfil complete');
		if (mission) completeMission(mission);
		else {
			gainXp(45);
			gainCredits(75);
			gainItem('DATA-SHARD', 1);
		}
		if (root && open) render();
	}
	function updateLiveHud() {
		if (!liveOps || !liveOps.hud) return;
		var route = liveOps.hud.querySelector('#lo-route');
		var objective = liveOps.hud.querySelector('#lo-objective');
		var score = liveOps.hud.querySelector('#lo-score');
		var heat = liveOps.hud.querySelector('#lo-heat');
		var shield = liveOps.hud.querySelector('#lo-shield');
		if (route) route.textContent = liveOps.active ? liveOps.routeName : 'Field standby';
		if (objective) {
			if (!liveOps.active) objective.textContent = 'Launch route';
			else if (liveOps.gateOpen) objective.textContent = 'Gate open - exfil';
			else objective.textContent = 'Collect ' + Math.max(0, FIELD_TARGET_PACKETS - liveOps.score) + ' shards';
		}
		if (score) score.textContent = 'Packets ' + liveOps.score + '/' + FIELD_TARGET_PACKETS;
		if (heat) {
			heat.textContent = 'Heat ' + Math.round(liveOps.heat) + '%';
			heat.style.setProperty('--value', clamp(liveOps.heat, 0, 100) + '%');
			heat.classList.toggle('danger', liveOps.heat >= 72);
			heat.classList.toggle('caution', liveOps.heat >= 42 && liveOps.heat < 72);
		}
		if (shield) {
			shield.textContent = 'Shield ' + Math.max(0, Math.round(liveOps.shield));
			shield.style.setProperty('--value', clamp((liveOps.shield / state.maxShield) * 100, 0, 100) + '%');
			shield.classList.toggle('danger', liveOps.shield <= Math.max(8, state.maxShield * 0.25));
		}
	}
	function tickLiveOps(now) {
		if (!liveOps || !liveOps.root || !liveOps.root.isConnected) return;
		if (!liveOps.active) {
			liveOps.ticking = false;
			updateLiveHud();
			return;
		}
		var viewport = document.querySelector('.cw-stage .viewport');
		if (!viewport) {
			deactivateLiveOps('Field viewport unavailable');
			return;
		}
		if (open) {
			updateLiveHud();
			requestAnimationFrame(tickLiveOps);
			return;
		}
		var rect = viewport.getBoundingClientRect();
		var dt = Math.min(32, Math.max(0, now - liveOps.last)) / 16.666;
		liveOps.last = now;
		var dx = (liveKeys.ArrowRight || liveKeys.d ? 1 : 0) - (liveKeys.ArrowLeft || liveKeys.a ? 1 : 0);
		var dy = (liveKeys.ArrowDown || liveKeys.s ? 1 : 0) - (liveKeys.ArrowUp || liveKeys.w ? 1 : 0);
		if (dx && dy) { dx *= 0.707; dy *= 0.707; }
		var dashing = (liveKeys.Shift || liveKeys.shift) && liveOps.dashCooldown <= 0 && (dx || dy);
		var speed = liveOps.player.speed * (dashing ? 1.55 : 1);
		liveOps.player.x = clamp(liveOps.player.x + dx * speed * dt, 56, Math.max(74, rect.width - 54));
		liveOps.player.y = clamp(liveOps.player.y + dy * speed * dt, 74, Math.max(92, rect.height - 58));
		if (dashing) {
			liveOps.dashCooldown = 82;
			liveOps.heat = Math.min(100, liveOps.heat + 2);
			liveOps.playerNode.classList.add('dash');
			setTimeout(function () { if (liveOps && liveOps.playerNode) liveOps.playerNode.classList.remove('dash'); }, 180);
		}
		liveOps.dashCooldown = Math.max(0, liveOps.dashCooldown - dt);
		liveOps.pulseCooldown = Math.max(0, liveOps.pulseCooldown - dt);
		placeLiveNode(liveOps.playerNode, liveOps.player);
		liveOps.daemons.forEach(function (d, i) {
			if (d.stun > 0) {
				d.stun = Math.max(0, d.stun - dt);
				liveOps.daemonNodes[i].classList.add('stunned');
			} else {
				liveOps.daemonNodes[i].classList.remove('stunned');
				var distance = dist(liveOps.player, d);
				if (distance < 160) {
					d.vx += clamp((liveOps.player.x - d.x) / 1450, -0.038, 0.038);
					d.vy += clamp((liveOps.player.y - d.y) / 1450, -0.038, 0.038);
				}
				d.vx = clamp(d.vx, -0.68, 0.68);
				d.vy = clamp(d.vy, -0.55, 0.55);
				d.x += d.vx * dt;
				d.y += d.vy * dt;
				if (d.x < 72 || d.x > rect.width - 62) d.vx *= -1;
				if (d.y < 88 || d.y > rect.height - 66) d.vy *= -1;
				d.x = clamp(d.x, 72, Math.max(88, rect.width - 62));
				d.y = clamp(d.y, 88, Math.max(104, rect.height - 66));
				if (distance < 29) {
					liveOps.heat = Math.min(100, liveOps.heat + 0.55 * dt);
					liveOps.shield = Math.max(0, liveOps.shield - 0.09 * dt);
				}
			}
			placeLiveNode(liveOps.daemonNodes[i], d);
		});
		liveOps.towers.forEach(function (tower, i) {
			var hot = dist(liveOps.player, tower) < tower.range;
			tower.hot = hot;
			liveOps.towerNodes[i].classList.toggle('hot', hot);
			if (hot) liveOps.heat = Math.min(100, liveOps.heat + 0.15 * dt);
		});
		liveOps.packets.forEach(function (p, i) {
			if (p.collected) return;
			if (dist(liveOps.player, p) < 36) {
				p.collected = true;
				liveOps.packetNodes[i].classList.add('collected');
				liveOps.score++;
				liveOps.heat = Math.max(0, liveOps.heat - 3);
				gainCredits(10);
				liveOps.log.push('Shard captured: ' + liveOps.score + '/' + FIELD_TARGET_PACKETS);
				liveToast('Shard captured');
			}
		});
		if (!liveOps.gateOpen && liveOps.score >= FIELD_TARGET_PACKETS) {
			liveOps.gateOpen = true;
			liveOps.gateNode.classList.add('open');
			liveOps.log.push('Exfil gate open. Move east and press E.');
			liveToast('Exfil gate open');
		}
		if (liveOps.gateOpen && dist(liveOps.player, { x: rect.width - 124, y: rect.height * 0.5 }) < 64) {
			completeFieldRun();
			return;
		}
		liveOps.heat = Math.max(0, liveOps.heat - 0.055 * dt);
		if (liveOps.heat >= 100 || liveOps.shield <= 0) {
			state.hp = Math.max(20, state.hp - 6);
			state.shield = Math.max(0, Math.round(liveOps.shield));
			saveState();
			liveOps.log.push('Trace spike: route reset, HP reduced.');
			liveToast('Trace spike - route reset');
			resetLiveOps(liveOps.mission);
			requestAnimationFrame(tickLiveOps);
			return;
		}
		updateLiveHud();
		requestAnimationFrame(tickLiveOps);
	}

	document.addEventListener('keydown', function (ev) {
		if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
		var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
		var fieldActive = !!(liveOps && liveOps.active);
		var canDriveField = fieldActive && !open;
		if (canDriveField && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift'].indexOf(key) !== -1) {
			liveKeys[key] = true;
			ev.preventDefault();
		}
		if (canDriveField && (key === ' ' || key === 'Spacebar')) {
			ev.preventDefault();
			pulseLiveOps();
		}
		if (canDriveField && key === 'e') {
			ev.preventDefault();
			tryFieldExtract();
		}
		if (ev.key === 'm' || ev.key === 'M') { ev.preventDefault(); toggle(); }
		else if (ev.key === 'Escape' && fieldActive && !open) { ev.preventDefault(); deactivateLiveOps('Field route suspended'); }
		else if (ev.key === 'Escape' && open) { toggle(false); }
	});
	document.addEventListener('keyup', function (ev) {
		var key = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
		liveKeys[key] = false;
	});

	// Hook augment routes: pressing in-game shortcuts also surfaces relevant missions.
	// Backwards-compatible: only registers if augment.js exposed __cwAddRoute.
	function wireRoutes() {
		if (typeof window.__cwAddRoute !== 'function') return;
		var openConsoleTab = function (tab) {
			toggle(true);
			if (root) {
				root.dataset.tab = tab;
				root.querySelectorAll('.cw-gp-tabs button').forEach(function (b) {
					b.classList.toggle('active', b.dataset.tab === tab);
				});
				render();
			}
		};
		// Provide overrides for in-game shortcuts that should open the console instead of full reload.
		window.__cwOpenConsole = openConsoleTab;
	}

	function autoStartLaunchRoute() {
		if (window.__cwDogfightRerouted) return;
		var launch = new URLSearchParams(window.location.search || '').get('launch');
		if (!launch || launch.toLowerCase() !== 'dogfight') return;
		window.__cwDogfightRerouted = true;
		setTimeout(function () {
			toast('Dogfight rebuilt as Field Route');
			var m = MISSIONS.find(function (x) { return x.id === 'mc-convoy'; });
			if (m) startMission(m);
		}, 900);
	}

	function boot() {
		if (!document.body) return;
		mountFab();
		mountLiveOps();
		wireRoutes();
		autoStartLaunchRoute();
		try { console.log('%c[CyberWorld gameplay] ready — press M', 'color:#00ff9c;font-weight:bold'); } catch (e) {}
	}
	document.addEventListener('DOMContentLoaded', boot, { once: true });
	window.addEventListener('load', boot, { once: true });
	setTimeout(boot, 0);
	setTimeout(boot, 1200);
	var bootAttempts = 0;
	var bootWatch = setInterval(function () {
		boot();
		bootAttempts++;
		if (bootAttempts >= 10) clearInterval(bootWatch);
	}, 1000);
	setInterval(function () {
		mountLiveOps();
	}, 1200);
	try {
		new MutationObserver(function () {
			mountLiveOps();
		}).observe(document.body, { childList: true, subtree: true });
	} catch (e) {}

	function freshState(profile) {
		var base = JSON.parse(JSON.stringify(DEFAULT_STATE));
		base.callsign = (profile && profile.callsign) || ('OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000));
		base.flags.path = (profile && profile.path) || 'sentinel';
		base.flags.origin = (profile && profile.origin) || 'city-gate';
		base.look = Object.assign({
			suit: '#00ffcc',
			hair: '#111827',
			accent: '#ff2bd6',
			frame: 'street'
		}, (profile && profile.look) || {});
		return base;
	}
	function resetFresh(profile) {
		state = freshState(profile || {});
		saveState();
		if (liveOps && liveOps.active) deactivateLiveOps('Fresh operative profile loaded');
		render();
		try { if (window.__cwNet && window.__cwNet.sync) window.__cwNet.sync(); } catch (e) {}
		return JSON.parse(JSON.stringify(state));
	}
	function completeTutorialReward() {
		if (state.flags && state.flags.tutorialDone) return false;
		state.flags = state.flags || {};
		state.flags.tutorialDone = true;
		state.inventory = state.inventory || {};
		state.inventory['STARTER-DECK'] = (state.inventory['STARTER-DECK'] || 0) + 1;
		state.inventory['PATCH-KIT'] = (state.inventory['PATCH-KIT'] || 0) + 1;
		state.inventory['PORT-MAP'] = (state.inventory['PORT-MAP'] || 0) + 1;
		state.credits += 75;
		state.xp += 35;
		saveState();
		render();
		try { if (window.__cwNet && window.__cwNet.sync) window.__cwNet.sync(); } catch (e) {}
		toast('Tutorial complete - starter gear issued');
		return true;
	}

	// Public API
	window.__cwGameplay = {
		state: function () { return JSON.parse(JSON.stringify(state)); },
		open: function () { toggle(true); },
		close: function () { toggle(false); },
		toggle: toggle,
		gainXp: gainXp,
		gainCredits: gainCredits,
		gainItem: gainItem,
		resetFresh: resetFresh,
		completeTutorialReward: completeTutorialReward,
		startMission: function (id) {
			var m = MISSIONS.find(function (x) { return x.id === id; });
			if (m) startMission(m);
		},
		missions: function () { return MISSIONS.slice(); }
	};
})();
