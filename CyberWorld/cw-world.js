/* THE GRID — CyberWorld's flagship game client.
 *
 * One cohesive, full-screen, living world that unifies everything: a canvas map
 * where you are the CORE and the five Academy skill-domains orbit as sectors you
 * fly into; real other players drift on the grid via Supabase presence; challenges
 * are nodes you breach; XP/level/credits are shown live with juice (particles,
 * floaters, level-up fanfare, screen flash); a synth sound engine (WebAudio, no
 * assets); a CRT-styled HUD; and integrated comms (live global chat).
 *
 * It reuses the Academy engine (challenge content + solving) and the NET layer
 * (presence + chat + cloud sync), replacing the scattered floating docks with a
 * single game. Framework-free, defensive, and it never touches the compiled bundle.
 * Press G to toggle; ESC exits to the desktop. */
(function () {
  'use strict';
  if (window.__cwWorldLoaded) return;
  window.__cwWorldLoaded = true;

  // ------------------------------------------------------------ helpers
  function loadJSON(k, f) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function xpForLevel(L) { return Math.floor(100 * Math.pow(1.35, L - 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rankFor(L) { return L >= 40 ? 'LEGEND' : L >= 30 ? 'PHANTOM' : L >= 22 ? 'ARCHITECT' : L >= 15 ? 'ELITE' : L >= 9 ? 'OPERATIVE' : L >= 4 ? 'AGENT' : 'ROOKIE'; }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var DOMAIN_COLORS = { crypto: '#00ffcc', web: '#ff2bd6', recon: '#4db5ff', forensics: '#ffb454', defense: '#7CFF6B' };
  var PLAZA_HOTSPOTS = [
    { id: 'academy', label: 'ACADEMY', title: 'Hacker Academy', icon: 'A', kind: 'academy', x: 0.20, y: 0.32, w: 168, h: 94, color: '#00ffcc', action: 'academy', desc: 'Start guided cyber lessons and earn XP.' },
    { id: 'field', label: 'FIELD ROUTE', title: 'Field Route Portal', icon: 'F', kind: 'portal', x: 0.58, y: 0.26, w: 180, h: 102, color: '#7CFF6B', action: 'field', desc: 'Launch the live shard convoy route.' },
    { id: 'net', label: 'NET CAFE', title: 'Net Cafe', icon: 'N', kind: 'cafe', x: 0.79, y: 0.37, w: 176, h: 96, color: '#ff2bd6', action: 'net', desc: 'Open chat, roster, ranks, and faction tools.' },
    { id: 'console', label: 'CONSOLE', title: 'Ops Console', icon: 'C', kind: 'console', x: 0.32, y: 0.77, w: 170, h: 92, color: '#fcee09', action: 'console', desc: 'Manage missions, inventory, combat, and field stats.' },
    { id: 'profile', label: 'PROFILE', title: 'Profile Booth', icon: 'P', kind: 'profile', x: 0.82, y: 0.72, w: 158, h: 94, color: '#4db5ff', action: 'profile', desc: 'View the live operative dossier.' },
    { id: 'map', label: 'SECTOR GATE', title: 'Sector Gate', icon: 'G', kind: 'gate', x: 0.63, y: 0.78, w: 176, h: 96, color: '#00ffcc', action: 'map', desc: 'Open the sector node map.' }
  ];
  var PLAZA_ACTIVITIES = [
    { id: 'daily-cache', label: 'DAILY CACHE', title: 'Daily Cache', icon: '$', x: 0.50, y: 0.61, r: 30, color: '#fcee09', action: 'cache', desc: 'Claim one plaza credit cache per day.' },
    { id: 'emote-pad', label: 'EMOTE PAD', title: 'Signal Pad', icon: '*', x: 0.47, y: 0.48, r: 28, color: '#ff2bd6', action: 'emote', desc: 'Broadcast a visible room emote.' },
    { id: 'mission-board', label: 'MISSION BOARD', title: 'Mission Board', icon: '!', x: 0.12, y: 0.58, r: 27, color: '#ffb454', action: 'console', desc: 'Jump straight to active operations.' },
    { id: 'relay-cave', label: 'RELAY CAVE', title: 'Dark Relay Cave', icon: 'D', x: 0.08, y: 0.78, r: 29, color: '#7CFF6B', action: 'mission:dn-convoy', desc: 'Enter the watcher cave route once your operative can survive it.' },
    { id: 'storm-boss', label: 'STORM BOSS', title: 'Stormcore Raid Gate', icon: 'B', x: 0.92, y: 0.83, r: 31, color: '#ff2bd6', action: 'mission:sc-raid', desc: 'Challenge the Stormcore ICE boss encounter.' },
    { id: 'help-terminal', label: 'HELP TERMINAL', title: 'Plaza Guide', icon: '?', x: 0.92, y: 0.52, r: 27, color: '#7CFF6B', action: 'guide', desc: 'Get a quick tour of movement, chat, and kiosks.' }
  ];
  var PLAZA_NPCS = [
    { id: 'warden', name: 'Patch Warden', title: 'Route Marshal', x: 0.34, y: 0.52, color: '#ffb454',
      mission: 'mc-convoy',
      lines: [
        { test: 'mission:mc-convoy', text: 'Clean first run. Now the city trusts your routing. The Relay Cave opens when your tier catches up.' },
        { test: 'default', text: 'First contract: route the City Gate Convoy. Shards first, heat second, exfil only when the gate burns green.' }
      ] },
    { id: 'mentor', name: 'Blue Mentor', title: 'Academy Keeper', x: 0.64, y: 0.51, color: '#4db5ff',
      action: 'academy',
      lines: [
        { test: 'level:4', text: 'You are past the basics. Build clean habits now: scoped recon, evidence trails, and defensive fixes.' },
        { test: 'default', text: 'CyberWorld rewards discipline. The Academy is where you turn tricks into methods and methods into rank.' }
      ] },
    { id: 'relay', name: 'Relay Tech', title: 'Cave Scout', x: 0.50, y: 0.68, color: '#00ffcc',
      mission: 'dn-convoy',
      lines: [
        { test: 'mission:dn-convoy', text: 'Black Relay logs are in. Stormcore is the next wall, and it will not fold to button mashing.' },
        { test: 'level:5', text: 'The Relay Cave is live. Watchers hunt in pairs down there; pulse early and keep shield in reserve.' },
        { test: 'default', text: 'The cave route is sealed until you have enough field rank. Clear City Gate, train, then come back.' }
      ] }
  ];
  var PLAZA_EMOTES = [
    'signals ready',
    'drops a firewall marker',
    'checks packet lanes',
    'flags the plaza board',
    'salutes the route crew'
  ];
  var WORLD_ASSET_URLS = {
    operative: '/CyberWorld/assets/cyberworld/operative-sprite.svg',
    shard: '/CyberWorld/assets/cyberworld/data-shard.svg',
    daemon: '/CyberWorld/assets/cyberworld/watcher-daemon.svg',
    gate: '/CyberWorld/assets/cyberworld/exfil-gate.svg'
  };
  var WORLD_ASSETS = {};
  Object.keys(WORLD_ASSET_URLS).forEach(function (key) {
    var img = new Image();
    img.src = WORLD_ASSET_URLS[key];
    WORLD_ASSETS[key] = img;
  });

  function getOp() {
    var g = loadJSON('cw.operative.v1', {}) || {};
    var net = loadJSON('cw.net.v1', {}) || {};
    return {
      callsign: g.callsign || net.callsign || 'OPERATIVE',
      faction: net.faction || 'GHOSTNET',
      level: Math.max(1, parseInt(g.level, 10) || 1),
      xp: Math.max(0, parseInt(g.xp, 10) || 0),
      credits: Math.max(0, parseInt(g.credits, 10) || 0)
    };
  }
  function gameplayState() {
    return loadJSON('cw.operative.v1', {}) || {};
  }
  function missionDone(id) {
    var g = gameplayState();
    return !!(g.completed && g.completed[id]);
  }
  function storyArc() {
    var op = getOp();
    if (!missionDone('mc-convoy')) return 'Act I - City Gate Convoy';
    if (op.level < 5 || !missionDone('dn-convoy')) return 'Act II - Dark Relay Cave';
    if (op.level < 6 || !missionDone('sc-raid')) return 'Act III - Stormcore Raid';
    return 'Act IV - Open Contracts';
  }
  function passesDialogueTest(test) {
    if (!test || test === 'default') return true;
    var bits = String(test).split(':');
    if (bits[0] === 'mission') return missionDone(bits[1]);
    if (bits[0] === 'level') return getOp().level >= (parseInt(bits[1], 10) || 1);
    return false;
  }
  function npcDialogue(npc) {
    var lines = npc.lines || [{ test: 'default', text: npc.line || '' }];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].test !== 'default' && passesDialogueTest(lines[i].test)) return lines[i].text;
    }
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].test === 'default') return lines[j].text;
    }
    return npc.line || '';
  }

  // ------------------------------------------------------------ sound engine (WebAudio, no assets)
  var Audio2 = {
    ctx: null, master: null, drone: null, enabled: true,
    init: function () {
      if (this.ctx) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.enabled = loadJSON('cw.sound', true) !== false;
        this.startDrone();
      } catch (e) { this.ctx = null; }
    },
    resume: function () { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} },
    setEnabled: function (on) {
      this.enabled = on;
      try { localStorage.setItem('cw.sound', JSON.stringify(on)); } catch (e) {}
      if (this.master) this.master.gain.value = on ? 0.5 : 0;
    },
    startDrone: function () {
      if (!this.ctx || this.drone) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain(), o2 = this.ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 55.4;
        g.gain.value = 0.06;
        o.connect(g); o2.connect(g); g.connect(this.master);
        o.start(); o2.start();
        this.drone = { o: o, o2: o2, g: g };
      } catch (e) {}
    },
    blip: function (freq, dur, type) {
      if (!this.ctx || !this.enabled) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'square'; o.frequency.value = freq || 660;
        g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.22, this.ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + (dur || 0.12));
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + (dur || 0.12) + 0.02);
      } catch (e) {}
    },
    arp: function (notes, step) {
      if (!this.ctx || !this.enabled) return;
      var self = this; (notes || [523, 659, 784, 1047]).forEach(function (f, i) { setTimeout(function () { self.blip(f, 0.16, 'triangle'); }, i * (step || 70)); });
    },
    levelup: function () { this.arp([523, 659, 784, 1047, 1319], 90); }
  };

  // ------------------------------------------------------------ state
  var W = {
    root: null, canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    view: 'plaza',       // 'plaza' | 'grid' | 'sector'
    sector: null,        // active sector id
    trans: 1,            // transition progress 0..1
    sectors: [],         // computed sector layout
    nodes: [],           // computed node layout (current sector)
    players: [],         // presence-driven other players
    particles: [],
    packets: [],
    hover: null,
    focus: null,
    keys: {},
    avatar: { x: 0, y: 0, tx: 0, ty: 0, ready: false, dir: 1 },
    plazaBubble: { text: '', until: 0, speaker: '' },
    emoteIndex: 0,
    t: 0,
    lastLevel: 1, lastDone: 0,
    booted: false, open: false, raf: null
  };

  // ------------------------------------------------------------ boot / mount
  function ensureMounted() {
    if (!document.body || document.getElementById('cwg-root')) return;
    var root = document.createElement('div'); root.id = 'cwg-root';
    root.innerHTML =
      '<canvas id="cwg-canvas"></canvas>' +
      '<div id="cwg-crt"></div>' +
      '<div id="cwg-flash"></div>' +
      '<div id="cwg-levelup"><div class="big">LEVEL UP</div><div class="sm" id="cwg-lu-sm">RANK ASCENDED</div></div>' +
      '<div id="cwg-tip"></div>' +
      // top HUD
      '<div class="cwg-hud" id="cwg-hud-top">' +
        '<div class="cwg-id"><div class="cwg-av" id="cwg-av">O</div>' +
        '<div class="cwg-id-main"><div class="nm" id="cwg-nm">OPERATIVE</div><div class="rk" id="cwg-rk">ROOKIE · GhostNet</div></div></div>' +
        '<div class="cwg-xpwrap"><div class="cwg-xprow"><span id="cwg-lvl">LVL 1</span><span id="cwg-xptxt">0/100 XP</span></div>' +
        '<div class="cwg-xpbar"><div class="cwg-xpfill" id="cwg-xpfill"></div></div></div>' +
        '<div class="cwg-stats">' +
          '<div class="cwg-stat cr"><b id="cwg-cr">0</b>CREDITS</div>' +
          '<div class="cwg-stat"><b id="cwg-nodes">0</b>BREACHED</div>' +
          '<div class="cwg-stat on"><b id="cwg-online">1</b>ONLINE</div>' +
        '</div>' +
        '<div class="cwg-topbtns">' +
          '<button class="cwg-tb" id="cwg-btn-plaza">PLAZA</button>' +
          '<button class="cwg-tb" id="cwg-btn-map">MAP</button>' +
          '<button class="cwg-tb" id="cwg-btn-console">CONSOLE</button>' +
          '<button class="cwg-tb" id="cwg-btn-ranks">RANKS</button>' +
          '<button class="cwg-tb" id="cwg-btn-snd" data-on="1"><span class="snd">🔊 SND</span></button>' +
          '<button class="cwg-tb exit" id="cwg-btn-exit">EXIT ▸</button>' +
        '</div>' +
      '</div>' +
      // breadcrumb
      '<div class="cwg-hud" id="cwg-crumb"><span id="cwg-crumb-txt">THE GRID // SECTOR SELECT</span></div>' +
      // side panel
      '<div class="cwg-hud" id="cwg-side"><div class="lbl" id="cwg-side-lbl">NEXT OBJECTIVE</div>' +
        '<div class="obj" id="cwg-obj">—</div><div class="objsub" id="cwg-objsub"></div>' +
        '<button class="go" id="cwg-obj-go">▸ ENGAGE</button>' +
        '<div class="breakdown" id="cwg-breakdown"></div></div>' +
      '<div class="cwg-hud" id="cwg-action"><div class="lbl" id="cwg-action-lbl">CITY GATE PLAZA</div>' +
        '<div class="obj" id="cwg-action-title">Walk to a kiosk</div><div class="objsub" id="cwg-action-sub">Click the plaza or use WASD / arrows to move.</div>' +
        '<button class="go" id="cwg-action-go">TALK</button></div>' +
      '<div class="cwg-hud" id="cwg-social">' +
        '<button data-social="emote" title="Broadcast an emote">EMOTE</button>' +
        '<button data-social="chat" title="Focus plaza chat">CHAT</button>' +
        '<button data-social="friends" title="Open NET roster">CREW</button>' +
        '<button data-social="cache" title="Claim daily cache">CACHE</button>' +
        '<button data-social="map" title="Open sector map">MAP</button>' +
      '</div>' +
      // comms
      '<div class="cwg-hud" id="cwg-comms"><div id="cwg-comms-feed"></div>' +
        '<div id="cwg-comms-bar"><input id="cwg-comms-input" maxlength="280" placeholder="broadcast to the grid…" autocomplete="off"><button id="cwg-comms-send">SEND</button></div></div>' +
      // boot
      '<div id="cwg-boot"><div class="cwg-boot-brand">CYBERWORLD</div><div class="cwg-boot-sub">FLLC GRID CLIENT v5.0</div>' +
        '<div class="cwg-bootlog" id="cwg-bootlog"></div>' +
        '<button id="cwg-jackin">▸ JACK IN</button></div>';
    document.body.appendChild(root);
    W.root = root;
    W.canvas = document.getElementById('cwg-canvas');
    W.ctx = W.canvas.getContext('2d');

    // relaunch button (visible when grid closed)
    if (!document.getElementById('cwg-relaunch')) {
      var rl = document.createElement('div'); rl.id = 'cwg-relaunch';
      rl.innerHTML = '<span>🌐</span><span>THE GRID</span>';
      rl.title = 'Enter THE GRID (G)';
      rl.addEventListener('click', function () { openWorld(); });
      document.body.appendChild(rl);
    }

    bindHud();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); W.open ? closeWorld() : openWorld(); }
      else if (W.open && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].indexOf(key) !== -1) { W.keys[key] = true; e.preventDefault(); }
      else if (e.key === 'Escape' && W.open && W.view === 'sector') { toGrid(); }
      else if (e.key === 'Escape' && W.open && W.view === 'grid') { toPlaza(); }
      else if (e.key === 'Escape' && W.open) { closeWorld(); }
    });
    document.addEventListener('keyup', function (e) {
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].indexOf(key) !== -1) W.keys[key] = false;
    });
  }

  function bindHud() {
    document.getElementById('cwg-btn-exit').addEventListener('click', closeWorld);
    document.getElementById('cwg-btn-plaza').addEventListener('click', toPlaza);
    document.getElementById('cwg-btn-map').addEventListener('click', toGrid);
    document.getElementById('cwg-btn-ranks').addEventListener('click', function () { try { window.__cwNet && window.__cwNet.open(); } catch (e) {} Audio2.blip(520); });
    document.getElementById('cwg-btn-console').addEventListener('click', function () { try { window.__cwGameplay && window.__cwGameplay.open(); } catch (e) {} Audio2.blip(560); });
    document.getElementById('cwg-btn-snd').addEventListener('click', function () {
      var on = !Audio2.enabled; Audio2.setEnabled(on);
      this.dataset.on = on ? '1' : '0';
      this.querySelector('.snd').textContent = on ? '🔊 SND' : '🔈 MUTE';
      if (on) Audio2.blip(660);
    });
    document.getElementById('cwg-obj-go').addEventListener('click', function () { engageNext(); });
    document.getElementById('cwg-action-go').addEventListener('click', function () { activateFocus(); });
    document.querySelectorAll('#cwg-social button').forEach(function (b) {
      b.addEventListener('click', function () { runPlazaSocial(b.dataset.social); });
    });
    var send = function () {
      var inp = document.getElementById('cwg-comms-input'); if (!inp) return;
      var body = inp.value.trim(); if (!body) return; inp.value = '';
      Audio2.blip(720, 0.08);
      try { if (window.__cwNet && window.__cwNet.sendChat) window.__cwNet.sendChat(body, 'GLOBAL'); } catch (e) {}
      pushMsg({ callsign: getOp().callsign, faction: getOp().faction, body: body });
    };
    document.getElementById('cwg-comms-send').addEventListener('click', send);
    document.getElementById('cwg-comms-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); e.stopPropagation(); });

    // canvas interaction
    W.canvas.addEventListener('mousemove', onMove);
    W.canvas.addEventListener('click', onClick);
    W.canvas.addEventListener('mouseleave', function () { W.hover = null; hideTip(); });

    // live chat + presence
    try {
      if (window.__cwNet) {
        window.__cwNet.onChat && window.__cwNet.onChat(function (m) { pushMsg(m); Audio2.blip(880, 0.05, 'sine'); });
        window.__cwNet.onRoster && window.__cwNet.onRoster(function (list) { syncPlayers(list); });
      }
    } catch (e) {}
  }

  // ------------------------------------------------------------ boot sequence
  var BOOT_LINES = [
    'establishing uplink to FLLC grid ......... OK',
    'negotiating ICE handshake ................ OK',
    'decrypting operative session ............. OK',
    'loading sector topology .................. OK',
    'syncing presence channel ................. OK',
    'calibrating neural interface ............. OK'
  ];
  function runBoot() {
    var log = document.getElementById('cwg-bootlog'); if (!log) return;
    if (sessionStorage.getItem('cwg.booted')) {
      log.innerHTML = 'session restored ......................... OK\n<span class="ok">GRID LINK ESTABLISHED</span>';
      document.getElementById('cwg-jackin').classList.add('ready');
      return;
    }
    var i = 0, txt = '';
    (function step() {
      if (i >= BOOT_LINES.length) {
        txt += '\n<span class="ok">GRID LINK ESTABLISHED</span>';
        log.innerHTML = txt;
        document.getElementById('cwg-jackin').classList.add('ready');
        return;
      }
      txt += (i ? '\n' : '') + BOOT_LINES[i];
      log.innerHTML = txt + '<span class="cwg-cursor"></span>';
      Audio2.blip(300 + Math.random() * 200, 0.03, 'square');
      i++;
      setTimeout(step, 260 + Math.random() * 120);
    })();
  }

  function jackIn() {
    Audio2.init(); Audio2.resume();
    Audio2.arp([392, 523, 659, 880], 80);
    sessionStorage.setItem('cwg.booted', '1');
    var boot = document.getElementById('cwg-boot');
    if (boot) { boot.style.transition = 'opacity .6s'; boot.style.opacity = '0'; setTimeout(function () { boot.classList.add('gone'); }, 620); }
    refreshData(true);
    toPlaza();
  }

  // ------------------------------------------------------------ open / close
  function openWorld() {
    ensureMounted();
    W.root.classList.add('on');
    W.open = true;
    document.getElementById('cwg-relaunch').classList.remove('show');
    resize();
    var boot = document.getElementById('cwg-boot');
    if (boot && !boot.classList.contains('gone')) { runBoot(); document.getElementById('cwg-jackin').onclick = jackIn; }
    else { refreshData(true); if (W.view !== 'sector') toPlaza(); }
    startLoop();
  }
  function closeWorld() {
    if (!W.root) return;
    W.root.classList.remove('on');
    W.open = false;
    document.getElementById('cwg-relaunch').classList.add('show');
    stopLoop();
  }

  // ------------------------------------------------------------ data
  function refreshData(recenter) {
    var op = getOp();
    // HUD identity
    var fx = { GHOSTNET: 'GhostNet', IRONWALL: 'IronWall', NULLSEC: 'NullSec', DAEMON: 'Daemon', NEUTRAL: 'Unaligned' }[op.faction] || 'GhostNet';
    setText('cwg-av', (op.callsign || 'O').charAt(0).toUpperCase());
    setText('cwg-nm', op.callsign);
    setText('cwg-rk', rankFor(op.level) + ' · ' + fx);
    setText('cwg-lvl', 'LVL ' + op.level);
    setText('cwg-cr', op.credits.toLocaleString());
    var need = xpForLevel(op.level), into = clamp(op.xp, 0, need);
    setText('cwg-xptxt', into + '/' + need + ' XP');
    var fill = document.getElementById('cwg-xpfill'); if (fill) fill.style.width = Math.round(into / need * 100) + '%';

    // world data from academy
    var wd = (window.__cwAcademy && window.__cwAcademy.worldData) ? window.__cwAcademy.worldData() : { domains: [] };
    W.wd = wd;
    var doneTotal = 0, total = 0;
    wd.domains.forEach(function (d) { doneTotal += d.done; total += d.total; });
    setText('cwg-nodes', doneTotal);

    // detect level up / new breaches for juice
    if (W.lastLevel && op.level > W.lastLevel) { fireLevelUp(op.level); }
    if (W.lastDone && doneTotal > W.lastDone) { /* breach fx handled on solve */ }
    W.lastLevel = op.level; W.lastDone = doneTotal;

    layoutSectors(recenter);
    renderSide();
    renderBreakdown();
  }

  function layoutSectors() {
    var wd = W.wd || { domains: [] };
    var n = wd.domains.length || 5;
    W.sectors = wd.domains.map(function (d, i) {
      var ang = -Math.PI / 2 + i * (Math.PI * 2 / n);
      return {
        id: d.id, name: d.name, icon: d.icon, done: d.done, total: d.total,
        color: DOMAIN_COLORS[d.id] || '#00ffcc',
        ang: ang, orbit: 0.30, // fraction of min(w,h)
        pulse: Math.random() * Math.PI * 2
      };
    });
  }

  function openSector(id) {
    var d = (W.wd.domains || []).filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    W.sector = id; W.view = 'sector'; W.trans = 0;
    if (W.root) W.root.dataset.view = 'sector';
    setText('cwg-crumb-txt', 'THE GRID // ' + d.name);
    // lay nodes along an arc path
    W.nodes = d.nodes.map(function (nd, i) {
      return { id: nd.id, title: nd.title, tier: nd.tier, xp: nd.xp, done: nd.done, unlocked: nd.unlocked,
               color: DOMAIN_COLORS[id] || '#00ffcc', idx: i, total: d.nodes.length, pulse: Math.random() * 6 };
    });
    Audio2.blip(440, 0.14, 'sawtooth');
    renderSide();
    renderBreakdown();
  }
  function toPlaza() {
    W.view = 'plaza';
    W.sector = null;
    W.trans = 0;
    W.focus = null;
    if (W.root) W.root.dataset.view = 'plaza';
    setText('cwg-crumb-txt', 'CITY GATE PLAZA // OPEN WORLD');
    setActionPanel(null);
    Audio2.blip(420, 0.1);
    renderSide();
    renderBreakdown();
  }
  function toGrid() { W.view = 'grid'; W.sector = null; W.trans = 0; if (W.root) W.root.dataset.view = 'grid'; setText('cwg-crumb-txt', 'THE GRID // SECTOR SELECT'); Audio2.blip(330, 0.12); renderSide(); renderBreakdown(); }

  // ------------------------------------------------------------ side panel / objectives
  function firstUnsolved() {
    var wd = W.wd || { domains: [] };
    for (var i = 0; i < wd.domains.length; i++) {
      var d = wd.domains[i];
      for (var j = 0; j < d.nodes.length; j++) {
        var nd = d.nodes[j];
        if (!nd.done && nd.unlocked) return { domain: d, node: nd };
      }
    }
    return null;
  }
  function engageNext() {
    if (W.view === 'sector' && W.sector) {
      var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
      var nd = d && d.nodes.filter(function (n) { return !n.done && n.unlocked; })[0];
      if (nd) { launchChallenge(nd.id); return; }
    }
    var nx = firstUnsolved();
    if (nx) { openSector(nx.domain.id); launchChallenge(nx.node.id); }
    else pushMsg({ callsign: 'GRID', faction: 'NEUTRAL', body: 'All sectors cleared, operative. Legend status.' });
  }
  function renderSide() {
    if (W.view === 'plaza') {
      setText('cwg-side-lbl', 'CITY GATE PLAZA');
      setText('cwg-obj', storyArc());
      setText('cwg-objsub', 'Walk to districts, talk to NPCs, claim cache, run field routes, and open boss gates.');
    } else if (W.view === 'sector' && W.sector) {
      var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0];
      setText('cwg-side-lbl', d.name + ' // ' + d.done + '/' + d.total);
      var nd = d.nodes.filter(function (n) { return !n.done && n.unlocked; })[0];
      if (nd) { setText('cwg-obj', nd.title); setText('cwg-objsub', 'TIER ' + nd.tier + ' · +' + nd.xp + ' XP'); }
      else { setText('cwg-obj', 'SECTOR CLEARED ✅'); setText('cwg-objsub', 'Every node breached.'); }
    } else {
      setText('cwg-side-lbl', 'NEXT OBJECTIVE');
      var nx = firstUnsolved();
      if (nx) { setText('cwg-obj', nx.node.title); setText('cwg-objsub', nx.domain.name + ' · TIER ' + nx.node.tier + ' · +' + nx.node.xp + ' XP'); }
      else { setText('cwg-obj', 'CAMPAIGN COMPLETE ✅'); setText('cwg-objsub', 'All challenges cleared.'); }
    }
  }
  function renderBreakdown() {
    var host = document.getElementById('cwg-breakdown'); if (!host) return;
    if (W.view === 'plaza') {
      host.innerHTML = PLAZA_HOTSPOTS.concat(PLAZA_ACTIVITIES).map(function (h) {
        return '<div class="brow"><span class="bi">' + h.icon + '</span><span>' + esc(h.label) + '</span><span class="bp">OPEN</span></div>';
      }).join('');
      return;
    }
    var wd = W.wd || { domains: [] };
    host.innerHTML = wd.domains.map(function (d) {
      return '<div class="brow"><span class="bi">' + d.icon + '</span><span>' + esc(d.name.split(' ')[0]) + '</span><span class="bp">' + d.done + '/' + d.total + '</span></div>';
    }).join('');
  }

  // ------------------------------------------------------------ challenge launch + solve detection
  function launchChallenge(id) {
    Audio2.blip(600, 0.1);
    try { if (window.__cwAcademy && window.__cwAcademy.goChallenge) window.__cwAcademy.goChallenge(id); } catch (e) {}
    // academy window sits above the grid (z 90002 > 80000); poll for a solve
    var beforeDone = countDone();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var now = countDone();
      if (now > beforeDone) { clearInterval(iv); onBreach(id); }
      if (tries > 600) clearInterval(iv); // ~5 min cap
    }, 500);
  }
  function countDone() {
    var g = loadJSON('cw.operative.v1', {}) || {};
    return g.completed ? Object.keys(g.completed).length : 0;
  }
  function onBreach(id) {
    Audio2.arp([659, 880, 1047], 70);
    refreshData();
    burstAt(centerX(), centerY(), 40, '#00ffcc');
    flash();
    floatText(centerX(), centerY() - 30, '+ NODE BREACHED');
  }

  // ------------------------------------------------------------ presence -> players
  function syncPlayers(list) {
    var me = null; try { me = (window.__cwNet && window.__cwNet.me) ? window.__cwNet.me() : null; } catch (e) {}
    var others = (list || []).filter(function (p) { return !me || p.callsign !== me.callsign; });
    setText('cwg-online', (list && list.length) || 1);
    // keep drifting positions stable across updates
    var prev = {}; W.players.forEach(function (p) { prev[p.key] = p; });
    W.players = others.slice(0, 24).map(function (p, i) {
      var key = p.device || p.callsign || ('p' + i);
      var ex = prev[key];
      return ex || {
        key: key, callsign: p.callsign || 'OP', level: p.level || 1, faction: p.faction,
        a: Math.random() * Math.PI * 2, r: 0.12 + Math.random() * 0.16, spd: 0.1 + Math.random() * 0.25,
        color: DOMAIN_COLORS[({ GHOSTNET: 'crypto', IRONWALL: 'recon', NULLSEC: 'web', DAEMON: 'forensics' }[p.faction] || 'crypto')] || '#9fe'
      };
    });
  }

  // ------------------------------------------------------------ comms
  function pushMsg(m) {
    var feed = document.getElementById('cwg-comms-feed'); if (!feed || !m) return;
    var fc = DOMAIN_COLORS[({ GHOSTNET: 'crypto', IRONWALL: 'recon', NULLSEC: 'web', DAEMON: 'forensics', DAEMONX: 'defense' }[m.faction] || 'crypto')] || '#00ffcc';
    var line = document.createElement('div'); line.className = 'cwg-msg';
    line.innerHTML = '<span class="cs" style="color:' + fc + '">' + esc(m.callsign || 'OP') + '</span>' + esc(m.body || '');
    feed.appendChild(line);
    while (feed.childElementCount > 6) feed.removeChild(feed.firstChild);
  }

  // ------------------------------------------------------------ FX
  function fireLevelUp(lvl) {
    Audio2.levelup();
    var b = document.getElementById('cwg-levelup'); if (b) { document.getElementById('cwg-lu-sm').textContent = 'RANK: ' + rankFor(lvl) + ' · LVL ' + lvl; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
    flash();
    burstAt(centerX(), centerY(), 80, '#ffb454');
  }
  function flash() { var f = document.getElementById('cwg-flash'); if (f) { f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); } }
  function floatText(x, y, txt) {
    var el = document.createElement('div'); el.className = 'cwg-float'; el.textContent = txt;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    W.root.appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }
  function burstAt(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      W.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color: color || '#00ffcc', size: 1 + Math.random() * 2 });
    }
  }

  // ------------------------------------------------------------ canvas geometry + render
  function resize() {
    if (!W.canvas) return;
    W.dpr = Math.min(2, window.devicePixelRatio || 1);
    W.w = window.innerWidth; W.h = window.innerHeight;
    W.canvas.width = W.w * W.dpr; W.canvas.height = W.h * W.dpr;
    W.canvas.style.width = W.w + 'px'; W.canvas.style.height = W.h + 'px';
    W.ctx.setTransform(W.dpr, 0, 0, W.dpr, 0, 0);
    // seed ambient particles once
    if (!W.particles.length) for (var i = 0; i < 70; i++) W.particles.push(ambient());
  }
  function ambient() { return { x: Math.random() * W.w, y: Math.random() * W.h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, life: -1, color: 'rgba(0,255,204,0.35)', size: Math.random() * 1.6 + 0.3, amb: true }; }
  function centerX() { return W.w / 2; }
  function centerY() { return W.h / 2 + 10; }
  function roundRect(c, x, y, w, h, r) {
    var rr = Math.min(r || 0, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr);
    c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr);
    c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
  }
  function drawTextPill(c, text, x, y, color) {
    c.save();
    c.font = "700 13px 'Share Tech Mono',monospace";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    var w = c.measureText(text).width + 34;
    c.fillStyle = 'rgba(2, 9, 14, 0.92)';
    c.strokeStyle = color || '#00ffcc';
    c.lineWidth = 1.5;
    roundRect(c, x - w / 2, y - 17, w, 34, 8);
    c.fill();
    c.stroke();
    c.fillStyle = color || '#00ffcc';
    c.fillText(text, x, y);
    c.restore();
  }

  function sectorPos(s) {
    var R = Math.min(W.w, W.h) * s.orbit;
    return { x: centerX() + Math.cos(s.ang) * R, y: centerY() + Math.sin(s.ang) * R };
  }
  function nodePos(nd) {
    // arc across the middle of the screen
    var pad = Math.min(W.w * 0.16, 220);
    var x = lerp(pad, W.w - pad, nd.total <= 1 ? 0.5 : nd.idx / (nd.total - 1));
    var y = centerY() + Math.sin(nd.idx / Math.max(1, nd.total - 1) * Math.PI) * -Math.min(W.h * 0.16, 140) + 20;
    return { x: x, y: y };
  }

  function draw() {
    var c = W.ctx; if (!c) return;
    W.t += 0.016;
    W.trans = Math.min(1, W.trans + 0.06);
    c.clearRect(0, 0, W.w, W.h);
    // background gradient
    var g = c.createRadialGradient(centerX(), centerY(), 20, centerX(), centerY(), Math.max(W.w, W.h) * 0.75);
    g.addColorStop(0, '#06131c'); g.addColorStop(1, '#01040a');
    c.fillStyle = g; c.fillRect(0, 0, W.w, W.h);
    drawGridLines(c);
    updateParticles(c);

    if (W.view === 'plaza') drawPlazaView(c);
    else if (W.view === 'grid') drawGridView(c);
    else drawSectorView(c);

    if (W.view === 'grid' || W.view === 'plaza') drawPlayers(c);
  }

  function drawGridLines(c) {
    c.strokeStyle = 'rgba(0,255,204,0.04)'; c.lineWidth = 1;
    var step = 44, off = (W.t * 6) % step;
    for (var x = -off; x < W.w; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, W.h); c.stroke(); }
    for (var y = -off; y < W.h; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(W.w, y); c.stroke(); }
  }

  function drawGridView(c) {
    var cx = centerX(), cy = centerY();
    // lines core -> sectors with flowing packets
    W.sectors.forEach(function (s) {
      var p = sectorPos(s);
      c.strokeStyle = 'rgba(0,255,204,0.18)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(p.x, p.y); c.stroke();
      // packet dots
      for (var k = 0; k < 3; k++) {
        var tt = ((W.t * 0.35 + k / 3) % 1);
        var px = lerp(cx, p.x, tt), py = lerp(cy, p.y, tt);
        c.fillStyle = s.color; c.globalAlpha = 0.8;
        c.beginPath(); c.arc(px, py, 2.2, 0, 7); c.fill(); c.globalAlpha = 1;
      }
    });
    // sectors
    W.sectors.forEach(function (s) {
      var p = sectorPos(s); s.pulse += 0.05;
      var pct = s.total ? s.done / s.total : 0;
      var r = 30 + pct * 12 + Math.sin(s.pulse) * 2;
      var isHover = W.hover && W.hover.type === 'sector' && W.hover.id === s.id;
      // glow
      c.save(); c.shadowColor = s.color; c.shadowBlur = isHover ? 30 : 16;
      c.beginPath(); c.arc(p.x, p.y, r, 0, 7);
      c.fillStyle = 'rgba(3,12,18,0.92)'; c.fill();
      c.lineWidth = isHover ? 3 : 2; c.strokeStyle = s.color; c.stroke();
      c.restore();
      // progress ring
      c.beginPath(); c.arc(p.x, p.y, r + 5, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      c.strokeStyle = s.color; c.lineWidth = 3; c.stroke();
      // icon + label
      c.font = '20px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(s.icon, p.x, p.y - 2);
      c.font = "700 11px 'Share Tech Mono',monospace"; c.fillStyle = '#eafcff';
      c.fillText(s.name.split(' ')[0], p.x, p.y + r + 16);
      c.font = "9px 'Share Tech Mono',monospace"; c.fillStyle = s.color;
      c.fillText(s.done + '/' + s.total, p.x, p.y + r + 28);
      s._pos = p; s._r = r;
    });
    // core (you)
    var pr = 26 + Math.sin(W.t * 2) * 3;
    c.save(); c.shadowColor = '#00ffcc'; c.shadowBlur = 26;
    c.beginPath(); c.arc(cx, cy, pr, 0, 7); c.fillStyle = '#001'; c.fill();
    c.lineWidth = 3; c.strokeStyle = '#00ffcc'; c.stroke(); c.restore();
    c.font = '20px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🛰️', cx, cy);
    c.font = "700 10px 'Share Tech Mono',monospace"; c.fillStyle = '#00ffcc'; c.fillText('YOU // CORE', cx, cy + pr + 14);
  }

  function drawSectorView(c) {
    var d = (W.wd.domains || []).filter(function (x) { return x.id === W.sector; })[0]; if (!d) return;
    var col = DOMAIN_COLORS[W.sector] || '#00ffcc';
    // header
    c.font = "700 22px 'VT323',monospace"; c.textAlign = 'center'; c.fillStyle = col;
    c.fillText(d.icon + '  ' + d.name, centerX(), 96);
    // connective path
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.beginPath();
    W.nodes.forEach(function (nd, i) { var p = nodePos(nd); if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
    c.stroke();
    // flowing packets along path
    for (var seg = 0; seg < W.nodes.length - 1; seg++) {
      var a = nodePos(W.nodes[seg]), b = nodePos(W.nodes[seg + 1]);
      var tt = (W.t * 0.4 + seg * 0.2) % 1;
      c.fillStyle = col; c.globalAlpha = 0.6; c.beginPath(); c.arc(lerp(a.x, b.x, tt), lerp(a.y, b.y, tt), 2, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    // nodes
    W.nodes.forEach(function (nd) {
      var p = nodePos(nd); nd.pulse += 0.06;
      var isHover = W.hover && W.hover.type === 'node' && W.hover.id === nd.id;
      var r = 20 + Math.sin(nd.pulse) * 1.5 + (isHover ? 4 : 0);
      c.save();
      if (nd.done) { c.shadowColor = '#00ff9c'; c.shadowBlur = 18; }
      else if (nd.unlocked) { c.shadowColor = col; c.shadowBlur = isHover ? 26 : 12; }
      else { c.shadowBlur = 0; }
      c.beginPath(); c.arc(p.x, p.y, r, 0, 7);
      c.fillStyle = nd.done ? 'rgba(0,40,24,0.95)' : (nd.unlocked ? 'rgba(4,14,20,0.95)' : 'rgba(10,10,14,0.9)');
      c.fill();
      c.lineWidth = 2; c.strokeStyle = nd.done ? '#00ff9c' : (nd.unlocked ? col : '#3a4650'); c.stroke();
      c.restore();
      c.font = '15px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(nd.done ? '✅' : (nd.unlocked ? '⚡' : '🔒'), p.x, p.y);
      c.font = "700 9px 'Share Tech Mono',monospace"; c.fillStyle = nd.unlocked ? '#eafcff' : '#5a6670';
      c.fillText('T' + nd.tier, p.x, p.y + r + 12);
      nd._pos = p; nd._r = r;
    });
  }

  function drawPlayers(c) {
    var cx = centerX(), cy = centerY(), R = Math.min(W.w, W.h);
    W.players.forEach(function (p) {
      p.a += p.spd * 0.01;
      var x = cx + Math.cos(p.a) * R * p.r, y = cy + Math.sin(p.a) * R * p.r * 0.7;
      c.save(); c.shadowColor = p.color; c.shadowBlur = 8;
      c.beginPath(); c.arc(x, y, 5, 0, 7); c.fillStyle = p.color; c.fill(); c.restore();
      c.font = "9px 'Share Tech Mono',monospace"; c.textAlign = 'center'; c.fillStyle = 'rgba(200,240,247,0.85)';
      c.fillText(p.callsign + ' L' + p.level, x, y - 10);
      // faint tether to core
      c.strokeStyle = 'rgba(0,255,204,0.05)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    });
  }

  function updateParticles(c) {
    for (var i = W.particles.length - 1; i >= 0; i--) {
      var p = W.particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.amb) {
        if (p.x < 0) p.x = W.w; if (p.x > W.w) p.x = 0; if (p.y < 0) p.y = W.h; if (p.y > W.h) p.y = 0;
        c.globalAlpha = 0.5; c.fillStyle = p.color; c.fillRect(p.x, p.y, p.size, p.size); c.globalAlpha = 1;
      } else {
        p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.02;
        if (p.life <= 0) { W.particles.splice(i, 1); continue; }
        c.globalAlpha = p.life; c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); c.globalAlpha = 1;
      }
    }
  }

  // ------------------------------------------------------------ interaction
  function hitTest(mx, my) {
    if (W.view === 'plaza') {
      for (var p = 0; p < PLAZA_NPCS.length; p++) {
        var npc = PLAZA_NPCS[p]; if (!npc._pos) continue;
        if (Math.hypot(mx - npc._pos.x, my - npc._pos.y) <= 30) return { type: 'npc', id: npc.id, npc: npc, x: npc._pos.x, y: npc._pos.y };
      }
      for (var a = 0; a < PLAZA_ACTIVITIES.length; a++) {
        var act = PLAZA_ACTIVITIES[a]; if (!act._pos) continue;
        if (Math.hypot(mx - act._pos.x, my - act._pos.y) <= act.r + 12) return { type: 'activity', id: act.id, activity: act, x: act._pos.x, y: act._pos.y };
      }
      for (var q = 0; q < PLAZA_HOTSPOTS.length; q++) {
        var h = PLAZA_HOTSPOTS[q]; if (!h._pos) continue;
        if (Math.abs(mx - h._pos.x) <= h._pos.w / 2 && Math.abs(my - h._pos.y) <= h._pos.h / 2 + 16) return { type: 'hotspot', id: h.id, hotspot: h, x: h._pos.x, y: h._pos.y };
      }
    } else if (W.view === 'grid') {
      for (var i = 0; i < W.sectors.length; i++) {
        var s = W.sectors[i]; if (!s._pos) continue;
        if (Math.hypot(mx - s._pos.x, my - s._pos.y) <= (s._r || 30) + 6) return { type: 'sector', id: s.id, s: s, x: s._pos.x, y: s._pos.y };
      }
    } else {
      for (var j = 0; j < W.nodes.length; j++) {
        var nd = W.nodes[j]; if (!nd._pos) continue;
        if (Math.hypot(mx - nd._pos.x, my - nd._pos.y) <= (nd._r || 20) + 6) return { type: 'node', id: nd.id, nd: nd, x: nd._pos.x, y: nd._pos.y };
      }
    }
    return null;
  }
  function onMove(e) {
    var r = W.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var h = hitTest(mx, my);
    if (h && (!W.hover || W.hover.id !== h.id)) Audio2.blip(900, 0.03, 'sine');
    W.hover = h;
    W.canvas.style.cursor = h ? 'pointer' : 'crosshair';
    if (h) showTip(e.clientX, e.clientY, h); else hideTip();
  }
  function onClick(e) {
    Audio2.resume();
    var r = W.canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var h = hitTest(mx, my);
    if (!h) {
      if (W.view === 'plaza') {
        var b = plazaBounds();
        W.avatar.tx = clamp(mx, b.left + 34, b.right - 34);
        W.avatar.ty = clamp(my, b.top + 48, b.bottom - 34);
        W.focus = null;
        setActionPanel(null);
        return;
      }
      if (W.view === 'sector') { /* click empty to stay in sector */ }
      return;
    }
    if (h.type === 'hotspot') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + h.hotspot.h / 2 + 20;
      setActionPanel(h);
      sayInPlaza('System', h.hotspot.title + ' selected.');
    } else if (h.type === 'activity') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + h.activity.r + 28;
      setActionPanel(h);
      sayInPlaza('System', h.activity.title + ' selected.');
    } else if (h.type === 'npc') {
      W.avatar.tx = h.x;
      W.avatar.ty = h.y + 38;
      setActionPanel(h);
      sayInPlaza(h.npc.name, npcDialogue(h.npc));
    } else if (h.type === 'sector') { openSector(h.id); }
    else if (h.type === 'node') {
      if (h.nd.done) { launchChallenge(h.id); }        // review
      else if (h.nd.unlocked) { launchChallenge(h.id); }
      else { Audio2.blip(160, 0.2, 'sawtooth'); floatText(h.x, h.y - 20, 'LOCKED'); }
    }
  }
  function showTip(cx, cy, h) {
    var tip = document.getElementById('cwg-tip'); if (!tip) return;
    if (h.type === 'hotspot') {
      tip.innerHTML = '<div class="tt">' + esc(h.hotspot.title) + '</div><div class="td">' + esc(h.hotspot.desc) + '</div><div class="tr">click to walk here</div>';
    } else if (h.type === 'activity') {
      tip.innerHTML = '<div class="tt">' + esc(h.activity.title) + '</div><div class="td">' + esc(h.activity.desc) + '</div><div class="tr">click to inspect</div>';
    } else if (h.type === 'npc') {
      tip.innerHTML = '<div class="tt">' + esc(h.npc.name) + '</div><div class="td">' + esc(npcDialogue(h.npc)) + '</div><div class="tr">click to talk</div>';
    } else if (h.type === 'sector') {
      tip.innerHTML = '<div class="tt">' + esc(h.s.name) + '</div><div class="td">' + h.s.done + ' / ' + h.s.total + ' nodes breached</div><div class="tr">▸ click to enter sector</div>';
    } else {
      var nd = h.nd;
      tip.innerHTML = '<div class="tt">' + esc(nd.title) + '</div><div class="td">Tier ' + nd.tier + ' · +' + nd.xp + ' XP</div><div class="tr">' + (nd.done ? '✅ breached — click to review' : nd.unlocked ? '⚡ click to breach' : '🔒 locked') + '</div>';
    }
    tip.style.display = 'block';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = clamp(cx + 14, 6, W.w - tw - 6) + 'px';
    tip.style.top = clamp(cy + 14, 6, W.h - th - 6) + 'px';
  }
  function hideTip() { var t = document.getElementById('cwg-tip'); if (t) t.style.display = 'none'; }

  // ------------------------------------------------------------ loop
  function startLoop() { if (W.raf) return; (function tick() { if (!W.open) { W.raf = null; return; } draw(); W.raf = requestAnimationFrame(tick); })(); }
  function stopLoop() { if (W.raf) { cancelAnimationFrame(W.raf); W.raf = null; } }

  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // ------------------------------------------------------------ public API + boot
  function exposeWorldApi() {
    window.__cwWorld = { open: openWorld, close: closeWorld, refresh: function () { refreshData(); }, toGrid: toGrid, toPlaza: toPlaza, view: function () { return W.view; } };
  }

  function plazaBounds() {
    var marginX = clamp(W.w * 0.08, 28, 112);
    var top = clamp(W.h * 0.16, 82, 132);
    var bottom = W.h - clamp(W.h * 0.16, 116, 168);
    return { left: marginX, right: W.w - marginX, top: top, bottom: bottom };
  }

  function initAvatar() {
    if (W.avatar.ready) return;
    var b = plazaBounds();
    W.avatar.x = (b.left + b.right) / 2;
    W.avatar.y = b.top + (b.bottom - b.top) * 0.56;
    W.avatar.tx = W.avatar.x;
    W.avatar.ty = W.avatar.y;
    W.avatar.ready = true;
  }

  function plazaPoint(item) {
    var b = plazaBounds();
    return {
      x: lerp(b.left, b.right, item.x),
      y: lerp(b.top, b.bottom, item.y),
      w: item.w,
      h: item.h
    };
  }

  function drawPlazaView(c) {
    initAvatar();
    updateAvatar();
    var b = plazaBounds();
    drawPlazaSkyline(c, b);
    drawPlazaFloor(c, b);
    drawPlazaRoutes(c, b);
    drawPlazaHotspots(c);
    drawPlazaActivities(c);
    drawPlazaNpcs(c);
    drawAvatar(c);
    drawPlazaBubble(c);
  }

  function drawPlazaSkyline(c, b) {
    c.save();
    var y = Math.max(74, b.top - 78);
    c.fillStyle = 'rgba(0, 8, 16, 0.88)';
    c.fillRect(0, 0, W.w, b.top + 36);
    for (var i = 0; i < 22; i++) {
      var bw = 42 + (i % 5) * 13;
      var bh = 44 + ((i * 31) % 72);
      var x = (i * 79 + Math.sin(i) * 28) % (W.w + 80) - 40;
      c.fillStyle = i % 3 === 0 ? 'rgba(7,22,35,0.95)' : 'rgba(3,15,28,0.95)';
      c.fillRect(x, y + 78 - bh, bw, bh);
      c.strokeStyle = i % 4 === 0 ? 'rgba(255,43,214,0.20)' : 'rgba(0,232,255,0.20)';
      c.strokeRect(x + 0.5, y + 78 - bh + 0.5, bw - 1, bh - 1);
      c.fillStyle = i % 4 === 0 ? 'rgba(255,43,214,0.55)' : 'rgba(252,238,9,0.45)';
      for (var wy = y + 88 - bh; wy < y + 60; wy += 17) {
        for (var wx = x + 8; wx < x + bw - 8; wx += 17) {
          if ((wx + wy + i) % 3) c.fillRect(wx, wy, 5, 7);
        }
      }
    }
    c.restore();
  }

  function drawPlazaFloor(c, b) {
    c.save();
    c.fillStyle = 'rgba(1, 8, 14, 0.72)';
    c.strokeStyle = 'rgba(0,255,204,0.2)';
    c.lineWidth = 1.5;
    roundRect(c, b.left, b.top, b.right - b.left, b.bottom - b.top, 18);
    c.fill();
    c.stroke();
    var cx = (b.left + b.right) / 2;
    var cy = b.top + (b.bottom - b.top) * 0.55;
    var grd = c.createRadialGradient(cx, cy, 12, cx, cy, Math.max(b.right - b.left, b.bottom - b.top) * 0.55);
    grd.addColorStop(0, 'rgba(0,255,204,0.18)');
    grd.addColorStop(0.42, 'rgba(255,43,214,0.07)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grd;
    c.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    c.strokeStyle = 'rgba(255,255,255,0.045)';
    for (var x = b.left + 30; x < b.right; x += 54) { c.beginPath(); c.moveTo(x, b.top); c.lineTo(x, b.bottom); c.stroke(); }
    for (var y = b.top + 30; y < b.bottom; y += 54) { c.beginPath(); c.moveTo(b.left, y); c.lineTo(b.right, y); c.stroke(); }
    c.strokeStyle = 'rgba(0,255,204,0.22)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(b.left + 40, cy); c.lineTo(b.right - 40, cy); c.stroke();
    c.beginPath(); c.moveTo(cx, b.top + 38); c.lineTo(cx, b.bottom - 38); c.stroke();
    c.fillStyle = 'rgba(252,238,9,0.08)';
    roundRect(c, cx - 125, cy - 42, 250, 84, 14);
    c.fill();
    c.fillStyle = 'rgba(0,232,255,0.09)';
    c.beginPath();
    c.ellipse(cx, cy + 4, 88 + Math.sin(W.t * 2) * 3, 30, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    drawTextPill(c, 'CITY GATE PLAZA', cx, b.top + 34, '#fcee09');
  }

  function drawPlazaRoutes(c, b) {
    var cx = (b.left + b.right) / 2;
    var cy = b.top + (b.bottom - b.top) * 0.56;
    c.save();
    c.setLineDash([10, 13]);
    c.lineDashOffset = -W.t * 34;
    c.lineWidth = 2;
    PLAZA_HOTSPOTS.forEach(function (h) {
      var p = plazaPoint(h);
      c.strokeStyle = h.color.replace(')', ',0.26)');
      if (c.strokeStyle === h.color) c.strokeStyle = h.color;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(cx, cy);
      c.quadraticCurveTo((cx + p.x) / 2, cy - 48, p.x, p.y + p.h / 2 + 14);
      c.stroke();
    });
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.restore();
  }

  function drawPlazaHotspots(c) {
    PLAZA_HOTSPOTS.forEach(function (h) {
      var p = plazaPoint(h);
      h._pos = p;
      var hover = W.hover && W.hover.type === 'hotspot' && W.hover.id === h.id;
      var focus = W.focus && W.focus.type === 'hotspot' && W.focus.id === h.id;
      c.save();
      c.shadowColor = h.color;
      c.shadowBlur = hover || focus ? 28 : 14;
      c.fillStyle = focus ? 'rgba(12,24,28,0.98)' : 'rgba(3,14,20,0.9)';
      c.strokeStyle = h.color;
      c.lineWidth = hover || focus ? 3 : 1.5;
      roundRect(c, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 12);
      c.fill();
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(p.x - p.w / 2 + 10, p.y - p.h / 2 + 10, p.w - 20, 10);
      c.fillStyle = 'rgba(0,0,0,0.24)';
      c.fillRect(p.x - p.w / 2 + 12, p.y + p.h / 2 - 22, p.w - 24, 13);
      if (h.kind === 'portal' || h.kind === 'gate') {
        c.strokeStyle = h.color;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(p.x, p.y + 4, Math.min(p.w, p.h) * 0.28 + Math.sin(W.t * 3) * 2, 0, Math.PI * 2);
        c.stroke();
      } else if (h.kind === 'academy' || h.kind === 'cafe') {
        c.fillStyle = h.color;
        for (var i = 0; i < 4; i++) c.fillRect(p.x - 54 + i * 28, p.y - 28, 13, 20);
      } else if (h.kind === 'console') {
        c.strokeStyle = h.color;
        c.beginPath();
        c.arc(p.x, p.y - 2, 25, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      c.fillStyle = h.color;
      c.font = "700 20px 'VT323',monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(h.icon, p.x, p.y - 10);
      c.font = "700 11px 'Share Tech Mono',monospace";
      c.fillStyle = '#eafcff';
      c.fillText(h.label, p.x, p.y + 15);
      c.strokeStyle = 'rgba(255,255,255,0.14)';
      c.beginPath(); c.arc(p.x, p.y + p.h / 2 + 12, 34, 0, Math.PI * 2); c.stroke();
    });
  }

  function drawPlazaActivities(c) {
    PLAZA_ACTIVITIES.forEach(function (a) {
      var p = plazaPoint({ x: a.x, y: a.y, w: a.r * 2, h: a.r * 2 });
      a._pos = p;
      var hover = W.hover && W.hover.type === 'activity' && W.hover.id === a.id;
      var focus = W.focus && W.focus.type === 'activity' && W.focus.id === a.id;
      c.save();
      c.shadowColor = a.color;
      c.shadowBlur = hover || focus ? 24 : 11;
      c.fillStyle = focus ? 'rgba(21,19,7,0.96)' : 'rgba(3,12,18,0.9)';
      c.strokeStyle = a.color;
      c.lineWidth = hover || focus ? 3 : 1.5;
      c.beginPath();
      c.arc(p.x, p.y, a.r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.beginPath();
      c.arc(p.x, p.y, a.r + 8 + Math.sin(W.t * 4) * 2, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = a.color;
      c.font = "700 17px 'VT323',monospace";
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(a.icon, p.x, p.y - 1);
      c.restore();
      c.font = "700 9px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.fillStyle = '#dffbff';
      c.fillText(a.label, p.x, p.y + a.r + 18);
    });
  }

  function drawPlazaNpcs(c) {
    PLAZA_NPCS.forEach(function (npc) {
      var p = plazaPoint({ x: npc.x, y: npc.y, w: 1, h: 1 });
      npc._pos = p;
      var hover = W.hover && W.hover.type === 'npc' && W.hover.id === npc.id;
      c.save();
      c.shadowColor = npc.color;
      c.shadowBlur = hover ? 20 : 10;
      c.fillStyle = 'rgba(2,8,14,0.96)';
      c.strokeStyle = npc.color;
      c.lineWidth = hover ? 3 : 1.5;
      c.beginPath(); c.arc(p.x, p.y, hover ? 19 : 16, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = npc.color;
      c.beginPath(); c.arc(p.x, p.y - 3, 5, 0, Math.PI * 2); c.fill();
      c.fillRect(p.x - 5, p.y + 3, 10, 10);
      c.restore();
      c.font = "9px 'Share Tech Mono',monospace";
      c.textAlign = 'center';
      c.fillStyle = '#dffbff';
      c.fillText(npc.name, p.x, p.y + 31);
      c.fillStyle = npc.color;
      c.font = "8px 'Share Tech Mono',monospace";
      c.fillText(npc.title || 'NPC', p.x, p.y + 43);
    });
  }

  function updateAvatar() {
    var b = plazaBounds();
    var dx = (W.keys.ArrowRight || W.keys.d ? 1 : 0) - (W.keys.ArrowLeft || W.keys.a ? 1 : 0);
    var dy = (W.keys.ArrowDown || W.keys.s ? 1 : 0) - (W.keys.ArrowUp || W.keys.w ? 1 : 0);
    if (dx || dy) {
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      W.avatar.tx = clamp(W.avatar.x + dx * 34, b.left + 34, b.right - 34);
      W.avatar.ty = clamp(W.avatar.y + dy * 34, b.top + 48, b.bottom - 34);
      if (dx) W.avatar.dir = dx > 0 ? 1 : -1;
    }
    var vx = W.avatar.tx - W.avatar.x;
    var vy = W.avatar.ty - W.avatar.y;
    var d = Math.sqrt(vx * vx + vy * vy);
    if (d > 1) {
      var step = Math.min(d, 4.8);
      W.avatar.x += vx / d * step;
      W.avatar.y += vy / d * step;
      if (Math.abs(vx) > 0.5) W.avatar.dir = vx > 0 ? 1 : -1;
    }
  }

  function drawAvatar(c) {
    var bob = Math.sin(W.t * 8) * 2;
    c.save();
    c.translate(W.avatar.x, W.avatar.y + bob);
    c.scale(W.avatar.dir, 1);
    c.shadowColor = '#00ffcc';
    c.shadowBlur = 22;
    if (WORLD_ASSETS.operative && WORLD_ASSETS.operative.complete) {
      c.drawImage(WORLD_ASSETS.operative, -34, -68, 68, 78);
    } else {
      c.fillStyle = '#00ffcc';
      c.fillRect(-13, -42, 26, 38);
    }
    c.restore();
    c.strokeStyle = 'rgba(0,255,204,0.7)';
    c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(W.avatar.x, W.avatar.y + 9, 34, 11, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(252,238,9,0.55)';
    c.beginPath(); c.arc(W.avatar.tx, W.avatar.ty, 10 + Math.sin(W.t * 7) * 2, 0, Math.PI * 2); c.stroke();
  }

  function drawPlazaBubble(c) {
    if (!W.plazaBubble.text || Date.now() > W.plazaBubble.until) return;
    var text = W.plazaBubble.speaker + ': ' + W.plazaBubble.text;
    var maxW = Math.min(520, W.w - 48);
    c.save();
    c.font = "700 11px 'Share Tech Mono',monospace";
    var metrics = c.measureText(text);
    var w = Math.min(maxW, metrics.width + 32);
    var x = clamp(W.avatar.x - w / 2, 18, W.w - w - 18);
    var y = clamp(W.avatar.y - 118, 82, W.h - 160);
    c.fillStyle = 'rgba(2,10,16,0.96)';
    c.strokeStyle = '#00ffcc';
    c.lineWidth = 1.5;
    roundRect(c, x, y, w, 42, 8);
    c.fill();
    c.stroke();
    c.fillStyle = '#eafcff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text.length > 86 ? text.slice(0, 83) + '...' : text, x + w / 2, y + 21);
    c.restore();
  }

  function setActionPanel(target) {
    var action = document.getElementById('cwg-action');
    if (!action) return;
    var go = document.getElementById('cwg-action-go');
    W.focus = target || null;
    if (!target) {
      action.dataset.active = '0';
      setText('cwg-action-lbl', 'CITY GATE PLAZA');
      setText('cwg-action-title', 'Walk to a kiosk');
      setText('cwg-action-sub', 'Click the plaza or use WASD / arrows to move.');
      if (go) go.textContent = 'TALK';
      return;
    }
    action.dataset.active = '1';
    if (target.type === 'npc') {
      setText('cwg-action-lbl', 'OPERATIVE NEARBY');
      setText('cwg-action-title', target.npc.name);
      setText('cwg-action-sub', npcDialogue(target.npc));
      if (go) go.textContent = target.npc.mission ? 'START ASSIGNMENT' : 'TALK';
      return;
    }
    if (target.type === 'activity') {
      setText('cwg-action-lbl', 'PLAZA INTERACTIVE');
      setText('cwg-action-title', target.activity.title);
      setText('cwg-action-sub', target.activity.desc);
      if (go) go.textContent = target.activity.action.indexOf('mission:') === 0 ? 'ENTER ' + target.activity.label : 'ACTIVATE ' + target.activity.label;
      return;
    }
    setText('cwg-action-lbl', 'INTERACTIVE KIOSK');
    setText('cwg-action-title', target.hotspot.title);
    setText('cwg-action-sub', target.hotspot.desc);
    if (go) go.textContent = 'ACTIVATE ' + target.hotspot.label;
  }

  function activateFocus() {
    if (!W.focus) {
      sayInPlaza('Guide', 'Click a building, NPC, or the floor. This is the social plaza hub.');
      return;
    }
    if (W.focus.type === 'npc') {
      var line = npcDialogue(W.focus.npc);
      sayInPlaza(W.focus.npc.name, line);
      pushMsg({ callsign: W.focus.npc.name, faction: 'NEUTRAL', body: line });
      Audio2.blip(640, 0.08, 'triangle');
      if (W.focus.npc.mission && (!missionDone(W.focus.npc.mission) || W.focus.npc.id === 'relay')) {
        setTimeout(function () { startGameplayMission(W.focus.npc.mission); }, 240);
      } else if (W.focus.npc.action) {
        runPlazaAction(W.focus.npc.action);
      }
      return;
    }
    var h = W.focus.hotspot || W.focus.activity;
    Audio2.blip(720, 0.08, 'triangle');
    runPlazaAction(h.action, h);
  }

  function sayInPlaza(speaker, text) {
    W.plazaBubble = { speaker: speaker || 'Guide', text: text || '', until: Date.now() + 3200 };
  }

  function startGameplayMission(id) {
    closeWorld();
    setTimeout(function () {
      try { window.__cwGameplay && window.__cwGameplay.startMission && window.__cwGameplay.startMission(id); } catch (e) {}
    }, 160);
  }

  function runPlazaAction(action, source) {
    if (!action) return;
    if (action.indexOf('mission:') === 0) { startGameplayMission(action.split(':')[1]); return; }
    if (action === 'academy') { try { window.__cwAcademy && window.__cwAcademy.open(); } catch (e) {} return; }
    if (action === 'net') { try { window.__cwNet && window.__cwNet.open(); } catch (e) {} return; }
    if (action === 'console') { try { window.__cwGameplay && window.__cwGameplay.open(); } catch (e) {} return; }
    if (action === 'profile') { window.open('/profile.html', '_blank', 'noopener'); return; }
    if (action === 'map') { toGrid(); return; }
    if (action === 'field') { startGameplayMission('mc-convoy'); return; }
    if (action === 'cache') { claimDailyCache(); return; }
    if (action === 'emote') { plazaEmote(); return; }
    if (action === 'guide') {
      sayInPlaza('Guide', 'Click the ground to walk. Pick a district, talk to NPCs for assignments, use Space/Pulse in field routes, and return here between runs.');
      pushMsg({ callsign: 'Guide', faction: 'NEUTRAL', body: 'City Gate Plaza connects Academy, Field, NET, Profile, Console, Relay Cave, and Stormcore.' });
      return;
    }
    if (source) sayInPlaza('System', source.title + ' is online.');
  }

  function claimDailyCache() {
    var key = 'cw.plaza.cacheDay';
    if (localStorage.getItem(key) === todayKey()) {
      sayInPlaza('Cache', 'Already claimed today. Come back after the next city reset.');
      Audio2.blip(180, 0.14, 'sawtooth');
      return;
    }
    localStorage.setItem(key, todayKey());
    try { window.__cwGameplay && window.__cwGameplay.gainCredits && window.__cwGameplay.gainCredits(125); } catch (e) {}
    try { window.__cwGameplay && window.__cwGameplay.gainItem && window.__cwGameplay.gainItem('PLAZA-CACHE', 1); } catch (e) {}
    sayInPlaza('Cache', '+125 credits and PLAZA-CACHE logged to inventory.');
    pushMsg({ callsign: 'Cache', faction: 'NEUTRAL', body: getOp().callsign + ' claimed the daily plaza cache.' });
    burstAt(W.avatar.x, W.avatar.y - 20, 32, '#fcee09');
  }

  function plazaEmote() {
    var op = getOp();
    var body = op.callsign + ' ' + PLAZA_EMOTES[W.emoteIndex % PLAZA_EMOTES.length] + '.';
    W.emoteIndex++;
    sayInPlaza(op.callsign, body.replace(op.callsign + ' ', ''));
    pushMsg({ callsign: 'EMOTE', faction: op.faction, body: body });
    burstAt(W.avatar.x, W.avatar.y - 34, 18, '#ff2bd6');
  }

  function runPlazaSocial(kind) {
    if (kind === 'emote') { plazaEmote(); return; }
    if (kind === 'chat') {
      var input = document.getElementById('cwg-comms-input');
      if (input) input.focus();
      sayInPlaza('Guide', 'Type in the plaza chat bar and press Enter.');
      return;
    }
    if (kind === 'friends') { runPlazaAction('net'); return; }
    if (kind === 'cache') { claimDailyCache(); return; }
    if (kind === 'map') { toGrid(); }
  }

  function boot() {
    ensureMounted();
    // Auto-enter the grid on first load unless suppressed.
    try {
      var p = new URLSearchParams(window.location.search || '');
      var suppress = p.get('nogrid') === '1';
      var launch = (p.get('launch') || '').toLowerCase();
      // Don't hijack if the user explicitly deep-linked into the academy or another launch.
      var academyDeep = p.get('academy') === '1' || launch === 'academy';
      if (!suppress && !academyDeep && !sessionStorage.getItem('cwg.autoclosed')) {
        setTimeout(openWorld, 600);
      } else {
        document.getElementById('cwg-relaunch').classList.add('show');
      }
    } catch (e) {}
    // periodic data refresh so grid reflects academy/net changes
    setInterval(function () { if (W.open) { refreshData(); try { if (window.__cwNet && window.__cwNet.roster) syncPlayers(window.__cwNet.roster()); } catch (e) {} } }, 4000);
  }

  // remember if user exits, so we don't re-hijack every soft refresh in the session
  var _closeOrig = closeWorld;
  closeWorld = function () { try { sessionStorage.setItem('cwg.autoclosed', '1'); } catch (e) {} _closeOrig(); };
  exposeWorldApi();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
  setTimeout(boot, 1600);
  // keep mounted through hydration
  setInterval(ensureMounted, 2500);
  try { new MutationObserver(function () { if (!document.getElementById('cwg-root')) ensureMounted(); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
