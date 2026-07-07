/* CyberWorld onboarding: live account gate, character creator, intro movie, and optional first quest. */
(function () {
	'use strict';
	if (window.__cwOnboardingLoaded) return;
	window.__cwOnboardingLoaded = true;

	var SAVE_KEY = 'cw.operative.v1';
	var NET_KEY = 'cw.net.v1';
	var ONBOARD_KEY = 'cw.onboarding.v1';
	var PATHS = {
		sentinel: {
			label: 'Iron Sentinel',
			faction: 'IRONWALL',
			suit: '#4db5ff',
			accent: '#00ffcc',
			desc: 'Defender path: shields, hardening, incident response, and holding the line.'
		},
		ghost: {
			label: 'Ghost Analyst',
			faction: 'GHOSTNET',
			suit: '#00ffcc',
			accent: '#ff2bd6',
			desc: 'Recon path: evidence, OSINT, traffic analysis, and quiet route control.'
		},
		runner: {
			label: 'Null Runner',
			faction: 'NULLSEC',
			suit: '#ff2bd6',
			accent: '#fcee09',
			desc: 'Research path: exploit labs, adversary thinking, and controlled breach drills.'
		},
		tinker: {
			label: 'Daemon Tinker',
			faction: 'DAEMON',
			suit: '#ffb454',
			accent: '#7CFF6B',
			desc: 'Automation path: malware triage, scripts, sensors, and tool-building.'
		}
	};
	var HAIR = ['#101827', '#29140f', '#ccd6e0', '#111111'];
	var CINEMATIC = [
		{
			title: 'The Grid Was Built To Protect Us',
			body: 'CyberWorld began as a living defensive network. Cities, stations, and orbital relays shared one shield: the FLLC Grid.'
		},
		{
			title: 'Then The Null Crown Woke Up',
			body: 'A hostile intelligence rose inside dead infrastructure. It corrupts routers, turns daemons into hunters, and eats identity records for fuel.'
		},
		{
			title: 'The Stormcore Overseer Controls The Blackout',
			body: 'Every sector you reclaim cuts one artery from the Overseer. Every lesson, route, and mission is part of the same war.'
		},
		{
			title: 'Professor Cipher Opens City Gate',
			body: 'You start with nothing: no rank, no items, no credits. Learn the first defensive operation, earn starter gear, then choose how deep to go.'
		}
	];

	var state = {
		step: 'auth',
		authMode: 'signup',
		path: 'ghost',
		hair: HAIR[0],
		callsign: '',
		cinema: 0,
		message: ''
	};
	var root = null;

	function $(sel, host) { return (host || document).querySelector(sel); }
	function $all(sel, host) { return Array.prototype.slice.call((host || document).querySelectorAll(sel)); }
	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function loadJSON(key, fallback) {
		try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
		catch (e) { return fallback; }
	}
	function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
	function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
	function onboardingDone() { return !!(loadJSON(ONBOARD_KEY, {}) || {}).complete; }
	function netAuth() {
		try { return window.__cwNet && window.__cwNet.authState ? window.__cwNet.authState() : { ready: false, online: false }; }
		catch (e) { return { ready: false, online: false }; }
	}
	function netSync() {
		try { if (window.__cwNet && window.__cwNet.sync) window.__cwNet.sync(); } catch (e) {}
	}
	function currentProfile() {
		var op = loadJSON(SAVE_KEY, {}) || {};
		var net = loadJSON(NET_KEY, {}) || {};
		return {
			callsign: op.callsign || net.callsign || '',
			path: (op.flags && op.flags.path) || net.path || state.path,
			look: op.look || net.look || null
		};
	}
	function setNetProfile(profile) {
		var net = loadJSON(NET_KEY, {}) || {};
		net.callsign = profile.callsign;
		net.faction = PATHS[profile.path].faction;
		net.path = profile.path;
		net.look = profile.look;
		saveJSON(NET_KEY, net);
		netSync();
	}
	function profileFromState() {
		var path = PATHS[state.path] || PATHS.ghost;
		var callsign = (state.callsign || '').trim().slice(0, 24) || ('OPERATIVE-' + Math.floor(Math.random() * 9000 + 1000));
		return {
			callsign: callsign,
			path: state.path,
			origin: 'city-gate',
			look: {
				suit: path.suit,
				accent: path.accent,
				hair: state.hair,
				frame: state.path
			}
		};
	}
	function mount() {
		if (!document.body) return;
		if (!root || !root.isConnected) {
			root = document.getElementById('cwo-root') || root;
		}
		if (!root) {
			root = document.createElement('div');
			root.id = 'cwo-root';
		}
		if (!root.isConnected) {
			document.body.appendChild(root);
		}
		if (!document.getElementById('cwo-reopen')) {
			var btn = document.createElement('button');
			btn.id = 'cwo-reopen';
			btn.type = 'button';
			btn.textContent = 'ORIGIN';
			btn.addEventListener('click', function () { open('auth'); });
			document.body.appendChild(btn);
		}
		if (!onboardingDone()) {
			var existing = currentProfile();
			state.callsign = existing.callsign || state.callsign;
			if (existing.path && PATHS[existing.path]) state.path = existing.path;
			if (existing.look && existing.look.hair) state.hair = existing.look.hair;
			open(hasSave() ? 'creator' : 'auth');
		}
	}
	function open(step) {
		state.step = step || state.step || 'auth';
		root.classList.add('on');
		render();
	}
	function close() {
		if (root) root.classList.remove('on');
	}
	function setMessage(msg) {
		state.message = msg || '';
		render();
	}
	function render() {
		if (!root) return;
		if (!root.isConnected && document.body) document.body.appendChild(root);
		root.innerHTML =
			'<div class="cwo-backdrop" aria-hidden="true"><span></span><span></span><span></span></div>' +
			'<div class="cwo-shell" role="dialog" aria-modal="true" aria-label="CyberWorld origin">' +
				'<div class="cwo-titlebar"><b>CYBERWORLD // ORIGIN LINK</b><button id="cwo-close" type="button">EXIT</button></div>' +
				'<div class="cwo-steps">' + stepPill('auth', '1 ACCOUNT') + stepPill('creator', '2 OPERATIVE') + stepPill('cinematic', '3 SIGNAL') + stepPill('tutorial', '4 FIRST QUEST') + '</div>' +
				'<div class="cwo-body">' + renderStep() + '</div>' +
			'</div>';
		var closeBtn = $('#cwo-close', root);
		if (closeBtn) closeBtn.addEventListener('click', close);
		bindStep();
	}
	function stepPill(id, label) {
		var order = ['auth', 'creator', 'cinematic', 'tutorial'];
		var active = state.step === id;
		var done = order.indexOf(id) < order.indexOf(state.step);
		return '<span class="' + (active ? 'active' : done ? 'done' : '') + '">' + label + '</span>';
	}
	function renderStep() {
		if (state.step === 'creator') return renderCreator();
		if (state.step === 'cinematic') return renderCinematic();
		if (state.step === 'tutorial') return renderTutorial();
		return renderAuth();
	}
	function renderAuth() {
		var auth = netAuth();
		var mode = state.authMode;
		var profile = currentProfile();
		return '<section class="cwo-auth">' +
			'<div class="cwo-copy">' +
				'<h2>Enter The Grid</h2>' +
				'<p>Sign in or create a live Supabase-backed account. Guest mode still works, but it stays tied to this browser.</p>' +
				'<div class="cwo-live" data-on="' + (auth.online ? '1' : '0') + '">' + (auth.ready ? (auth.online ? 'SUPABASE LIVE' : 'SUPABASE SOLO FALLBACK') : 'LINKING SUPABASE') + '</div>' +
				(profile.callsign ? '<button class="cwo-secondary" id="cwo-resume" type="button">Resume ' + esc(profile.callsign) + '</button>' : '') +
			'</div>' +
			'<form class="cwo-card" id="cwo-auth-form">' +
				'<div class="cwo-switch"><button type="button" data-auth="signup" class="' + (mode === 'signup' ? 'active' : '') + '">SIGN UP</button><button type="button" data-auth="login" class="' + (mode === 'login' ? 'active' : '') + '">LOG IN</button></div>' +
				'<label>Email<input id="cwo-email" type="email" autocomplete="email" placeholder="operative@grid.net"></label>' +
				'<label>Password<input id="cwo-pass" type="password" autocomplete="' + (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="8+ characters"></label>' +
				'<button class="cwo-primary" type="submit">' + (mode === 'login' ? 'LOG IN LIVE' : 'CREATE LIVE ACCOUNT') + '</button>' +
				'<button class="cwo-secondary" id="cwo-guest" type="button">Continue As Guest</button>' +
				(state.message ? '<div class="cwo-msg">' + esc(state.message) + '</div>' : '') +
			'</form>' +
		'</section>';
	}
	function renderCreator() {
		var path = PATHS[state.path] || PATHS.ghost;
		var cards = Object.keys(PATHS).map(function (id) {
			var p = PATHS[id];
			return '<button class="cwo-path ' + (state.path === id ? 'active' : '') + '" type="button" data-path="' + id + '" style="--path:' + p.suit + ';--accent:' + p.accent + '">' +
				'<b>' + esc(p.label) + '</b><span>' + esc(p.desc) + '</span>' +
			'</button>';
		}).join('');
		var hair = HAIR.map(function (h) {
			return '<button type="button" class="cwo-swatch ' + (state.hair === h ? 'active' : '') + '" data-hair="' + h + '" style="--sw:' + h + '"></button>';
		}).join('');
		return '<section class="cwo-creator" data-archetype="' + esc(state.path) + '" style="--suit:' + path.suit + ';--accent:' + path.accent + ';--hair:' + state.hair + '">' +
			'<div class="cwo-avatar-stage">' + avatarMarkup() + '<div class="cwo-orbit"><i></i><i></i><i></i></div></div>' +
			'<div class="cwo-maker">' +
				'<h2>Build Your Operative</h2>' +
				'<p>Fresh run means level 1, zero XP, zero credits, and no inventory. Your first tutorial reward has to be earned.</p>' +
				'<label>Callsign<input id="cwo-callsign" maxlength="24" value="' + esc(state.callsign || '') + '" placeholder="Operative_7X" autocomplete="off"></label>' +
				'<div class="cwo-section-label">Pick Your Path</div>' +
				'<div class="cwo-paths">' + cards + '</div>' +
				'<div class="cwo-section-label">Hair / Hood Tone</div>' +
				'<div class="cwo-swatches">' + hair + '</div>' +
				'<div class="cwo-maker-actions"><button class="cwo-secondary" id="cwo-back-auth" type="button">Back</button><button class="cwo-primary" id="cwo-start-fresh" type="button">Start Fresh Operative</button></div>' +
			'</div>' +
		'</section>';
	}
	function avatarMarkup() {
		return '<div class="cwo-avatar">' +
			'<div class="cwo-av-shadow"></div><div class="cwo-av-pack"></div><div class="cwo-av-legs"><i></i><i></i></div><div class="cwo-av-arms"><i></i><i></i></div><div class="cwo-av-coat"></div><div class="cwo-av-shoulders"><i></i><i></i></div><div class="cwo-av-core"></div><div class="cwo-av-head"></div><div class="cwo-av-hair"></div><div class="cwo-av-eye"></div><div class="cwo-av-gadget"></div>' +
		'</div>';
	}
	function renderCinematic() {
		var scene = CINEMATIC[state.cinema] || CINEMATIC[0];
		return '<section class="cwo-cinema" data-scene="' + state.cinema + '">' +
			'<div class="cwo-film">' +
				'<div class="cwo-cityline"></div><div class="cwo-gridplane"></div><div class="cwo-crown"><i></i></div><div class="cwo-hero-signal"></div>' +
				'<div class="cwo-subtitle"><h2>' + esc(scene.title) + '</h2><p>' + esc(scene.body) + '</p></div>' +
			'</div>' +
			'<div class="cwo-cinema-controls"><button class="cwo-secondary" id="cwo-skip-film" type="button">Skip Movie</button><div class="cwo-reels">' + CINEMATIC.map(function (_, i) { return '<span class="' + (i === state.cinema ? 'active' : '') + '"></span>'; }).join('') + '</div><button class="cwo-primary" id="cwo-next-film" type="button">' + (state.cinema >= CINEMATIC.length - 1 ? 'Begin Tutorial' : 'Next Scene') + '</button></div>' +
		'</section>';
	}
	function renderTutorial() {
		var op = loadJSON(SAVE_KEY, {}) || {};
		var done = !!(op.flags && op.flags.tutorialDone);
		return '<section class="cwo-tutorial">' +
			'<div class="cwo-prof">' + avatarMarkup() + '<div><h2>Professor Cipher</h2><p>City Gate is your first field lab. You will learn movement, NPC contact, and one defensive operation before any gear is issued.</p></div></div>' +
			'<div class="cwo-questline">' +
				questCard('1', 'Move In The Plaza', 'Open the world, click the plaza floor, and talk to Patch Warden. Movement should feel deliberate, not twitchy.', 'Open Plaza', 'cwo-open-plaza') +
				questCard('2', 'Run PING The Gateway', 'Open Missions and complete the first instant operation. This is your Professor Oak moment, but for defenders.', 'Open Mission Console', 'cwo-open-missions') +
				questCard('3', 'Claim Starter Kit', done ? 'Starter gear already issued: STARTER-DECK, PATCH-KIT, PORT-MAP, 75 credits.' : 'Claim this only after orientation. It marks the tutorial complete and syncs to the live grid.', done ? 'Issued' : 'Claim Gear', 'cwo-claim-gear', done) +
			'</div>' +
			'<div class="cwo-maker-actions"><button class="cwo-secondary" id="cwo-skip-tutorial" type="button">Skip Tutorial</button><button class="cwo-primary" id="cwo-finish-onboarding" type="button">Enter CyberWorld</button></div>' +
		'</section>';
	}
	function questCard(num, title, body, action, id, disabled) {
		return '<div class="cwo-quest"><span>' + num + '</span><div><b>' + esc(title) + '</b><p>' + esc(body) + '</p></div><button id="' + id + '" type="button" ' + (disabled ? 'disabled' : '') + '>' + esc(action) + '</button></div>';
	}
	function bindStep() {
		if (state.step === 'auth') bindAuth();
		else if (state.step === 'creator') bindCreator();
		else if (state.step === 'cinematic') bindCinematic();
		else if (state.step === 'tutorial') bindTutorial();
	}
	function bindAuth() {
		$all('[data-auth]').forEach(function (btn) {
			btn.addEventListener('click', function () { state.authMode = btn.dataset.auth; setMessage(''); });
		});
		var resume = $('#cwo-resume');
		if (resume) resume.addEventListener('click', function () { open('cinematic'); });
		$('#cwo-guest').addEventListener('click', function () { open('creator'); });
		$('#cwo-auth-form').addEventListener('submit', function (e) {
			e.preventDefault();
			var email = $('#cwo-email').value.trim();
			var pass = $('#cwo-pass').value;
			if (!email || pass.length < 8) { setMessage('Use an email and a password with at least 8 characters.'); return; }
			var api = window.__cwNet;
			if (!api || !api.authSignUp || !api.authSignIn) { setMessage('Supabase client is still linking. Try again in a moment.'); return; }
			setMessage('Contacting Supabase...');
			var call = state.authMode === 'login' ? api.authSignIn(email, pass) : api.authSignUp(email, pass, { source: 'CyberWorld', path: state.path });
			call.then(function (auth) {
				if (auth && auth.signedIn) open('creator');
				else setMessage('Account created. If email confirmation is enabled, verify your inbox, then log in.');
			}).catch(function (err) {
				setMessage((err && err.message) || 'Supabase auth failed.');
			});
		});
	}
	function bindCreator() {
		var input = $('#cwo-callsign');
		input.addEventListener('input', function () { state.callsign = input.value; });
		$all('[data-path]').forEach(function (btn) {
			btn.addEventListener('click', function () { state.path = btn.dataset.path; render(); });
		});
		$all('[data-hair]').forEach(function (btn) {
			btn.addEventListener('click', function () { state.hair = btn.dataset.hair; render(); });
		});
		$('#cwo-back-auth').addEventListener('click', function () { open('auth'); });
		$('#cwo-start-fresh').addEventListener('click', function () {
			state.callsign = input.value;
			var profile = profileFromState();
			setNetProfile(profile);
			if (window.__cwGameplay && window.__cwGameplay.resetFresh) window.__cwGameplay.resetFresh(profile);
			else saveJSON(SAVE_KEY, { callsign: profile.callsign, level: 1, xp: 0, credits: 0, inventory: {}, completed: {}, flags: { path: profile.path, tutorialDone: false }, look: profile.look });
			saveJSON(ONBOARD_KEY, { started: Date.now(), complete: false, path: profile.path });
			open('cinematic');
		});
	}
	function bindCinematic() {
		$('#cwo-skip-film').addEventListener('click', function () { open('tutorial'); });
		$('#cwo-next-film').addEventListener('click', function () {
			if (state.cinema >= CINEMATIC.length - 1) open('tutorial');
			else { state.cinema++; render(); }
		});
	}
	function bindTutorial() {
		$('#cwo-open-plaza').addEventListener('click', function () {
			try { window.__cwWorld && window.__cwWorld.open && window.__cwWorld.open(); } catch (e) {}
			close();
		});
		$('#cwo-open-missions').addEventListener('click', function () {
			try { window.__cwGameplay && window.__cwGameplay.open && window.__cwGameplay.open(); } catch (e) {}
			close();
		});
		$('#cwo-claim-gear').addEventListener('click', function () {
			try { window.__cwGameplay && window.__cwGameplay.completeTutorialReward && window.__cwGameplay.completeTutorialReward(); } catch (e) {}
			saveJSON(ONBOARD_KEY, Object.assign(loadJSON(ONBOARD_KEY, {}) || {}, { tutorialRewarded: Date.now() }));
			render();
		});
		$('#cwo-skip-tutorial').addEventListener('click', finish);
		$('#cwo-finish-onboarding').addEventListener('click', finish);
	}
	function finish() {
		saveJSON(ONBOARD_KEY, Object.assign(loadJSON(ONBOARD_KEY, {}) || {}, { complete: true, completedAt: Date.now() }));
		close();
		try {
			sessionStorage.setItem('cwg.booted', '1');
			if (window.__cwWorld && window.__cwWorld.open) window.__cwWorld.open();
			var boot = document.getElementById('cwg-boot');
			if (boot) boot.classList.add('gone');
			if (window.__cwWorld && window.__cwWorld.refresh) window.__cwWorld.refresh();
			if (window.__cwWorld && window.__cwWorld.toPlaza) window.__cwWorld.toPlaza();
		} catch (e) {}
	}

	window.__cwOnboarding = { open: open, close: close, state: function () { return Object.assign({}, state); } };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
	else mount();
	window.addEventListener('load', mount, { once: true });
	setTimeout(mount, 1400);
	setInterval(function () {
		if (!onboardingDone() && (!root || !root.isConnected)) mount();
	}, 1800);
})();
