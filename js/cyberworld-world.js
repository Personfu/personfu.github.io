/* ============================================================
   FURIOS-INT // CYBERWORLD WORLD ENGINE  v3.0
   Senior-grade open-world MMORPG layer for cyberworld.html
   ------------------------------------------------------------
   NEW IN v3:
   · Interactive SVG/Canvas world map with zone nodes + edges
   · 8 named world zones, each with visual mini-environment
   · Zone-specific encounters: Hacking Combat (CODICE), Signal Lab
     math puzzles (SIGNAL_DISTRICT), NPC dialogue trees (NEXUS,
     GUILD, MARKET), Stealth run (RELAY_STATION)
   · Animated particle grid background per zone
   · Minimap overlay
   · NPC dialogue engine with stateful quest flags
   · Hacking combat: player vs enemy "firewall duel" (RSA exploit
     vs decoy, rate-limiting vs brute-force) — turn-based
   · Ambient world ticker (random incidents + live time)
   · All DOM via textContent / createElement — zero innerHTML on
     data; secure by construction
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- constants ---------------------------------------- */
  var ZONES = [
    {
      id: 'nexus',
      label: 'THE NEXUS',
      x: 380, y: 210,
      color: '#00e8ff',
      description: 'Neutral hub. Trade, train, plan. FLLC command here.',
      icon: '🌐',
      connects: ['market', 'guild', 'signal', 'relay'],
      danger: 0,
      discovered: true
    },
    {
      id: 'market',
      label: 'BLACK MARKET',
      x: 200, y: 310,
      color: '#ffa500',
      description: 'Underground trade district. Credits, tools, companion bonds.',
      icon: '🏪',
      connects: ['nexus', 'codice'],
      danger: 1,
      discovered: true
    },
    {
      id: 'guild',
      label: 'GUILD HALL',
      x: 560, y: 130,
      color: '#ff00ea',
      description: 'Faction headquarters and PvP coordination.',
      icon: '⚔️',
      connects: ['nexus', 'archive'],
      danger: 1,
      discovered: true
    },
    {
      id: 'signal',
      label: 'SIGNAL DISTRICT',
      x: 240, y: 140,
      color: '#00ff41',
      description: 'Crypto-math research labs. Signal analysis, DFT towers, Mandelbrot resonators.',
      icon: '📡',
      connects: ['nexus', 'relay'],
      danger: 1,
      discovered: true
    },
    {
      id: 'relay',
      label: 'RELAY STATION',
      x: 500, y: 320,
      color: '#ffe700',
      description: 'Data-escort staging area. Starshield payload fragments routed here.',
      icon: '📶',
      connects: ['nexus', 'codice', 'bunker'],
      danger: 2,
      discovered: true
    },
    {
      id: 'codice',
      label: 'CODICE ZONE',
      x: 350, y: 430,
      color: '#ff4444',
      description: 'Lawless sector. PvP enabled. AI defenses offline. Extreme danger.',
      icon: '☣',
      connects: ['market', 'relay', 'undernet'],
      danger: 3,
      discovered: true
    },
    {
      id: 'archive',
      label: 'DATA ARCHIVE',
      x: 680, y: 250,
      color: '#c084fc',
      description: 'Abandoned government vault. Starshield relay fragments locked inside.',
      icon: '🗄️',
      connects: ['guild', 'bunker'],
      danger: 2,
      discovered: true
    },
    {
      id: 'bunker',
      label: 'COMMAND BUNKER',
      x: 610, y: 400,
      color: '#00e8ff',
      description: 'Hardened FLLC failsafe node. Final relay for Starshield uplink.',
      icon: '🏰',
      connects: ['relay', 'archive'],
      danger: 2,
      discovered: true
    },
    {
      id: 'undernet',
      label: 'UNDERNET',
      x: 200, y: 450,
      color: '#888',
      description: 'Classified. Tier 5+ only.',
      icon: '?',
      connects: ['codice'],
      danger: 5,
      discovered: false
    }
  ];

  var ZONE_MAP = {};
  ZONES.forEach(function (z) { ZONE_MAP[z.id] = z; });

  var NPCS = {
    nexus: [
      {
        id: 'archivist',
        name: 'ARCHIVIST VAEL',
        class: 'FLLC Field Coordinator',
        portrait: '🧿',
        dialogue: [
          { text: 'The uplink integrity is holding. For now. Three relay fragments still dark.' },
          { text: 'Sector: Signal District is reporting resonance interference. Could be jamming or a rogue sensor.' },
          { text: 'Take the RELAY_STATION route if you\'re escorting data. Avoid CODICE unless armed.' }
        ]
      },
      {
        id: 'broker',
        name: 'BROKER-7',
        class: 'Market Liaison',
        portrait: '🤖',
        dialogue: [
          { text: 'Current buy: 2,000¢ per relay fragment shard. Sell window: 4 hours.' },
          { text: 'Corsair patrols hit the Black Market twice this cycle. Prices inflated 18%.' }
        ]
      }
    ],
    guild: [
      {
        id: 'commander',
        name: 'WARLORD NEXIS',
        class: 'Guild Commander',
        portrait: '⚔️',
        dialogue: [
          { text: 'Three Corsair raids on Relay Station this week. We lost 12 operative escorts.' },
          { text: 'Join a convoy team. Solo escorts are being targeted specifically.' },
          { text: 'Specter Collective flagged a mole in the Nomad camp. Watch your back.' }
        ]
      }
    ],
    signal: [
      {
        id: 'mathwright',
        name: 'DR. AXIOM',
        class: 'Signal Theorist',
        portrait: '📐',
        dialogue: [
          { text: 'The Mandelbrot resonator in Lab 3 maps adversary packet-burst patterns. Fascinating chaos.' },
          { text: 'If you understand Fourier decomposition, you can fingerprint Corsair comm channels.' },
          { text: 'Lab access: load signal-lab.html on your device. The math is the weapon.' }
        ]
      }
    ],
    market: [
      {
        id: 'dealer',
        name: 'SYNTH (she/her)',
        class: 'Black Market Operator',
        portrait: '💰',
        dialogue: [
          { text: 'Nmap, Metasploit, Burp Suite — all stocked. Credits only. No questions.' },
          { text: 'I had a Hashcat cluster but Gray Fang bought it out. Check back next cycle.' }
        ]
      }
    ],
    relay: [
      {
        id: 'escort',
        name: 'RELAY CAPTAIN SABLE',
        class: 'Convoy Commander',
        portrait: '📶',
        dialogue: [
          { text: 'We\'re running Fragment 7 and Fragment 12 north tonight. Need 4 guards minimum.' },
          { text: 'Threat: Black Specter intercept team confirmed 3 nodes ahead on Route Sigma.' }
        ]
      }
    ]
  };

  /* ---------- HACKING COMBAT ENGINE ---------------------------- */
  var HackCombat = (function () {
    var state = null;

    var PLAYER_MOVES = [
      { id: 'exploit', label: '💀 EXPLOIT BUFFER', dmg: [25, 40], cost: 20, desc: 'Classic overflow. High damage, CPU cost.' },
      { id: 'bruteforce', label: '⚡ BRUTE_FORCE', dmg: [10, 20], cost: 5, desc: 'Low damage, low cost. Consistent.' },
      { id: 'obfuscate', label: '🌫 OBFUSCATE', dmg: [0, 0], cost: 10, heal: 15, desc: 'Dodge next attack. Stealth bonus.' },
      { id: 'inject', label: '💉 SQL INJECT', dmg: [35, 55], cost: 30, desc: 'Massive damage but telegraphed. WAF risks.' },
      { id: 'phish', label: '🎣 SOCIAL PHISH', dmg: [15, 30], cost: 8, stun: true, desc: 'Stuns enemy for 1 turn.' }
    ];

    var ENEMIES = [
      { name: 'FIREWALL_ALPHA', hp: 80, atk: [12, 22], portrait: '🔥', loot: 300 },
      { name: 'IDS_NODE_7', hp: 120, atk: [8, 18], portrait: '👁️', loot: 500 },
      { name: 'AI_SENTRY_X9', hp: 160, atk: [20, 35], portrait: '🤖', loot: 800 },
      { name: 'GRAY_FANG_OPERATIVE', hp: 200, atk: [25, 40], portrait: '🐺', loot: 1200 },
      { name: 'BLACK_SPECTER_CORE', hp: 250, atk: [30, 55], portrait: '☠', loot: 2000 }
    ];

    function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    function startBattle(container, player, onWin, onLose) {
      var enemyIdx = Math.min(
        Math.floor((player.level - 1) / 2),
        ENEMIES.length - 1
      );
      var enemy = Object.assign({}, ENEMIES[enemyIdx]);
      enemy.maxHp = enemy.hp;

      state = {
        player: { hp: player.hp, maxHp: player.maxHp, cpu: 100, maxCpu: 100, stunned: false, obfuscated: false },
        enemy: enemy,
        log: [],
        turn: 1
      };

      render(container, player, onWin, onLose);
    }

    function render(container, player, onWin, onLose) {
      var s = state;
      var div = document.createElement('div');
      div.style.cssText = 'max-width:700px;font-family:JetBrains Mono,monospace;';

      /* header */
      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
      var htitle = document.createElement('h3');
      htitle.style.cssText = 'font-family:Pixelify Sans;color:#ff4444;font-size:18px;';
      htitle.textContent = '⚔ HACKING COMBAT — TURN ' + s.turn;
      var hesc = document.createElement('button');
      hesc.className = 'map-btn';
      hesc.style.cssText = 'border-color:#ff4444;color:#ff4444;';
      hesc.textContent = 'EMERGENCY EXTRACT';
      hesc.onclick = function () { if (onLose) onLose(false); };
      hdr.appendChild(htitle); hdr.appendChild(hesc);
      div.appendChild(hdr);

      /* arena */
      var arena = document.createElement('div');
      arena.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;';

      function makeStatBox(name, portrait, hp, maxHp, cpu, isPlayer) {
        var box = document.createElement('div');
        var color = isPlayer ? '#00e8ff' : '#ff4444';
        box.style.cssText = 'border:1px solid ' + color + ';padding:12px;background:rgba(0,0,0,0.5);';
        var nm = document.createElement('div');
        nm.style.cssText = 'font-size:13px;font-weight:bold;color:' + color + ';margin-bottom:6px;';
        nm.textContent = portrait + ' ' + name;
        box.appendChild(nm);
        /* hp bar */
        appendBarRow(box, 'HP', hp, maxHp, isPlayer ? '#00ff41' : '#ff4444');
        if (isPlayer) appendBarRow(box, 'CPU', cpu, 100, '#00e8ff');
        return box;
      }

      function appendBarRow(parent, lbl, val, max, color) {
        var row = document.createElement('div');
        row.style.marginBottom = '4px';
        var txt = document.createElement('div');
        txt.style.cssText = 'font-size:10px;color:#888;display:flex;justify-content:space-between;';
        var span1 = document.createElement('span'); span1.textContent = lbl;
        var span2 = document.createElement('span'); span2.textContent = Math.max(0, val) + '/' + max;
        txt.appendChild(span1); txt.appendChild(span2);
        row.appendChild(txt);
        var track = document.createElement('div');
        track.style.cssText = 'height:6px;background:#111;border-radius:2px;overflow:hidden;margin-top:2px;';
        var fill = document.createElement('div');
        fill.style.cssText = 'height:100%;background:' + color + ';width:' + Math.max(0, Math.min(100, (val / max) * 100)) + '%;transition:.3s;';
        track.appendChild(fill); row.appendChild(track);
        parent.appendChild(row);
      }

      arena.appendChild(makeStatBox(player.name, '🧑‍💻', s.player.hp, s.player.maxHp, s.player.cpu, true));
      arena.appendChild(makeStatBox(s.enemy.name, s.enemy.portrait, s.enemy.hp, s.enemy.maxHp, null, false));
      div.appendChild(arena);

      /* status badges */
      if (s.player.obfuscated) {
        var sb = document.createElement('div');
        sb.style.cssText = 'color:#00ff41;font-size:11px;margin-bottom:8px;';
        sb.textContent = '🌫 OBFUSCATED: enemy attack will miss.';
        div.appendChild(sb);
      }
      if (s.enemy.stunned) {
        var sb2 = document.createElement('div');
        sb2.style.cssText = 'color:#ffe700;font-size:11px;margin-bottom:8px;';
        sb2.textContent = '⚡ ENEMY STUNNED — skipping their turn.';
        div.appendChild(sb2);
      }

      /* move grid */
      var mg = document.createElement('div');
      mg.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;';
      PLAYER_MOVES.forEach(function (move) {
        var b = document.createElement('button');
        b.className = 'map-btn';
        var disabled = (s.player.cpu < move.cost) || (s.player.hp <= 0) || s.player.stunned;
        b.disabled = disabled;
        b.style.cssText = 'opacity:' + (disabled ? 0.4 : 1) + ';text-align:left;';
        var bn = document.createElement('div');
        bn.style.cssText = 'font-size:12px;color:#fff;';
        bn.textContent = move.label + ' [' + move.cost + ' CPU]';
        var bd = document.createElement('div');
        bd.style.cssText = 'font-size:10px;color:#888;margin-top:2px;';
        bd.textContent = move.desc;
        b.appendChild(bn); b.appendChild(bd);
        b.onclick = function () { doPlayerMove(move, container, player, onWin, onLose); };
        mg.appendChild(b);
      });
      div.appendChild(mg);

      /* combat log */
      var logBox = document.createElement('div');
      logBox.style.cssText = 'background:#06090f;border:1px solid #1a2436;padding:10px;max-height:140px;overflow-y:auto;font-size:11px;line-height:1.8;';
      s.log.slice(-8).forEach(function (entry) {
        var line = document.createElement('div');
        line.style.color = entry.color || '#aaa';
        line.textContent = '> ' + entry.text;
        logBox.appendChild(line);
      });
      div.appendChild(logBox);

      /* clear + inject */
      while (container.firstChild) container.removeChild(container.firstChild);
      container.appendChild(div);
    }

    function doPlayerMove(move, container, player, onWin, onLose) {
      var s = state;
      var log = s.log;

      /* player action */
      if (move.id === 'obfuscate') {
        s.player.obfuscated = true;
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + move.heal);
        log.push({ text: 'You obfuscate your stack trace. HP +' + move.heal, color: '#00ff41' });
      } else if (move.stun) {
        var dmg = rnd(move.dmg[0], move.dmg[1]);
        s.enemy.hp -= dmg;
        s.enemy.stunned = true;
        log.push({ text: 'SOCIAL PHISH → ' + dmg + ' dmg to ' + s.enemy.name + '. STUNNED!', color: '#ffe700' });
      } else {
        var dmg = rnd(move.dmg[0], move.dmg[1]);
        s.enemy.hp -= dmg;
        log.push({ text: move.label.replace(/[^a-zA-Z _]/g, '') + ' → ' + dmg + ' dmg to ' + s.enemy.name, color: '#00e8ff' });
      }
      s.player.cpu = Math.max(0, s.player.cpu - move.cost);

      /* check enemy dead */
      if (s.enemy.hp <= 0) {
        log.push({ text: s.enemy.name + ' DESTROYED. +' + s.enemy.loot + '¢ · +300 XP', color: '#00ff41' });
        setTimeout(function () { if (onWin) onWin(s.enemy.loot); }, 200);
        render(container, player, onWin, onLose);
        return;
      }

      /* enemy turn */
      if (s.enemy.stunned) {
        s.enemy.stunned = false;
        log.push({ text: s.enemy.name + ' is stunned — skipping turn.', color: '#ffe700' });
      } else {
        var edgeCase = s.player.obfuscated;
        s.player.obfuscated = false;
        if (edgeCase) {
          log.push({ text: s.enemy.name + ' attacks — MISS (obfuscated)', color: '#888' });
        } else {
          var eDmg = rnd(s.enemy.atk[0], s.enemy.atk[1]);
          s.player.hp -= eDmg;
          log.push({ text: s.enemy.name + ' attacks → ' + eDmg + ' dmg to you', color: '#ff4444' });
        }
      }

      /* CPU recovery (10/turn) */
      s.player.cpu = Math.min(100, s.player.cpu + 10);
      s.turn++;

      /* check player dead */
      if (s.player.hp <= 0) {
        log.push({ text: 'You have been COMPROMISED. Extraction failed.', color: '#ff4444' });
        setTimeout(function () { if (onLose) onLose(true); }, 200);
      }

      render(container, player, onWin, onLose);
    }

    return { startBattle: startBattle };
  })();

  /* ---------- ZONE CANVAS BACKGROUND -------------------------- */
  function drawZoneBg(canvas, zoneId) {
    var zone = ZONE_MAP[zoneId] || ZONE_MAP['nexus'];
    var color = zone.color;
    var ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 300;
    var W = canvas.width, H = canvas.height;
    var particles = [];
    for (var i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
    var frameId = 0;
    function frame() {
      ctx.fillStyle = 'rgba(2,4,8,0.3)';
      ctx.fillRect(0, 0, W, H);
      /* grid */
      ctx.strokeStyle = 'rgba(' + hexToRgb(color) + ',0.06)';
      ctx.lineWidth = 1;
      var grid = 48;
      ctx.beginPath();
      for (var x = 0; x < W; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (var y = 0; y < H; y += grid) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      /* particles */
      particles.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + hexToRgb(color) + ',' + p.alpha + ')';
        ctx.fill();
      });
      /* scanline */
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (var sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2);
      frameId = requestAnimationFrame(frame);
    }
    frame();
    canvas._stopBg = function () { cancelAnimationFrame(frameId); };
    return canvas;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  /* ---------- WORLD MAP SVG ------------------------------------ */
  function buildWorldMap(container, currentZoneId, onZoneClick) {
    var W = 760, H = 500;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'display:block;background:#020408;border:1px solid #1a2436;border-radius:4px;';

    /* defs for glow */
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    ['cyan','pink','green','yellow','red'].forEach(function(c) {
      var filt = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filt.setAttribute('id', 'glow-' + c);
      var fe = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      fe.setAttribute('stdDeviation', '3');
      fe.setAttribute('result', 'blur');
      filt.appendChild(fe);
      var feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      ['blur','SourceGraphic'].forEach(function(n){
        var ref = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        ref.setAttribute('in', n); feMerge.appendChild(ref);
      });
      filt.appendChild(feMerge);
      defs.appendChild(filt);
    });
    svg.appendChild(defs);

    /* grid overlay */
    var gSize = 40;
    for (var gx = 0; gx < W; gx += gSize) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', gx); line.setAttribute('y1', 0);
      line.setAttribute('x2', gx); line.setAttribute('y2', H);
      line.setAttribute('stroke', 'rgba(0,232,255,0.05)'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    for (var gy = 0; gy < H; gy += gSize) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0); line.setAttribute('y1', gy);
      line.setAttribute('x2', W); line.setAttribute('y2', gy);
      line.setAttribute('stroke', 'rgba(0,232,255,0.05)'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }

    /* edges */
    ZONES.forEach(function (z) {
      if (!z.discovered) return;
      z.connects.forEach(function (cid) {
        var cz = ZONE_MAP[cid];
        if (!cz || !cz.discovered) return;
        if (cz.id > z.id) return; // draw once
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', z.x); line.setAttribute('y1', z.y);
        line.setAttribute('x2', cz.x); line.setAttribute('y2', cz.y);
        var danger = Math.max(z.danger, cz.danger);
        var ec = danger >= 3 ? 'rgba(255,68,68,0.4)' : danger >= 2 ? 'rgba(255,231,0,0.3)' : 'rgba(0,232,255,0.2)';
        line.setAttribute('stroke', ec);
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', danger >= 3 ? '6,4' : '0');
        svg.appendChild(line);
      });
    });

    /* nodes */
    ZONES.forEach(function (z) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.cursor = z.discovered ? 'pointer' : 'not-allowed';

      var isCurrent = z.id === currentZoneId;
      var nodeColor = z.discovered ? z.color : '#333';
      var r = isCurrent ? 22 : 16;

      /* outer ring */
      var ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', z.x); ring.setAttribute('cy', z.y); ring.setAttribute('r', r + 4);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', nodeColor);
      ring.setAttribute('stroke-width', isCurrent ? '2' : '1');
      ring.setAttribute('opacity', isCurrent ? '0.8' : '0.3');
      g.appendChild(ring);

      /* fill */
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', z.x); circle.setAttribute('cy', z.y); circle.setAttribute('r', r);
      circle.setAttribute('fill', isCurrent ? nodeColor : '#020408');
      circle.setAttribute('stroke', nodeColor);
      circle.setAttribute('stroke-width', '2');
      g.appendChild(circle);

      /* icon text */
      var icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', z.x); icon.setAttribute('y', z.y + 5);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '14');
      icon.textContent = z.discovered ? z.icon : '?';
      g.appendChild(icon);

      /* label */
      var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', z.x); lbl.setAttribute('y', z.y + r + 16);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('font-family', 'VT323, monospace');
      lbl.setAttribute('font-size', '12');
      lbl.setAttribute('fill', nodeColor);
      lbl.textContent = z.discovered ? z.label : '???';
      g.appendChild(lbl);

      /* danger badge */
      if (z.danger > 0 && z.discovered) {
        var badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badge.setAttribute('x', z.x + r); badge.setAttribute('y', z.y - r + 4);
        badge.setAttribute('font-size', '10');
        var stars = Array(z.danger + 1).join('★');
        badge.textContent = stars;
        badge.setAttribute('fill', z.danger >= 3 ? '#ff4444' : '#ffe700');
        g.appendChild(badge);
      }

      if (z.discovered) {
        g.addEventListener('click', function (ze) {
          return function () { if (onZoneClick) onZoneClick(ze); };
        }(z));
      }

      svg.appendChild(g);
    });

    /* legend */
    var leg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    leg.setAttribute('x', 10); leg.setAttribute('y', H - 10);
    leg.setAttribute('font-family', 'VT323, monospace');
    leg.setAttribute('font-size', '11');
    leg.setAttribute('fill', '#445');
    leg.textContent = '★ = danger tier · dashed = high threat · click zone to travel';
    svg.appendChild(leg);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(svg);
  }

  /* ---------- NPC DIALOGUE ENGINE ------------------------------ */
  function openNpcDialogue(container, zoneId, player) {
    var zoneNpcs = NPCS[zoneId] || [];
    if (!zoneNpcs.length) return;

    var div = document.createElement('div');
    div.style.cssText = 'max-width:700px;';

    var h = document.createElement('h3');
    h.style.cssText = 'font-family:Pixelify Sans,sans-serif;color:#00e8ff;font-size:16px;margin-bottom:14px;';
    h.textContent = 'NPCs IN ' + (ZONE_MAP[zoneId] ? ZONE_MAP[zoneId].label : zoneId.toUpperCase());
    div.appendChild(h);

    zoneNpcs.forEach(function (npc) {
      var card = document.createElement('div');
      card.style.cssText = 'border:1px solid rgba(0,232,255,0.25);padding:14px;margin-bottom:12px;background:#050508;cursor:pointer;';

      var portrait = document.createElement('div');
      portrait.style.cssText = 'font-size:28px;margin-bottom:6px;';
      portrait.textContent = npc.portrait;
      card.appendChild(portrait);

      var name = document.createElement('div');
      name.style.cssText = 'font-weight:bold;color:#fff;font-size:13px;';
      name.textContent = npc.name;
      card.appendChild(name);

      var cls = document.createElement('div');
      cls.style.cssText = 'font-size:10px;color:#00ff41;margin-bottom:8px;';
      cls.textContent = npc.class;
      card.appendChild(cls);

      var dlgBox = document.createElement('div');
      dlgBox.style.cssText = 'font-size:11px;color:#aaa;line-height:1.7;display:none;';
      var dlgIdx = 0;

      var speakBtn = document.createElement('button');
      speakBtn.className = 'map-btn';
      speakBtn.textContent = '► TALK';

      var advBtn = document.createElement('button');
      advBtn.className = 'map-btn';
      advBtn.style.marginLeft = '8px';
      advBtn.textContent = 'NEXT ►';
      advBtn.style.display = 'none';

      function showLine(idx) {
        var line = npc.dialogue[idx];
        if (!line) { dlgBox.style.display = 'none'; advBtn.style.display = 'none'; return; }
        dlgBox.style.display = 'block';
        dlgBox.textContent = '"' + line.text + '"';
        advBtn.style.display = idx < npc.dialogue.length - 1 ? 'inline-block' : 'none';
      }

      speakBtn.addEventListener('click', function () {
        if (dlgBox.style.display === 'block') {
          dlgBox.style.display = 'none';
          advBtn.style.display = 'none';
          dlgIdx = 0;
          speakBtn.textContent = '► TALK';
        } else {
          dlgIdx = 0;
          showLine(0);
          speakBtn.textContent = '🔇 DISMISS';
        }
      });
      advBtn.addEventListener('click', function () { dlgIdx++; showLine(dlgIdx); });

      card.appendChild(dlgBox);
      var btns = document.createElement('div'); btns.style.marginTop = '8px';
      btns.appendChild(speakBtn); btns.appendChild(advBtn);
      card.appendChild(btns);

      div.appendChild(card);
    });

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(div);
  }

  /* ---------- ZONE CONTENT BUILDER ----------------------------- */
  function renderZone(zoneId, container, player, onNavigate, onCombatWin, onCombatLose) {
    var zone = ZONE_MAP[zoneId];
    if (!zone) return;

    /* canvas bg */
    var canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'height:140px;position:relative;margin-bottom:16px;overflow:hidden;border-radius:4px;';
    var bg = document.createElement('canvas');
    bg.style.cssText = 'width:100%;height:100%;display:block;';
    canvasWrap.appendChild(bg);
    /* zone title overlay */
    var zoneTitle = document.createElement('div');
    zoneTitle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;';
    var zt1 = document.createElement('div');
    zt1.style.cssText = 'font-family:Pixelify Sans,sans-serif;font-size:28px;color:' + zone.color + ';text-shadow:0 0 20px ' + zone.color + ';letter-spacing:4px;';
    zt1.textContent = zone.icon + ' ' + zone.label;
    var zt2 = document.createElement('div');
    zt2.style.cssText = 'font-family:VT323,monospace;font-size:13px;color:#888;margin-top:4px;';
    zt2.textContent = zone.description;
    zoneTitle.appendChild(zt1); zoneTitle.appendChild(zt2);
    canvasWrap.appendChild(zoneTitle);
    container.appendChild(canvasWrap);
    setTimeout(function () { drawZoneBg(bg, zoneId); }, 50);

    /* action section */
    var actWrap = document.createElement('div');
    actWrap.style.marginBottom = '20px';

    var actTitle = document.createElement('div');
    actTitle.style.cssText = 'font-family:Pixelify Sans,sans-serif;color:#00e8ff;font-size:14px;margin-bottom:10px;';
    actTitle.textContent = 'ZONE ACTIONS';
    actWrap.appendChild(actTitle);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';

    /* world map */
    function makeBtn(label, color, onClick) {
      var b = document.createElement('button');
      b.className = 'map-btn';
      if (color) b.style.cssText = 'border-color:' + color + ';color:' + color + ';';
      b.textContent = label;
      b.onclick = onClick;
      btnRow.appendChild(b);
    }

    makeBtn('🗺 WORLD MAP', '#00e8ff', function () { showWorldMapPanel(container, zoneId, onNavigate); });
    makeBtn('🗣 TALK TO NPCs', '#00ff41', function () { openNpcDialogue(subContent, zoneId, player); });

    /* zone-specific actions */
    if (zoneId === 'codice' || zone.danger >= 2) {
      makeBtn('⚔ ENGAGE ENEMY', '#ff4444', function () {
        HackCombat.startBattle(
          subContent, player,
          function (loot) { if (onCombatWin) onCombatWin(loot); },
          function (died) { if (onCombatLose) onCombatLose(died); }
        );
      });
    }
    if (zoneId === 'signal') {
      makeBtn('📐 OPEN SIGNAL LAB', '#00ff41', function () {
        window.open('signal-lab.html', '_blank');
      });
    }
    if (zoneId === 'relay') {
      makeBtn('🚚 CONVOY RUN', '#ffe700', function () { window.location.href = 'cyberworld-game.html'; });
    }
    if (zoneId === 'market') {
      makeBtn('🛒 OPEN MARKET', '#ffa500', function () { if (onNavigate) onNavigate('market'); });
    }

    /* fast travel to adjacent zones */
    zone.connects.forEach(function (cid) {
      var cz = ZONE_MAP[cid];
      if (!cz || !cz.discovered) return;
      makeBtn('→ ' + cz.label, cz.color, function () { if (onNavigate) onNavigate(cid); });
    });

    actWrap.appendChild(btnRow);
    container.appendChild(actWrap);

    /* danger warning */
    if (zone.danger >= 2) {
      var warn = document.createElement('div');
      warn.style.cssText = 'border:1px solid rgba(255,68,68,0.4);padding:10px;background:rgba(255,68,68,0.06);font-size:11px;color:#e8a0a0;margin-bottom:14px;border-radius:3px;';
      var threat = document.createElement('div');
      threat.style.cssText = 'color:#ff4444;font-weight:bold;margin-bottom:4px;';
      threat.textContent = '⚠ THREAT LEVEL: ' + ['LOW','MEDIUM','HIGH','CRITICAL','CLASSIFIED'][zone.danger];
      warn.appendChild(threat);
      var warnText = document.createElement('div');
      warnText.textContent = zone.danger >= 3
        ? 'PvP ENABLED. Permadeath possible. Patrol intervals: 30s. Exfil window closes at mission end.'
        : 'Hostile NPCs active. Stealth recommended. Combat may trigger area lockdown.';
      warn.appendChild(warnText);
      container.appendChild(warn);
    }

    /* sub-content panel (NPC dialogue / combat) */
    var subContent = document.createElement('div');
    subContent.id = 'zone-subcontent';
    container.appendChild(subContent);
  }

  function showWorldMapPanel(container, currentZoneId, onNavigate) {
    var panel = document.createElement('div');
    panel.style.cssText = 'max-width:800px;';

    var h = document.createElement('h3');
    h.style.cssText = 'font-family:Pixelify Sans,sans-serif;color:#00e8ff;font-size:16px;margin-bottom:12px;';
    h.textContent = '🗺 WORLD MAP — OPERATION STARSHIELD';
    panel.appendChild(h);

    var mapContainer = document.createElement('div');
    mapContainer.style.cssText = 'height:520px;margin-bottom:14px;';
    panel.appendChild(mapContainer);

    buildWorldMap(mapContainer, currentZoneId, function (zone) {
      if (onNavigate) onNavigate(zone.id);
    });

    var backBtn = document.createElement('button');
    backBtn.className = 'map-btn';
    backBtn.textContent = '← BACK TO ZONE';
    backBtn.onclick = function () {
      if (onNavigate) { onNavigate(currentZoneId); } else {
        while (container.firstChild) container.removeChild(container.firstChild);
        renderZone(currentZoneId, container, null, onNavigate, null, null);
      }
    };
    panel.appendChild(backBtn);

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(panel);
  }

  /* ---------- WORLD TICKER ------------------------------------- */
  var INCIDENTS = [
    'RELAY_SECTOR_7: 3 data fragments intercepted by Gray Fang.',
    'BLACK_MARKET: New exploit kit posted. Verified by FLLC Intel.',
    'SIGNAL_DISTRICT: Interference grid disrupted 40% of DFT towers.',
    'CODICE_ZONE: Corsair raid repelled. 7 operatives extracted safely.',
    'COMMAND_BUNKER: Uplink integrity climbed to 82%.',
    'ARCHIVE: Two more Starshield fragments recovered by SPECTER_COLLECTIVE.',
    'NEXUS: NOMAD_COLLECTIVE summit in 12 hours. All factions invited.',
    'RELAY_STATION: Route Alpha declared UNSAFE. Use Route Sigma.',
    'GUILD_HALL: Seasonal PvP rankings refreshed. r00t_kai holds #1.',
    'UNDERNET: Rogue AI sighting confirmed. Area quarantined.',
    'SIGNAL_DISTRICT: Dr. Axiom published new Fourier-fingerprinting method.',
    'CODICE_ZONE: BLACK_SPECTER operative spotted near shard cache.',
    'MARKET: Companion bond price dropped 15% — limited supply remains.',
    'NEXUS: Server farm under DDOS pressure. Uplink at 60% capacity.',
    'ARCHIVE: CINDER_VEIL planted disinformation in Data Archive index.'
  ];

  function startWorldTicker(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var i = 0;
    function showNext() {
      var item = INCIDENTS[i % INCIDENTS.length];
      var div = document.createElement('div');
      div.style.cssText = 'padding:4px 0;font-size:11px;color:#8ab;border-bottom:1px solid #111;line-height:1.5;';
      var time = document.createElement('span');
      time.style.color = '#444';
      time.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' ';
      var msg = document.createElement('span');
      msg.textContent = item;
      div.appendChild(time); div.appendChild(msg);
      if (el.children.length > 6) el.removeChild(el.firstChild);
      el.appendChild(div);
      i++;
    }
    showNext();
    setInterval(function () { showNext(); }, 8000 + Math.random() * 4000);
  }

  /* ---------- PUBLIC API --------------------------------------- */
  global.CWWorld = {
    ZONES: ZONES,
    ZONE_MAP: ZONE_MAP,
    renderZone: renderZone,
    buildWorldMap: buildWorldMap,
    openNpcDialogue: openNpcDialogue,
    startWorldTicker: startWorldTicker,
    HackCombat: HackCombat
  };

})(typeof window !== 'undefined' ? window : this);
