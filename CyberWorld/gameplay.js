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
		level: 1, xp: 0, credits: 250,
		hp: 100, maxHp: 100,
		shield: 30, maxShield: 30,
		inventory: { 'PING-BREACH': 1, 'PATCH-KIT': 2 },
		completed: {},
		flags: {}
	};
	function loadState() {
		try {
			var raw = localStorage.getItem(SAVE_KEY);
			if (!raw) return Object.assign({}, DEFAULT_STATE);
			var s = JSON.parse(raw);
			return Object.assign({}, DEFAULT_STATE, s, {
				inventory: Object.assign({}, DEFAULT_STATE.inventory, s.inventory || {}),
				completed: s.completed || {},
				flags: s.flags || {}
			});
		} catch (e) { return Object.assign({}, DEFAULT_STATE); }
	}
	function saveState() {
		try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
	}
	var state = loadState();

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
		  brief: 'Send a discovery ping to the FLLC gateway and confirm uplink.',
		  reward: { xp: 25, credits: 40 }, kind: 'instant' },
		{ id: 'tut-scan',    sector: 'Mainframe Core',  title: 'Scan Open Ports',
		  brief: 'Run a quick port sweep on three known service nodes.',
		  reward: { xp: 35, credits: 50, item: 'PORT-MAP' }, kind: 'instant' },
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
		{ id: 'sc-raid',     sector: 'Stormcore',       title: 'Stormcore Breach',
		  brief: 'Push through Stormcore ICE and tag the throne node.',
		  reward: { xp: 250, credits: 400, item: 'STORM-KEY' }, kind: 'combat', enemy: 'STORMCORE-ICE', req: { level: 6 } }
	];

	var ENEMIES = {
		'PHANTOM-DRONE':    { hp: 60,  atk: 8,  def: 2,  loot: { credits: 60 } },
		'CARTEL-WARDEN':    { hp: 110, atk: 12, def: 4,  loot: { credits: 120, item: 'CIPHER-KEY' } },
		'STORMCORE-ICE':    { hp: 220, atk: 18, def: 8,  loot: { credits: 250, item: 'ICE-CORE' } },
		'TRAINING-DAEMON':  { hp: 30,  atk: 4,  def: 0,  loot: { credits: 20 } }
	};

	function missionAvailable(m) {
		if (state.completed[m.id]) return false;
		if (m.req && m.req.level && state.level < m.req.level) return false;
		return true;
	}

	function completeMission(m) {
		state.completed[m.id] = Date.now();
		if (m.reward.xp) gainXp(m.reward.xp);
		if (m.reward.credits) gainCredits(m.reward.credits);
		if (m.reward.item) gainItem(m.reward.item, 1);
		toast('MISSION COMPLETE: ' + m.title);
	}

	function startMission(m) {
		if (!missionAvailable(m)) { toast('Mission locked'); return; }
		if (m.kind === 'instant') {
			completeMission(m);
			render();
		} else if (m.kind === 'combat') {
			startCombat(m.enemy, function (won) {
				if (won) completeMission(m);
				else toast('MISSION FAILED — recover and retry');
				render();
			}, m);
		}
	}

	// ---------- Combat engine ----------
	var combat = null;
	function startCombat(enemyId, onEnd, mission) {
		var base = ENEMIES[enemyId] || ENEMIES['TRAINING-DAEMON'];
		combat = {
			enemyId: enemyId,
			enemy: { hp: base.hp, maxHp: base.hp, atk: base.atk, def: base.def, loot: base.loot },
			log: ['ENGAGED ' + enemyId],
			turn: 'player',
			onEnd: onEnd,
			mission: mission
		};
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
		render();
	}
	function playerAct(action) {
		if (!combat || combat.turn !== 'player') return;
		var c = combat;
		var dmg, msg;
		if (action === 'exploit') {
			dmg = Math.max(1, 14 + Math.floor(Math.random() * 10) - c.enemy.def);
			c.enemy.hp -= dmg;
			msg = 'EXPLOIT lands for ' + dmg;
		} else if (action === 'patch') {
			if (!consumeItem('PATCH-KIT')) { c.log.push('No PATCH-KIT available'); render(); return; }
			var heal = 18 + Math.floor(Math.random() * 8);
			state.hp = Math.min(state.maxHp, state.hp + heal);
			state.shield = Math.min(state.maxShield, state.shield + 6);
			saveState();
			msg = 'PATCH-KIT restores ' + heal + ' HP';
		} else if (action === 'trace') {
			c.enemy.def = Math.max(0, c.enemy.def - 2);
			dmg = Math.max(1, 6 + Math.floor(Math.random() * 6));
			c.enemy.hp -= dmg;
			msg = 'TRACE_ROUTE weakens defense, ' + dmg + ' dmg';
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
		var raw = c.enemy.atk + Math.floor(Math.random() * 6) - 2;
		var absorbed = Math.min(state.shield, Math.max(0, Math.floor(raw * 0.6)));
		state.shield -= absorbed;
		var hpHit = Math.max(0, raw - absorbed);
		state.hp -= hpHit;
		saveState();
		c.log.push('Enemy hits for ' + raw + ' (' + absorbed + ' shield / ' + hpHit + ' hp)');
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
			+     '<button data-tab="missions" class="active">Missions</button>'
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
		root.dataset.tab = 'missions';
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
				            : '<button class="m-start" data-mid="' + m.id + '">' + (m.kind === 'combat' ? 'ENGAGE' : 'EXECUTE') + '</button>')
				+   '</div>'
				+ '</div>';
		}).join('');
		return rows || '<em>No missions available.</em>';
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
			+ '<div class="cw-gp-combat">'
			+   '<div class="cb-enemy">'
			+     '<strong>' + escapeHtml(c.enemyId) + '</strong>'
			+     '<div class="cb-bar"><span style="width:' + pct + '%"></span></div>'
			+     '<small>HP ' + c.enemy.hp + ' / ' + c.enemy.maxHp + ' · DEF ' + c.enemy.def + '</small>'
			+   '</div>'
			+   '<div class="cb-actions">'
			+     '<button data-act="exploit" ' + (c.turn !== 'player' ? 'disabled' : '') + '>EXPLOIT</button>'
			+     '<button data-act="patch"   ' + (c.turn !== 'player' ? 'disabled' : '') + '>PATCH-KIT (' + (state.inventory['PATCH-KIT'] || 0) + ')</button>'
			+     '<button data-act="trace"   ' + (c.turn !== 'player' ? 'disabled' : '') + '>TRACE</button>'
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
		var tab = root.dataset.tab || 'missions';
		var body = root.querySelector('.cw-gp-body');
		var foot = root.querySelector('.cw-gp-foot');

		if (tab === 'missions')   body.innerHTML = renderMissions();
		else if (tab === 'combat') body.innerHTML = renderCombat();
		else if (tab === 'inventory') body.innerHTML = renderInventory();
		else if (tab === 'profile') body.innerHTML = renderProfile();

		foot.innerHTML = ''
			+ '<span>TIER ' + state.level + '</span>'
			+ '<span>HP ' + state.hp + '/' + state.maxHp + '</span>'
			+ '<span>SHIELD ' + state.shield + '/' + state.maxShield + '</span>'
			+ '<span>' + state.credits + 'c</span>'
			+ '<span>XP ' + state.xp + '/' + xpForLevel(state.level) + '</span>';

		// Event wiring (delegated re-bind safe since we replaced innerHTML)
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
		if (document.querySelector('.cw-gp-fab')) return;
		var fab = document.createElement('button');
		fab.type = 'button';
		fab.className = 'cw-gp-fab';
		fab.setAttribute('aria-label', 'Open Operative Console (M)');
		fab.title = 'Operative Console (M)';
		fab.textContent = 'CONSOLE';
		fab.addEventListener('click', function () { toggle(); });
		document.body.appendChild(fab);
	}

	document.addEventListener('keydown', function (ev) {
		if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
		if (ev.key === 'm' || ev.key === 'M') { ev.preventDefault(); toggle(); }
		else if (ev.key === 'Escape' && open) { toggle(false); }
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

	function boot() {
		if (!document.body) return;
		mountFab();
		wireRoutes();
		try { console.log('%c[CyberWorld gameplay] ready — press M', 'color:#00ff9c;font-weight:bold'); } catch (e) {}
	}
	document.addEventListener('DOMContentLoaded', boot, { once: true });
	window.addEventListener('load', boot, { once: true });
	setTimeout(boot, 0);
	setTimeout(boot, 1200);

	// Public API
	window.__cwGameplay = {
		state: function () { return JSON.parse(JSON.stringify(state)); },
		open: function () { toggle(true); },
		close: function () { toggle(false); },
		toggle: toggle,
		gainXp: gainXp,
		gainCredits: gainCredits,
		gainItem: gainItem,
		startMission: function (id) {
			var m = MISSIONS.find(function (x) { return x.id === id; });
			if (m) startMission(m);
		},
		missions: function () { return MISSIONS.slice(); }
	};
})();
