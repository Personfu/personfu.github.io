/* CyberWorld NET — real multiplayer backbone for the CyberWorld MMORPG.
 *
 * Turns the solo gameplay layer (gameplay.js, state key `cw.operative.v1`) into a
 * persistent, shared grid backed by Supabase:
 *   - Cloud-synced operative profile (level / xp / credits / missions), anti-cheat
 *     clamped server-side via the cw_sync_operative RPC.
 *   - Realtime presence: every connected operative appears on the live grid roster,
 *     driving a real "OPS ONLINE" count (replaces the hardcoded topbar number).
 *   - Global + faction chat (persisted, delivered live via Postgres change streams).
 *   - Global leaderboard and a live mission-completion feed.
 *   - Server-catalogued achievements, evaluated client-side and awarded idempotently.
 *
 * Framework-free and fully defensive: any failure degrades to solo mode and never
 * throws into the compiled Next.js bundle. Sets window.__cwMultiplayerOnline so the
 * existing augment.js status pill flips to GRID ONLINE automatically.
 */
(function () {
	'use strict';
	if (window.__cwNetLoaded) return;
	window.__cwNetLoaded = true;

	// ---------------------------------------------------------------- config
	var CONFIG = {
		url: 'https://byjiuxpljjgnejwrhtnq.supabase.co',
		anonKey: 'sb_publishable_bvW5FctJrdM3jGdbW6QOiw_klgzmfvy',
		esm: [
			'https://esm.sh/@supabase/supabase-js@2.45.4',
			'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'
		],
		syncEveryMs: 20000,
		heartbeatMs: 45000,
		leaderboardMs: 30000,
		presenceAwayMs: 90000,
		opStateKey: 'cw.operative.v1',
		netStateKey: 'cw.net.v1',
		deviceKey: 'cw.device.v1'
	};

	var FACTIONS = {
		GHOSTNET: { label: 'GhostNet',  color: '#00ffcc', blurb: 'Silent infiltration & recon.' },
		IRONWALL: { label: 'IronWall',  color: '#4db5ff', blurb: 'Defense, hardening, blue team.' },
		NULLSEC:  { label: 'NullSec',   color: '#ff2bd6', blurb: 'Exploit dev & offensive research.' },
		DAEMON:   { label: 'Daemon',    color: '#ffb454', blurb: 'Automation, malware analysis.' },
		NEUTRAL:  { label: 'Unaligned', color: '#c0c0c0', blurb: 'No allegiance declared.' }
	};

	// ---------------------------------------------------------------- utils
	function $(sel, root) { return (root || document).querySelector(sel); }
	function el(tag, cls, txt) {
		var e = document.createElement(tag);
		if (cls) e.className = cls;
		if (txt != null) e.textContent = txt;
		return e;
	}
	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function clampInt(v, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
	function timeAgo(iso) {
		var t = new Date(iso).getTime();
		if (isNaN(t)) return '';
		var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
		if (s < 60) return s + 's';
		if (s < 3600) return Math.floor(s / 60) + 'm';
		if (s < 86400) return Math.floor(s / 3600) + 'h';
		return Math.floor(s / 86400) + 'd';
	}
	function loadJSON(key, fallback) {
		try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
		catch (e) { return fallback; }
	}
	function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

	function deviceId() {
		var d = localStorage.getItem(CONFIG.deviceKey);
		if (d && d.length >= 8) return d;
		var rnd;
		try { rnd = crypto.randomUUID(); }
		catch (e) { rnd = 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12); }
		d = 'cwd-' + rnd;
		try { localStorage.setItem(CONFIG.deviceKey, d); } catch (e) {}
		return d;
	}

	// ---------------------------------------------------------------- local operative view
	// Reads the solo gameplay save so cloud identity stays unified with the game.
	function readOperative() {
		var g = loadJSON(CONFIG.opStateKey, null);
		var net = loadJSON(CONFIG.netStateKey, {});
		var completed = (g && g.completed) ? Object.keys(g.completed).length : 0;
		return {
			callsign: (g && g.callsign) || net.callsign || ('OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000)),
			faction: net.faction || 'GHOSTNET',
			level: clampInt(g && g.level, 1, 999) || 1,
			xp: clampInt(g && g.xp, 0, 100000000),
			credits: clampInt(g && g.credits, 0, 100000000) || 0,
			missions: completed
		};
	}
	function writeCallsign(cs) {
		var g = loadJSON(CONFIG.opStateKey, null);
		if (g) { g.callsign = cs; saveJSON(CONFIG.opStateKey, g); }
		var net = loadJSON(CONFIG.netStateKey, {});
		net.callsign = cs; saveJSON(CONFIG.netStateKey, net);
	}
	function writeFaction(f) {
		var net = loadJSON(CONFIG.netStateKey, {});
		net.faction = f; saveJSON(CONFIG.netStateKey, net);
	}

	// ---------------------------------------------------------------- runtime state
	var NET = {
		sb: null,
		device: deviceId(),
		online: false,
		roster: [],          // presence roster
		leaderboard: [],
		me: readOperative(),
		gridChan: null,
		chatChan: null,
		missionChan: null,
		activeChannel: 'GLOBAL',
		achieved: loadJSON('cw.net.achievements', {}) || {},
		lastCompletedKeys: null,
		booted: false
	};

	// ---------------------------------------------------------------- toast
	function toast(msg, kind) {
		var host = $('#cwnet-toasts');
		if (!host) { host = el('div'); host.id = 'cwnet-toasts'; document.body.appendChild(host); }
		var t = el('div', 'cwnet-toast' + (kind ? ' ' + kind : ''));
		t.innerHTML = msg;
		host.appendChild(t);
		setTimeout(function () { t.classList.add('out'); }, 3600);
		setTimeout(function () { t.remove(); }, 4200);
	}

	// ---------------------------------------------------------------- Supabase loader
	function loadSupabase(i) {
		i = i || 0;
		if (i >= CONFIG.esm.length) return Promise.reject(new Error('supabase-js unavailable'));
		return import(/* webpackIgnore: true */ CONFIG.esm[i]).catch(function () { return loadSupabase(i + 1); });
	}

	// ---------------------------------------------------------------- boot
	// React hydration can replace <body> children after we mount, wiping the HUD.
	// Re-assert our nodes on an interval + on DOM mutations (mirrors gameplay.js).
	function ensureMounted() {
		if (!document.body) return;
		mountDock();
		mountPanel();
		bindTopbar();
		paintTopbar();
	}

	function boot() {
		if (NET.booted) return;
		NET.booted = true;
		ensureMounted();

		loadSupabase().then(function (mod) {
			var createClient = mod.createClient;
			NET.sb = createClient(CONFIG.url, CONFIG.anonKey, {
				auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
				realtime: { params: { eventsPerSecond: 8 } }
			});
			// Best-effort anonymous identity for account linking; ignore if disabled.
			return NET.sb.auth.getSession().then(function (res) {
				if (res && res.data && res.data.session) return;
				return NET.sb.auth.signInAnonymously().catch(function () {});
			});
		}).then(function () {
			return syncOperative();
		}).then(function () {
			setOnline(true);
			award('first_login');
			joinPresence();
			subscribeChat();
			subscribeMissions();
			refreshLeaderboard();
			startTimers();
			toast('&#x1F50C; Connected to the CyberWorld grid', 'ok');
		}).catch(function (err) {
			setOnline(false);
			try { console.warn('[cw-net] solo fallback:', err && err.message); } catch (e) {}
			// Keep leaderboard/chat panels usable in read-only if REST is reachable later.
			toast('&#x26A0; Grid offline &mdash; running in solo mode', 'warn');
		});
	}

	function setOnline(on) {
		NET.online = on;
		window.__cwMultiplayerOnline = on;
		paintStatus();
	}
	function paintStatus() {
		var on = NET.online;
		var dot = $('#cwnet-dock .cwnet-dot');
		if (dot) dot.dataset.on = on ? '1' : '0';
		[$('#cwnet-badge'), $('#cwnet-grid-pill')].forEach(function (st) {
			if (!st) return;
			st.textContent = on ? 'GRID ONLINE' : 'SOLO MODE';
			st.dataset.on = on ? '1' : '0';
		});
		paintTopbar();
	}

	// ---------------------------------------------------------------- RPC helpers
	function rpc(fn, args) {
		if (!NET.sb) return Promise.reject(new Error('no client'));
		return NET.sb.rpc(fn, args).then(function (res) {
			if (res.error) throw res.error;
			return res.data;
		});
	}

	function syncOperative() {
		NET.me = readOperative();
		return rpc('cw_sync_operative', {
			p_device_id: NET.device,
			p_callsign: NET.me.callsign,
			p_faction: NET.me.faction,
			p_level: NET.me.level,
			p_xp: NET.me.xp,
			p_credits: NET.me.credits,
			p_missions: NET.me.missions
		}).then(function (row) {
			if (row) {
				NET.me.rank = row.rank_title;
				NET.me.level = row.level; NET.me.xp = row.xp;
				NET.me.credits = row.credits; NET.me.missions = row.missions_completed;
			}
			evaluateAchievements();
			renderIdentity();
			if (NET.gridChan) trackPresence();
			return row;
		});
	}

	function heartbeat() {
		if (!NET.online) return;
		rpc('cw_touch_operative', { p_device_id: NET.device }).catch(function () {});
	}

	// ---------------------------------------------------------------- presence
	function presenceMeta() {
		return {
			device: NET.device,
			callsign: NET.me.callsign,
			faction: NET.me.faction,
			level: NET.me.level,
			rank: NET.me.rank || 'ROOKIE',
			at: Date.now()
		};
	}
	function trackPresence() {
		try { NET.gridChan.track(presenceMeta()); } catch (e) {}
	}
	function joinPresence() {
		var chan = NET.sb.channel('cw:grid', { config: { presence: { key: NET.device } } });
		chan.on('presence', { event: 'sync' }, function () {
			var stateMap = chan.presenceState();
			var list = [];
			Object.keys(stateMap).forEach(function (k) {
				var metas = stateMap[k];
				if (metas && metas.length) list.push(metas[metas.length - 1]);
			});
			list.sort(function (a, b) { return (b.level || 0) - (a.level || 0); });
			NET.roster = list;
			renderRoster();
			paintTopbar();
		});
		chan.subscribe(function (status) {
			if (status === 'SUBSCRIBED') { NET.gridChan = chan; trackPresence(); }
		});
	}

	// ---------------------------------------------------------------- chat
	function subscribeChat() {
		var chan = NET.sb.channel('cw:chat')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cw_chat' }, function (payload) {
				appendChat(payload.new, true);
			})
			.subscribe(function (status) { if (status === 'SUBSCRIBED') NET.chatChan = chan; });
		// Backfill recent history for the active channel.
		fetchChatHistory();
	}
	function fetchChatHistory() {
		if (!NET.sb) return;
		var q = NET.sb.from('cw_chat').select('*').order('created_at', { ascending: false }).limit(40);
		if (NET.activeChannel !== 'GLOBAL') q = q.eq('channel', NET.activeChannel);
		q.then(function (res) {
			var feed = $('#cwnet-chat-feed');
			if (!feed || !res.data) return;
			feed.innerHTML = '';
			res.data.reverse().forEach(function (m) { appendChat(m, false); });
			feed.scrollTop = feed.scrollHeight;
		});
	}
	function appendChat(m, live) {
		if (!m) return;
		if (NET.activeChannel !== 'GLOBAL' && m.channel !== NET.activeChannel) return;
		var feed = $('#cwnet-chat-feed');
		if (!feed) return;
		var fc = (FACTIONS[m.faction] || FACTIONS.NEUTRAL).color;
		var line = el('div', 'cwnet-msg' + (m.device_id === NET.device ? ' me' : ''));
		line.innerHTML =
			'<span class="cwnet-msg-cs" style="color:' + fc + '">' + esc(m.callsign) + '</span>' +
			(m.channel && m.channel !== 'GLOBAL' ? '<span class="cwnet-msg-ch">#' + esc(m.channel) + '</span>' : '') +
			'<span class="cwnet-msg-body">' + esc(m.body) + '</span>';
		var atEnd = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
		feed.appendChild(line);
		while (feed.childElementCount > 120) feed.removeChild(feed.firstChild);
		if (atEnd || !live) feed.scrollTop = feed.scrollHeight;
	}
	function sendChat() {
		var input = $('#cwnet-chat-input');
		if (!input) return;
		var body = input.value.trim();
		if (!body) return;
		if (!NET.online) { toast('Grid offline &mdash; message not sent', 'warn'); return; }
		input.value = '';
		rpc('cw_post_chat', {
			p_device_id: NET.device,
			p_callsign: NET.me.callsign,
			p_faction: NET.me.faction,
			p_channel: NET.activeChannel,
			p_body: body
		}).then(function () { award('chatter'); })
		  .catch(function (e) {
			var msg = (e && e.message) || '';
			toast(/rate/i.test(msg) ? 'Slow down, operative' : 'Message failed', 'warn');
			input.value = body;
		});
	}

	// ---------------------------------------------------------------- mission feed
	function subscribeMissions() {
		var chan = NET.sb.channel('cw:missions')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cw_mission_log' }, function (payload) {
				prependMission(payload.new, true);
			})
			.subscribe(function (status) { if (status === 'SUBSCRIBED') NET.missionChan = chan; });
		NET.sb.from('cw_mission_log').select('*').order('created_at', { ascending: false }).limit(25)
			.then(function (res) {
				var feed = $('#cwnet-ops-feed');
				if (!feed || !res.data) return;
				feed.innerHTML = '';
				res.data.forEach(function (m) { prependMission(m, false); });
			});
	}
	function prependMission(m, live) {
		var feed = $('#cwnet-ops-feed');
		if (!feed || !m) return;
		var row = el('div', 'cwnet-ops-row');
		row.innerHTML =
			'<span class="cwnet-ops-cs">' + esc(m.callsign) + '</span>' +
			'<span class="cwnet-ops-name">' + esc(m.mission_name || m.mission_id) + '</span>' +
			'<span class="cwnet-ops-xp">+' + clampInt(m.xp_awarded, 0, 100000) + ' XP</span>' +
			'<span class="cwnet-ops-t">' + timeAgo(m.created_at) + '</span>';
		feed.insertBefore(row, feed.firstChild);
		while (feed.childElementCount > 40) feed.removeChild(feed.lastChild);
		if (live && m.device_id !== NET.device) toast('&#x1F4E1; ' + esc(m.callsign) + ' cleared <b>' + esc(m.mission_name || m.mission_id) + '</b>');
	}
	function logMission(id, name, xp) {
		if (!NET.online) return;
		rpc('cw_log_mission', {
			p_device_id: NET.device, p_callsign: NET.me.callsign,
			p_mission_id: id, p_mission_name: name || id, p_xp: xp || 0
		}).catch(function () {});
	}

	// ---------------------------------------------------------------- leaderboard
	function refreshLeaderboard() {
		if (!NET.sb) return;
		NET.sb.from('cw_operatives')
			.select('callsign,faction,level,xp,credits,missions_completed,rank_title,last_seen')
			.order('level', { ascending: false }).order('xp', { ascending: false }).limit(25)
			.then(function (res) {
				if (res.error || !res.data) return;
				NET.leaderboard = res.data;
				renderLeaderboard();
			});
	}

	// ---------------------------------------------------------------- achievements
	var ACH_RULES = [
		{ code: 'level_5', test: function (m) { return m.level >= 5; } },
		{ code: 'level_10', test: function (m) { return m.level >= 10; } },
		{ code: 'level_20', test: function (m) { return m.level >= 20; } },
		{ code: 'missions_10', test: function (m) { return m.missions >= 10; } },
		{ code: 'missions_25', test: function (m) { return m.missions >= 25; } },
		{ code: 'credits_5k', test: function (m) { return m.credits >= 5000; } }
	];
	function evaluateAchievements() {
		ACH_RULES.forEach(function (r) { if (r.test(NET.me)) award(r.code); });
	}
	function award(code) {
		if (NET.achieved[code]) return;
		NET.achieved[code] = Date.now();
		saveJSON('cw.net.achievements', NET.achieved);
		if (NET.online) rpc('cw_award_achievement', { p_device_id: NET.device, p_code: code }).catch(function () {});
		var meta = ACH_META[code];
		toast('&#x1F3C5; Achievement: <b>' + esc(meta ? meta.name : code) + '</b>', 'ok');
		renderAchievements();
	}
	var ACH_META = {
		first_login: { icon: '🔌', name: 'GRID JACK-IN' },
		first_mission: { icon: '💥', name: 'FIRST BREACH' },
		level_5: { icon: '🎖️', name: 'FIELD AGENT' },
		level_10: { icon: '🥈', name: 'SEASONED OPERATIVE' },
		level_20: { icon: '🥇', name: 'GRID ELITE' },
		missions_10: { icon: '📟', name: 'TASK RUNNER' },
		missions_25: { icon: '👻', name: 'GHOST IN THE WIRE' },
		chatter: { icon: '📡', name: 'SIGNAL SENDER' },
		credits_5k: { icon: '💳', name: 'CREDIT BARON' },
		streak_7: { icon: '🔥', name: 'ALWAYS ONLINE' }
	};

	// ---------------------------------------------------------------- gameplay bridge
	// Poll the solo save; when progress changes, sync + emit mission-feed events.
	function watchGameplay() {
		var cur = readOperative();
		var g = loadJSON(CONFIG.opStateKey, null);
		var keys = (g && g.completed) ? Object.keys(g.completed) : [];
		if (NET.lastCompletedKeys === null) { NET.lastCompletedKeys = keys.slice(); }

		var changed = cur.level !== NET.me.level || cur.xp !== NET.me.xp ||
			cur.credits !== NET.me.credits || cur.missions !== NET.me.missions ||
			cur.callsign !== NET.me.callsign || cur.faction !== NET.me.faction;

		// Detect newly completed missions for the global feed.
		var fresh = keys.filter(function (k) { return NET.lastCompletedKeys.indexOf(k) === -1; });
		NET.lastCompletedKeys = keys.slice();

		if (changed || fresh.length) {
			var prevMissions = NET.me.missions;
			NET.me = cur;
			syncOperative().then(function () {
				if (cur.missions === 1 && prevMissions === 0) award('first_mission');
				fresh.forEach(function (k) {
					var m = resolveMission(k);
					logMission(k, m.name, m.xp);
				});
			}).catch(function () {});
		}
	}
	function resolveMission(id) {
		try {
			var acad = window.__cwAcademy && window.__cwAcademy.challengeName ? window.__cwAcademy.challengeName(id) : null;
			if (acad) return { name: acad, xp: 0 };
		} catch (e) {}
		try {
			var list = window.__cwGameplay && window.__cwGameplay.missions ? window.__cwGameplay.missions() : [];
			var found = list.filter(function (x) { return x.id === id; })[0];
			if (found) return { name: found.title, xp: (found.reward && found.reward.xp) || 0 };
		} catch (e) {}
		return { name: id, xp: 0 };
	}

	// ---------------------------------------------------------------- timers
	function startTimers() {
		setInterval(syncOperative, CONFIG.syncEveryMs);
		setInterval(heartbeat, CONFIG.heartbeatMs);
		setInterval(refreshLeaderboard, CONFIG.leaderboardMs);
		setInterval(watchGameplay, 3000);
		document.addEventListener('visibilitychange', function () {
			if (!document.hidden && NET.online) { heartbeat(); trackPresence(); }
		});
		window.addEventListener('beforeunload', function () {
			try { if (NET.gridChan) NET.gridChan.untrack(); } catch (e) {}
		});
	}

	// ---------------------------------------------------------------- topbar integration
	var topbarOps = null;
	function bindTopbar() {
		// The compiled bundle renders ".cw-status .pill" nodes: clock, OPS ONLINE, probe.
		// Hydration may replace these, so re-locate our references idempotently.
		if (topbarOps && !topbarOps.isConnected) topbarOps = null;
		var gridPill = $('#cwnet-grid-pill');
		if (gridPill && !gridPill.isConnected) gridPill = null;
		if (topbarOps && gridPill) return;
		var pills = document.querySelectorAll('.cw-status .pill');
		pills.forEach(function (p) {
			var txt = (p.textContent || '');
			if (/OPS ONLINE/i.test(txt)) topbarOps = p;
			if ((/PROBING GRID/i.test(txt) || /GRID ONLINE|SOLO MODE|LINKING/i.test(txt)) && !p.id) {
				p.id = 'cwnet-grid-pill';
				p.textContent = NET.online ? 'GRID ONLINE' : 'LINKING...';
				p.dataset.on = NET.online ? '1' : '0';
			}
		});
	}
	function paintTopbar() {
		if (!topbarOps) return;
		var count = NET.roster.length || (NET.online ? 1 : 0);
		topbarOps.textContent = 'OPS ONLINE: ' + count.toLocaleString();
	}

	// ---------------------------------------------------------------- UI: dock + panel
	function mountDock() {
		if ($('#cwnet-dock')) return;
		var dock = el('div'); dock.id = 'cwnet-dock';
		dock.innerHTML =
			'<span class="cwnet-dot" data-on="0"></span>' +
			'<span class="cwnet-dock-label">NET</span>' +
			'<span class="cwnet-dock-count" id="cwnet-dock-count">GRID</span>';
		dock.title = 'CyberWorld NET — grid, chat, ranks (N)';
		dock.addEventListener('click', togglePanel);
		document.body.appendChild(dock);
		document.addEventListener('keydown', function (e) {
			if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
			if (e.key === 'n' || e.key === 'N') { e.preventDefault(); togglePanel(); }
		});
	}

	var TABS = [
		{ id: 'grid', label: 'GRID' },
		{ id: 'chat', label: 'CHAT' },
		{ id: 'ranks', label: 'RANKS' },
		{ id: 'ops', label: 'OPS' },
		{ id: 'you', label: 'YOU' }
	];
	function mountPanel() {
		if ($('#cwnet-panel')) return;
		var p = el('div'); p.id = 'cwnet-panel'; p.dataset.tab = 'grid'; p.style.display = 'none';
		var tabsHtml = TABS.map(function (t) {
			return '<button class="cwnet-tab" data-tab="' + t.id + '">' + t.label + '</button>';
		}).join('');
		p.innerHTML =
			'<div class="cwnet-titlebar">' +
				'<span class="cwnet-title">&#x1F310; CYBERWORLD NET</span>' +
				'<span class="cwnet-badge" id="cwnet-badge" data-on="0">LINKING...</span>' +
				'<button class="cwnet-x" title="Close (N)">&#x2715;</button>' +
			'</div>' +
			'<div class="cwnet-tabs">' + tabsHtml + '</div>' +
			'<div class="cwnet-views">' +
				'<div class="cwnet-view" data-view="grid"><div class="cwnet-roster" id="cwnet-roster"></div></div>' +
				'<div class="cwnet-view" data-view="chat">' +
					'<div class="cwnet-chan" id="cwnet-chan"></div>' +
					'<div class="cwnet-chat-feed" id="cwnet-chat-feed"></div>' +
					'<div class="cwnet-chat-bar">' +
						'<input id="cwnet-chat-input" maxlength="280" placeholder="transmit to the grid..." autocomplete="off">' +
						'<button id="cwnet-chat-send">SEND</button>' +
					'</div>' +
				'</div>' +
				'<div class="cwnet-view" data-view="ranks"><div class="cwnet-board" id="cwnet-board"></div></div>' +
				'<div class="cwnet-view" data-view="ops"><div class="cwnet-ops-feed" id="cwnet-ops-feed"></div></div>' +
				'<div class="cwnet-view" data-view="you"><div class="cwnet-you" id="cwnet-you"></div></div>' +
			'</div>';
		document.body.appendChild(p);

		p.querySelector('.cwnet-x').addEventListener('click', function () { togglePanel(false); });
		p.querySelectorAll('.cwnet-tab').forEach(function (b) {
			b.addEventListener('click', function () { switchTab(b.dataset.tab); });
		});
		$('#cwnet-chat-send').addEventListener('click', sendChat);
		$('#cwnet-chat-input').addEventListener('keydown', function (e) {
			if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
			e.stopPropagation();
		});
		buildChannelBar();
		renderIdentity();
		switchTab('grid');
		makeDraggable(p, p.querySelector('.cwnet-titlebar'));
	}

	function buildChannelBar() {
		var bar = $('#cwnet-chan');
		if (!bar) return;
		var chans = ['GLOBAL', 'GHOSTNET', 'IRONWALL', 'NULLSEC', 'DAEMON', 'MISSION'];
		bar.innerHTML = '';
		chans.forEach(function (c) {
			var b = el('button', 'cwnet-chan-btn' + (c === NET.activeChannel ? ' active' : ''), '#' + c);
			b.addEventListener('click', function () {
				NET.activeChannel = c;
				bar.querySelectorAll('.cwnet-chan-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
				fetchChatHistory();
			});
			bar.appendChild(b);
		});
	}

	function togglePanel(force) {
		var p = $('#cwnet-panel'); if (!p) return;
		var show = force === undefined ? p.style.display === 'none' : force;
		p.style.display = show ? 'flex' : 'none';
		if (show) { refreshLeaderboard(); if (p.dataset.tab === 'chat') fetchChatHistory(); }
	}
	function switchTab(id) {
		var p = $('#cwnet-panel'); if (!p) return;
		p.dataset.tab = id;
		p.querySelectorAll('.cwnet-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
		p.querySelectorAll('.cwnet-view').forEach(function (v) { v.classList.toggle('active', v.dataset.view === id); });
		if (id === 'ranks') refreshLeaderboard();
		if (id === 'chat') { fetchChatHistory(); setTimeout(function () { var i = $('#cwnet-chat-input'); if (i) i.focus(); }, 30); }
		if (id === 'grid') renderRoster();
		if (id === 'you') renderIdentity();
	}

	// ---------------------------------------------------------------- renders
	function factionTag(f) {
		var fx = FACTIONS[f] || FACTIONS.NEUTRAL;
		return '<span class="cwnet-fac" style="color:' + fx.color + ';border-color:' + fx.color + '">' + fx.label + '</span>';
	}
	function renderRoster() {
		var host = $('#cwnet-roster'); if (!host) return;
		if (!NET.roster.length) {
			host.innerHTML = '<div class="cwnet-empty">' + (NET.online ? 'Scanning the grid&hellip;' : 'Grid offline &mdash; solo mode.') + '</div>';
			return;
		}
		host.innerHTML = '<div class="cwnet-roster-head">' + NET.roster.length + ' OPERATIVE' + (NET.roster.length === 1 ? '' : 'S') + ' ONLINE</div>';
		NET.roster.forEach(function (o) {
			var row = el('div', 'cwnet-roster-row' + (o.device === NET.device ? ' me' : ''));
			row.innerHTML =
				'<span class="cwnet-r-lvl">L' + clampInt(o.level, 1, 999) + '</span>' +
				'<span class="cwnet-r-cs">' + esc(o.callsign) + '</span>' +
				factionTag(o.faction) +
				'<span class="cwnet-r-rank">' + esc(o.rank || '') + '</span>';
			host.appendChild(row);
		});
	}
	function renderLeaderboard() {
		var host = $('#cwnet-board'); if (!host) return;
		if (!NET.leaderboard.length) { host.innerHTML = '<div class="cwnet-empty">No ranked operatives yet. Be the first.</div>'; return; }
		var head = el('div', 'cwnet-board-head');
		head.innerHTML = '<span>#</span><span>OPERATIVE</span><span>LVL</span><span>XP</span><span>MISS</span>';
		host.innerHTML = ''; host.appendChild(head);
		NET.leaderboard.forEach(function (o, i) {
			var row = el('div', 'cwnet-board-row' + (o.callsign === NET.me.callsign ? ' me' : ''));
			var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
			row.innerHTML =
				'<span class="cwnet-b-rank">' + medal + '</span>' +
				'<span class="cwnet-b-cs">' + esc(o.callsign) + ' ' + factionTag(o.faction) + '</span>' +
				'<span class="cwnet-b-lvl">' + clampInt(o.level, 1, 999) + '</span>' +
				'<span class="cwnet-b-xp">' + clampInt(o.xp, 0, 1e9).toLocaleString() + '</span>' +
				'<span class="cwnet-b-miss">' + clampInt(o.missions_completed, 0, 1e6) + '</span>';
			host.appendChild(row);
		});
	}
	function renderIdentity() {
		var host = $('#cwnet-you'); if (!host) return;
		var fx = FACTIONS[NET.me.faction] || FACTIONS.NEUTRAL;
		var facBtns = Object.keys(FACTIONS).filter(function (k) { return k !== 'NEUTRAL'; }).map(function (k) {
			var f = FACTIONS[k];
			return '<button class="cwnet-fac-pick' + (k === NET.me.faction ? ' active' : '') + '" data-fac="' + k + '" ' +
				'style="border-color:' + f.color + ';color:' + f.color + '"><b>' + f.label + '</b><small>' + f.blurb + '</small></button>';
		}).join('');
		host.innerHTML =
			'<div class="cwnet-id-card">' +
				'<div class="cwnet-id-top">' +
					'<div class="cwnet-id-av" style="border-color:' + fx.color + '">' + esc((NET.me.callsign || 'O').charAt(0).toUpperCase()) + '</div>' +
					'<div class="cwnet-id-main">' +
						'<div class="cwnet-id-cs">' + esc(NET.me.callsign) + '</div>' +
						'<div class="cwnet-id-sub">' + esc(NET.me.rank || 'ROOKIE') + ' &middot; ' + fx.label + '</div>' +
					'</div>' +
				'</div>' +
				'<div class="cwnet-id-stats">' +
					'<span>LVL<b>' + NET.me.level + '</b></span>' +
					'<span>XP<b>' + clampInt(NET.me.xp, 0, 1e9).toLocaleString() + '</b></span>' +
					'<span>CR<b>' + clampInt(NET.me.credits, 0, 1e9).toLocaleString() + '</b></span>' +
					'<span>MISS<b>' + NET.me.missions + '</b></span>' +
				'</div>' +
			'</div>' +
			'<div class="cwnet-id-row"><label>CALLSIGN</label>' +
				'<input id="cwnet-cs-input" maxlength="24" value="' + esc(NET.me.callsign) + '" autocomplete="off">' +
				'<button id="cwnet-cs-save">SET</button></div>' +
			'<div class="cwnet-id-facs-label">DECLARE FACTION</div>' +
			'<div class="cwnet-id-facs">' + facBtns + '</div>' +
			'<div class="cwnet-id-facs-label">ACHIEVEMENTS</div>' +
			'<div class="cwnet-ach" id="cwnet-ach"></div>';
		var csInput = $('#cwnet-cs-input');
		csInput.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') saveCallsign(); });
		$('#cwnet-cs-save').addEventListener('click', saveCallsign);
		host.querySelectorAll('.cwnet-fac-pick').forEach(function (b) {
			b.addEventListener('click', function () { pickFaction(b.dataset.fac); });
		});
		renderAchievements();
	}
	function renderAchievements() {
		var host = $('#cwnet-ach'); if (!host) return;
		host.innerHTML = '';
		Object.keys(ACH_META).forEach(function (code) {
			var m = ACH_META[code];
			var got = !!NET.achieved[code];
			var b = el('div', 'cwnet-ach-badge' + (got ? ' got' : ''));
			b.title = m.name + (got ? ' — unlocked' : ' — locked');
			b.innerHTML = '<span class="cwnet-ach-ic">' + m.icon + '</span><span class="cwnet-ach-nm">' + esc(m.name) + '</span>';
			host.appendChild(b);
		});
	}
	function saveCallsign() {
		var input = $('#cwnet-cs-input'); if (!input) return;
		var cs = input.value.trim().slice(0, 24);
		if (cs.length < 2) { toast('Callsign too short', 'warn'); return; }
		writeCallsign(cs);
		NET.me.callsign = cs;
		syncOperative();
		toast('Callsign set to <b>' + esc(cs) + '</b>', 'ok');
	}
	function pickFaction(f) {
		writeFaction(f);
		NET.me.faction = f;
		renderIdentity();
		syncOperative();
		toast('Faction: <b>' + esc((FACTIONS[f] || {}).label || f) + '</b>', 'ok');
	}

	// ---------------------------------------------------------------- drag
	function makeDraggable(win, handle) {
		var down = false, dx = 0, dy = 0;
		handle.addEventListener('mousedown', function (e) {
			if (e.target.closest('.cwnet-x')) return;
			down = true; dx = e.clientX - win.offsetLeft; dy = e.clientY - win.offsetTop; e.preventDefault();
		});
		document.addEventListener('mousemove', function (e) {
			if (!down) return;
			win.style.left = Math.max(0, Math.min(e.clientX - dx, window.innerWidth - 60)) + 'px';
			win.style.top = Math.max(0, Math.min(e.clientY - dy, window.innerHeight - 40)) + 'px';
			win.style.right = 'auto'; win.style.bottom = 'auto';
		});
		document.addEventListener('mouseup', function () { down = false; });
	}

	// ---------------------------------------------------------------- public API
	window.__cwNet = {
		state: function () { return JSON.parse(JSON.stringify({ me: NET.me, online: NET.online, roster: NET.roster.length })); },
		open: function () { togglePanel(true); },
		close: function () { togglePanel(false); },
		sync: syncOperative,
		logMission: logMission,
		award: award,
		leaderboard: function () { return NET.leaderboard.slice(); }
	};

	// ---------------------------------------------------------------- start
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot, { once: true });
	} else { boot(); }
	window.addEventListener('load', boot, { once: true });
	setTimeout(boot, 1500);

	// Survive React hydration / DOM churn: keep the HUD mounted and status painted.
	setInterval(function () { if (NET.booted) { ensureMounted(); paintStatus(); } }, 1500);
	try {
		new MutationObserver(function () {
			if (NET.booted && !$('#cwnet-dock')) { ensureMounted(); paintStatus(); }
		}).observe(document.documentElement, { childList: true, subtree: true });
	} catch (e) {}
})();
