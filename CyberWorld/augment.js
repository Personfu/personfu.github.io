/* CyberWorld runtime augment — non-invasive layer on top of the compiled Next.js bundle.
   Responsibilities:
     1. Map every in-world desktop shortcut (by visible label) to the correct destination:
        - internal launch ids (?launch=...) for things the bundle resolves
        - external tabs for modules served as standalone pages (codex, source, profile, etc.)
     2. Add real keyboard accessibility (Enter/Space) and ARIA labels on shortcuts.
     3. Surface a multiplayer status pill (online/offline) so players know whether they're in solo fallback.
     4. Light HUD nudges that the compiled bundle can't do on its own.

   This file is intentionally framework-free and defensive — it must never break the bundle. */

(function () {
	'use strict';
	if (window.__cwAugmentLoaded) return;
	window.__cwAugmentLoaded = true;

	function tagLaunchMode() {
		var params = new URLSearchParams(window.location.search || '');
		var launch = (params.get('launch') || '').toLowerCase();
		var home = !launch || launch === 'cyberworld';
		document.body.dataset.cwLaunch = launch || 'home';
		document.body.classList.toggle('cw-home-launch', home);
	}

	tagLaunchMode();

	// ---------------------------------------------------------------
	// Routing table.  Action shapes:
	//   { launch: '<id>' }    -> navigate to /CyberWorld/?launch=<id>
	//   { external: '<url>' } -> window.open(url, '_blank')
	//   { info: '<msg>' }     -> toast only
	// Keys are normalized labels (lowercased, non-alphanumerics stripped).
	// ---------------------------------------------------------------
	var ROUTES = {
		wargames:        { launch: 'wargames' },
		wargamesacademy: { launch: 'wargames' },
		ctftrail:        { launch: 'ctf-trail' },
		ctf:             { launch: 'ctf-trail' },
		signallab:       { launch: 'signal-lab' },
		signal:          { launch: 'signal-lab' },
		forensics:       { launch: 'forensics' },
		forensicslab:    { launch: 'forensics' },
		redops:          { launch: 'redops' },
		redopsarena:     { launch: 'redops' },
		intel:           { launch: 'intel' },
		inteldesk:       { launch: 'intel' },
		research:        { launch: 'research' },
		hangar:          { launch: 'hangar' },
		blackhangar:     { launch: 'hangar' },
		hangar3d:        { launch: 'hangar' },
		dogfight:        { launch: 'dogfight' },
		simulator:       { launch: 'simulator' },
		nexussimulator:  { launch: 'simulator' },
		mathviz:         { launch: 'mathviz' },
		aiarsenal:       { launch: 'ai' },
		aimodule:        { launch: 'ai' },
		ai:              { launch: 'ai' },
		adversaries:     { launch: 'adversaries' },
		nodes:           { launch: 'nodes' },
		discuss:         { launch: 'discuss' },
		cyberworld:      { enterWorld: true },
		cyberworldmmorpg:{ enterWorld: true },

		// External (open new tab — not part of the bundle)
		arcade:          { external: '/arcade.html' },
		gameshub:        { external: '/games.html' },
		games:           { external: '/games.html' },
		rpg:             { external: '/rpg/index.html' },
		rpgnexus:        { external: '/rpg/index.html' },
		codex:           { external: '/cyberworld-codex.html' },
		cyberworldcodex: { external: '/cyberworld-codex.html' },
		stars:           { external: '/stars.html' },
		profile:         { external: '/profile.html' },
		isobuilder:      { external: '/cyberos-iso.html' },
		iso:             { external: '/cyberos-iso.html' },
		tools:           { external: '/tools_fragment.html' },
		source:          { external: 'https://github.com/Personfu/personfu.github.io' },
		sourcecode:      { external: 'https://github.com/Personfu/personfu.github.io' },
		github:          { external: 'https://github.com/Personfu/personfu.github.io' }
	};

	var SHORTCUTS = [
		{ id: 'cyberworld', label: 'CyberWorld MMORPG', icon: '🌐' },
		{ id: 'hangar', label: 'Hangar 3D', icon: '✈️' },
		{ id: 'simulator', label: 'Nexus Simulator', icon: '🔢' },
		{ id: 'ctf', label: 'CTF Trail', icon: '🏁' },
		{ id: 'wargames', label: 'WarGames Academy', icon: '⚔️' },
		{ id: 'signal-lab', label: 'Signal Lab', icon: '📡' },
		{ id: 'forensics', label: 'Forensics Lab', icon: '🔬' },
		{ id: 'redops', label: 'RedOps Arena', icon: '🔴' },
		{ id: 'intel', label: 'Intel Desk', icon: '🧠' },
		{ id: 'adversaries', label: 'Adversaries', icon: '👾' },
		{ id: 'research', label: 'Research', icon: '📖' },
		{ id: 'ai', label: 'AI Module', icon: '🤖' },
		{ id: 'nodes', label: 'Nodes', icon: '🕸️' },
		{ id: 'dogfight', label: 'Dogfight', icon: '🛩️' },
		{ id: 'discuss', label: 'Discuss', icon: '💬' },
		{ id: 'codex', label: 'CyberWorld Codex', icon: '📚' },
		{ id: 'stars', label: 'Stars', icon: '⭐' },
		{ id: 'profile', label: 'Profile', icon: '👤' },
		{ id: 'source', label: 'Source Code', icon: '🐙' },
		{ id: 'arcade', label: 'Cyber Arcade', icon: '🕹️' },
		{ id: 'games', label: 'Games Hub', icon: '🎮' },
		{ id: 'iso', label: 'ISO Builder', icon: '💿' }
	];

	function normalize(s) {
		return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	// ---------------------------------------------------------------
	// Toast helper
	// ---------------------------------------------------------------
	var toastEl = null;
	var toastTimer = null;
	function toast(msg) {
		if (!toastEl) {
			toastEl = document.createElement('div');
			toastEl.className = 'cw-augment-toast';
			toastEl.setAttribute('role', 'status');
			toastEl.setAttribute('aria-live', 'polite');
			document.body.appendChild(toastEl);
		}
		toastEl.textContent = msg;
		toastEl.classList.add('show');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
	}

	// ---------------------------------------------------------------
	// Route resolver
	// ---------------------------------------------------------------
	function resolveButton(btn) {
		// Prefer the visible label. ARIA labels are augmented later and may contain hints.
		var raw = (btn.querySelector('.win98-label') ? btn.querySelector('.win98-label').textContent : '')
			|| btn.getAttribute('aria-label')
			|| btn.textContent
			|| '';
		var key = normalize(raw);
		var action = ROUTES[key];
		return { key: key, raw: raw.trim(), action: action || null };
	}

	function executeAction(info) {
		if (!info || !info.action) {
			toast('Module not wired: ' + (info && info.raw ? info.raw : 'unknown'));
			return false;
		}
		var a = info.action;
		if (a.info)     { toast(a.info); return true; }
		if (a.enterWorld) {
			var start = document.querySelector('.win98-start');
			if (start) {
				start.click();
				setTimeout(function () {
					if (document.querySelector('.cw-win98-desktop')) {
						window.location.assign(window.location.pathname + '?launch=cyberworld');
					}
				}, 350);
				return true;
			}
			window.location.assign(window.location.pathname + '?launch=cyberworld');
			return true;
		}
		if (a.external) { window.open(a.external, '_blank', 'noopener'); toast('Opening ' + info.raw + ' ↗'); return true; }
		if (a.launch)   {
			var url = window.location.pathname + '?launch=' + encodeURIComponent(a.launch);
			window.location.assign(url);
			return true;
		}
		return false;
	}

	function shouldLetBundleHandle(btn, action) {
		return !btn.dataset.cwApp && !!action && (action.launch || action.enterWorld);
	}

	function fallbackIfBundleMisses(btn, info) {
		var wasDesktop = !!document.querySelector('.cw-win98-desktop');
		setTimeout(function () {
			if (!wasDesktop || !document.body.contains(btn)) return;
			if (!document.querySelector('.cw-win98-desktop')) return;
			executeAction(info);
		}, 450);
	}

	// ---------------------------------------------------------------
	// Annotate shortcuts (idempotent) and intercept clicks (capture phase)
	// ---------------------------------------------------------------
	function annotateShortcut(btn) {
		if (btn.dataset.cwRoute) return;
		var info = resolveButton(btn);
		if (!info.action) {
			btn.dataset.cwRoute = 'unknown';
			btn.setAttribute('aria-label', info.raw || 'Unmapped shortcut');
			btn.title = info.raw + ' (not wired)';
			return;
		}
		var a = info.action;
		btn.dataset.cwRoute = a.external ? 'external' : (a.launch ? 'launch' : 'info');
		btn.setAttribute('aria-label', info.raw + (a.external ? ' (opens new tab)' : ''));
		btn.title = info.raw + (a.external ? ' — opens in new tab' : (a.launch ? ' — launch in world' : ''));
		btn.setAttribute('role', 'button');
		if (!btn.hasAttribute('tabindex')) btn.tabIndex = 0;
		if (!btn.dataset.cwEvents) {
			btn.addEventListener('click', function () {
				document.querySelectorAll('.win98-shortcut').forEach(function (other) {
					other.classList.remove('selected');
				});
				btn.classList.add('selected');
			});
			btn.addEventListener('dblclick', function (ev) {
				ev.preventDefault();
				ev.stopPropagation();
				executeAction(resolveButton(btn));
			});
			btn.dataset.cwEvents = '1';
		}
	}

	function annotateAll(root) {
		(root || document).querySelectorAll('.win98-shortcut').forEach(annotateShortcut);
	}

	function ensureShortcutSurface(root) {
		var grid = (root || document).querySelector('.win98-icons-grid');
		if (!grid) return;
		var existing = {};
		grid.querySelectorAll('.win98-label').forEach(function (label) {
			existing[normalize(label.textContent)] = true;
		});
		SHORTCUTS.forEach(function (app) {
			if (existing[normalize(app.label)]) return;
			var btn = document.createElement('button');
			btn.className = 'win98-shortcut';
			btn.type = 'button';
			btn.dataset.cwApp = app.id;
			btn.innerHTML = '<div class="win98-icon">' + app.icon + '</div><div class="win98-label">' + app.label + '</div>';
			grid.appendChild(btn);
			annotateShortcut(btn);
		});
	}

	// ------------------------------------------------------------
	// Periodic-table backdrop builder — real labeled cells behind the icon grid.
	// Each cell renders a cybersec "element" (symbol, name, atomic-style number).
	// ------------------------------------------------------------
	var ELEMENTS = [
		{ n: '01', s: 'Fw', name: 'FIREWALL'   },
		{ n: '02', s: 'Pk', name: 'PACKET'     },
		{ n: '03', s: 'Os', name: 'OSINT'      },
		{ n: '04', s: 'Hp', name: 'HONEYPOT'   },
		{ n: '05', s: 'Sm', name: 'SIEM'       },
		{ n: '06', s: 'Mw', name: 'MALWARE'    },
		{ n: '07', s: 'Ph', name: 'PHISHING'   },
		{ n: '08', s: 'Zd', name: 'ZERO-DAY'   },
		{ n: '09', s: 'Rk', name: 'ROOTKIT'    },
		{ n: '10', s: 'Bn', name: 'BOTNET'     },
		{ n: '11', s: 'Ex', name: 'EXPLOIT'    },
		{ n: '12', s: 'Sh', name: 'SHELLCODE'  },
		{ n: '13', s: 'Bd', name: 'BACKDOOR'   },
		{ n: '14', s: 'Ic', name: 'IOC'        },
		{ n: '15', s: 'Tm', name: 'TELEMETRY'  },
		{ n: '16', s: 'Pl', name: 'PAYLOAD'    },
		{ n: '17', s: 'Sp', name: 'SPOOFING'   },
		{ n: '18', s: 'Sb', name: 'SANDBOX'    },
		{ n: '19', s: 'Hs', name: 'HASHING'    },
		{ n: '20', s: 'Xf', name: 'EXFIL'      },
		{ n: '21', s: 'Sd', name: 'SHODAN'     },
		{ n: '22', s: 'Re', name: 'REDOPS'     },
		{ n: '23', s: 'Fo', name: 'FORENSICS'  },
		{ n: '24', s: 'Sg', name: 'SIGNAL'     },
		{ n: '25', s: 'Cf', name: 'CTF'        },
		{ n: '26', s: 'In', name: 'INTEL'      },
		{ n: '27', s: 'Wg', name: 'WARGAMES'   },
		{ n: '28', s: 'Ai', name: 'AI-CORE'    },
		{ n: '29', s: 'Ad', name: 'ADVERSARY'  },
		{ n: '30', s: 'Nm', name: 'NODEMAP'    },
		{ n: '31', s: 'Df', name: 'DOGFIGHT'   },
		{ n: '32', s: 'Hg', name: 'HANGAR'     },
		{ n: '33', s: 'Cy', name: 'CIPHER'     },
		{ n: '34', s: 'Vp', name: 'VPN'        },
		{ n: '35', s: 'Tr', name: 'TRACE'      },
		{ n: '36', s: 'Lg', name: 'LOG'        },
		{ n: '37', s: 'Pt', name: 'PORT'       },
		{ n: '38', s: 'Dm', name: 'DAEMON'     },
		{ n: '39', s: 'Gr', name: 'GRID'       },
		{ n: '40', s: 'Px', name: 'PROXY'      }
	];

	function buildPeriodicBackdrop(bg) {
		if (!bg || bg.__cwPeriodicBuilt) return;
		bg.__cwPeriodicBuilt = true;
		// Clear the SVG ::before via inline cleanup (we replace with real DOM cells)
		var layer = document.createElement('div');
		layer.className = 'cw-periodic-layer';
		// 10 cols x 4 rows = 40 cells
		ELEMENTS.forEach(function (el) {
			var c = document.createElement('div');
			c.className = 'cw-pcell';
			c.innerHTML =
				'<span class="num">' + el.n + '</span>' +
				'<span class="sym">' + el.s + '</span>' +
				'<span class="name">' + el.name + '</span>';
			layer.appendChild(c);
		});
		bg.appendChild(layer);
	}

	function mountBackdrop() {
		var bg = document.querySelector('.win98-bg');
		if (bg) buildPeriodicBackdrop(bg);
	}

	function annotateAllAndBackdrop(root) {
		annotateAll(root);
		mountBackdrop();
	}

	// Desktop double-click launcher: single click only selects, double-click opens.
	// We also preserve bundle behavior for unknown or internal routes.
	// Keyboard: Enter/Space activates the selected icon.
	document.addEventListener('keydown', function (ev) {
		if (ev.key !== 'Enter' && ev.key !== ' ') return;
		var btn = ev.target && ev.target.closest && ev.target.closest('.win98-shortcut');
		if (!btn) return;
		ev.preventDefault();
		var info = resolveButton(btn);
		if (info.action && !shouldLetBundleHandle(btn, info.action)) {
			executeAction(info);
			return;
		}
		btn.click();
	});

	// ---------------------------------------------------------------
	// Multiplayer status pill — reads window.__colyseus_state if the bundle exposes one,
	// otherwise probes the env-configured endpoint with a HEAD request.  Best-effort.
	// ---------------------------------------------------------------
	function getSidebarState() {
		return localStorage.getItem('cw.sidebar.collapsed') === 'true';
	}

	function setSidebarState(collapsed) {
		var shell = document.querySelector('.cw-shell');
		if (!shell) return;
		shell.classList.toggle('cw-sidebar-collapsed', collapsed);
		localStorage.setItem('cw.sidebar.collapsed', collapsed ? 'true' : 'false');
	}

	function mountSidebarToggle() {
		if (document.querySelector('.cw-collapse-toggle')) return;
		var shell = document.querySelector('.cw-shell');
		if (!shell) return;
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'cw-collapse-toggle';
		btn.setAttribute('aria-label', 'Toggle sidebar');
		btn.textContent = '☰';
		shell.appendChild(btn);
		btn.addEventListener('click', function () {
			setSidebarState(!shell.classList.contains('cw-sidebar-collapsed'));
		});
		setSidebarState(getSidebarState());
	}

	function mountMpPill() {
		if (document.querySelector('.cw-augment-mp')) return;
		var pill = document.createElement('div');
		pill.className = 'cw-augment-mp';
		pill.dataset.state = 'solo';
		pill.textContent = 'SOLO MODE';
		pill.setAttribute('aria-live', 'polite');
		document.body.appendChild(pill);

		// Re-evaluate periodically based on any window flags the bundle might set
		setInterval(function () {
			var online =
				window.__cwMultiplayerOnline === true ||
				(window.__colyseus_state && window.__colyseus_state.connected);
			pill.dataset.state = online ? 'online' : 'solo';
			pill.textContent = online ? 'GRID ONLINE' : 'SOLO MODE';
		}, 2500);
	}

	// ---------------------------------------------------------------
	// Boot
	// ---------------------------------------------------------------
	function boot() {
		ensureShortcutSurface(document);
		annotateAll(document);
		mountBackdrop();
		mountMpPill();

		// React renders shortcuts after hydration — observe and re-annotate
		var mo = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++) {
				var m = mutations[i];
				if (m.addedNodes && m.addedNodes.length) {
					for (var j = 0; j < m.addedNodes.length; j++) {
						var n = m.addedNodes[j];
						if (n.nodeType !== 1) continue;
						ensureShortcutSurface(n.ownerDocument || document);
						if (n.classList && n.classList.contains('win98-shortcut')) annotateShortcut(n);
						else if (n.querySelectorAll) annotateAll(n);
						if (n.classList && n.classList.contains('win98-bg')) buildPeriodicBackdrop(n);
						else if (n.querySelector) { var bg = n.querySelector('.win98-bg'); if (bg) buildPeriodicBackdrop(bg); }
					}
				}
			}
		});
		mo.observe(document.body, { childList: true, subtree: true });
		mountSidebarToggle();

		patchPhaserRuntime();

		// Helpful console banner for debugging
		try {
			console.log('%c[CyberWorld augment] active', 'color:#00e8ff;font-weight:bold');
			console.log('Routes:', Object.keys(ROUTES).length, 'mapped. Override with window.__cwAddRoute(label, action).');
		} catch (e) {}
	}

	// ---------------------------------------------------------------
	// Phaser runtime patches — responsive canvas, camera follow, label fixes
	// ---------------------------------------------------------------
	function patchPhaserRuntime() {
		var maxAttempts = 40;
		var attempt = 0;
		var interval = setInterval(function () {
			attempt++;
			var canvas = document.querySelector('.cw-stage canvas, .viewport canvas');
			if (!canvas || attempt > maxAttempts) {
				if (attempt > maxAttempts) clearInterval(interval);
				return;
			}
			clearInterval(interval);

			// Find Phaser game instance via canvas parent's scene reference
			var game = null;
			try {
				// Phaser 3 stores game ref on the canvas's parent scene manager
				// Walk up to find it
				var parent = canvas.parentElement;
				while (parent && !game) {
					if (parent.__vue__ || parent._reactRootContainer) break;
					// Check children for Phaser internals
					var keys = Object.keys(parent);
					for (var k = 0; k < keys.length; k++) {
						var val = parent[keys[k]];
						if (val && val.scene && val.scale && val.canvas === canvas) {
							game = val;
							break;
						}
					}
					parent = parent.parentElement;
				}
			} catch (e) {}

			// CSS-level responsive fix: ensure canvas fills its container
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			canvas.style.objectFit = 'contain';
			canvas.style.display = 'block';

			if (game && game.scale) {
				try {
					// Switch to RESIZE mode so canvas fills viewport container
					game.scale.scaleMode = 2; // Phaser.Scale.RESIZE = 2
					game.scale.refresh();
					console.log('%c[CyberWorld augment] Phaser scale patched to RESIZE', 'color:#00ff9c');
				} catch (e) {
					console.warn('[CyberWorld augment] scale patch failed:', e);
				}

				// Camera follow + zoom
				try {
					var scenes = game.scene.getScenes(true);
					for (var s = 0; s < scenes.length; s++) {
						var scene = scenes[s];
						var cam = scene.cameras && scene.cameras.main;
						if (!cam) continue;
						// Set world bounds larger than viewport
						cam.setBounds(0, 0, 2160, 1360);
						// Find player sprite to follow
						if (scene.player) {
							cam.startFollow(scene.player, true, 0.08, 0.08);
							cam.setZoom(1.2);
						}
					}
					console.log('%c[CyberWorld augment] Camera patched', 'color:#00ff9c');
				} catch (e) {
					console.warn('[CyberWorld augment] camera patch failed:', e);
				}

				// De-overlap labels
				try {
					var scenes2 = game.scene.getScenes(true);
					for (var s2 = 0; s2 < scenes2.length; s2++) {
						deoverlapLabels(scenes2[s2]);
					}
				} catch (e) {}
			}
		}, 500);
	}

	function deoverlapLabels(scene) {
		if (!scene || !scene.children || !scene.children.list) return;
		var texts = [];
		scene.children.list.forEach(function (child) {
			if (child.type === 'Text' && child.text && child.text.length > 2 && child.text.length < 40) {
				texts.push(child);
			}
		});
		// Sort by y, then nudge overlapping labels
		texts.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
		for (var i = 1; i < texts.length; i++) {
			var prev = texts[i - 1];
			var curr = texts[i];
			var dy = Math.abs(curr.y - prev.y);
			var dx = Math.abs(curr.x - prev.x);
			// If labels are too close vertically and horizontally overlapping
			if (dy < 18 && dx < 120) {
				curr.y = prev.y + 20;
			}
		}
	}

	// Public API for ad-hoc extension
	window.__cwAddRoute = function (label, action) {
		ROUTES[normalize(label)] = action;
		annotateAll(document);
	};
	window.__cwListRoutes = function () { return Object.assign({}, ROUTES); };

	function scheduleBoot() {
		// The exported Next bundle hydrates asynchronously. Mutating the desktop before
		// hydration finishes causes React to discard event handlers, which makes every
		// shortcut feel dead. Let the bundle claim the DOM first, then enhance it.
		setTimeout(boot, 900);
	}

	if (document.readyState === 'complete') {
		scheduleBoot();
	} else {
		window.addEventListener('load', scheduleBoot, { once: true });
	}
})();
