/* =============================================================
 *  site-stats.js  ·  FLLC unified progress aggregator
 * -------------------------------------------------------------
 *  Reads localStorage keys produced by all FLLC game engines and
 *  produces a single, WeChall-style stats summary plus tiny render
 *  helpers that any page can mount with ONE line.
 *
 *  Public API (window.SiteStats):
 *     SiteStats.summary()              -> { totalXP, totalSolves, totalChallenges,
 *                                           pct, rank, tier, tracks:[...],
 *                                           recent:[...], arcade:[...] }
 *     SiteStats.renderStrip(mountId)   -> compact inline horizontal strip
 *     SiteStats.renderPanel(mountId)   -> full vertical dossier panel
 *     SiteStats.renderRecent(mountId)  -> recent-solves list
 *     SiteStats.refresh()              -> manually re-paint all mounted views
 *
 *  Storage keys consulted (read-only):
 *     fllc.wargames.v1            { solved[], xp, rank, hints, firstSolve }
 *     fllc.forensics.v1           same shape
 *     fllc.redops.v1              same shape
 *     cyberworld-ctf-progress     { solved[], totalAttempts, score? }
 *     hs_snake / hs_defender / ... arcade integers
 *     cyberworld-player           { handle, faction, subscriptionTier }
 *
 *  Defensive: never throws. If keys are absent, treats them as zero.
 * ============================================================= */
(function () {
  'use strict';

  var TRACKS = [
    { id: 'wargames',  label: 'WAR_GAMES',     key: 'fllc.wargames.v1',   total: 12, color: '#00ff41', href: 'wargames.html'  },
    { id: 'forensics', label: 'FORENSICS_LAB', key: 'fllc.forensics.v1',  total: 12, color: '#ffa500', href: 'forensics.html' },
    { id: 'redops',    label: 'RED_OPS_RANGE', key: 'fllc.redops.v1',     total: 12, color: '#ff4444', href: 'redops.html'    },
    { id: 'ctf',       label: 'CTF_TRAIL',     key: 'cyberworld-ctf-progress', total: 20, color: '#00e8ff', href: 'ctf-trail.html', shape: 'ctf' }
  ];

  var ARCADE = [
    { id: 'snake',    label: 'CYBER_SNAKE',     key: 'hs_snake'    },
    { id: 'defender', label: 'PACKET_DEFENDER', key: 'hs_defender' },
    { id: 'hex',      label: 'HEX_BREAKER',     key: 'hs_hex'      },
    { id: 'wire',     label: 'WIRE_RUNNER',     key: 'hs_wire'     }
  ];

  // wargames engine ranks -> XP threshold (kept in sync w/ wargames-engine.js)
  var RANKS = [
    { name: '◇ RECRUIT',   xp: 0    },
    { name: '◆ ROOKIE',    xp: 300  },
    { name: '🔥 OPERATIVE', xp: 1000 },
    { name: '⚡ ELITE',     xp: 2500 },
    { name: '👑 LEGEND',    xp: 5000 }
  ];

  function safeJSON(raw, fb) {
    try { return raw ? JSON.parse(raw) : fb; } catch (e) { return fb; }
  }
  function readKey(key) {
    try { return safeJSON(localStorage.getItem(key), null); } catch (e) { return null; }
  }
  function readInt(key) {
    try {
      var n = parseInt(localStorage.getItem(key) || '0', 10);
      return isFinite(n) ? n : 0;
    } catch (e) { return 0; }
  }

  function rankFor(xp) {
    var r = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].xp) r = RANKS[i];
    }
    return r;
  }
  function nextRank(xp) {
    for (var i = 0; i < RANKS.length; i++) {
      if (RANKS[i].xp > xp) return RANKS[i];
    }
    return null;
  }

  function normalizeTrack(t) {
    var raw = readKey(t.key);
    var solved = [], xp = 0, firstSolve = {}, hints = {}, attempts = {};
    if (raw) {
      if (t.shape === 'ctf') {
        if (Array.isArray(raw.solved)) solved = raw.solved.slice();
        if (raw.firstSolve && typeof raw.firstSolve === 'object') firstSolve = raw.firstSolve;
        // Approximate CTF XP: 100 per solve unless score field exists
        xp = (typeof raw.score === 'number') ? raw.score : (solved.length * 100);
      } else {
        if (Array.isArray(raw.solved)) solved = raw.solved.slice();
        if (typeof raw.xp === 'number') xp = raw.xp;
        if (raw.firstSolve && typeof raw.firstSolve === 'object') firstSolve = raw.firstSolve;
        if (raw.hints      && typeof raw.hints      === 'object') hints      = raw.hints;
        if (raw.attempts   && typeof raw.attempts   === 'object') attempts   = raw.attempts;
      }
    }
    var pct = t.total > 0 ? Math.round((solved.length / t.total) * 100) : 0;
    return {
      id: t.id, label: t.label, key: t.key, color: t.color, href: t.href,
      total: t.total, solved: solved, solveCount: solved.length, pct: pct,
      xp: xp, hints: hints, attempts: attempts, firstSolve: firstSolve
    };
  }

  function summary() {
    var tracks = TRACKS.map(normalizeTrack);
    var totalXP = 0, totalSolves = 0, totalCh = 0;
    tracks.forEach(function (t) { totalXP += t.xp; totalSolves += t.solveCount; totalCh += t.total; });
    var pct = totalCh > 0 ? Math.round((totalSolves / totalCh) * 100) : 0;
    var rank = rankFor(totalXP), nxt = nextRank(totalXP);

    // recent solves: flatten all firstSolve maps, sort desc, take 8
    var recent = [];
    tracks.forEach(function (t) {
      Object.keys(t.firstSolve || {}).forEach(function (mid) {
        recent.push({ track: t.label, color: t.color, mid: mid, ts: t.firstSolve[mid], href: t.href });
      });
    });
    recent.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

    var arcade = ARCADE.map(function (g) {
      return { id: g.id, label: g.label, hi: readInt(g.key) };
    });

    var player = readKey('cyberworld-player') || {};

    return {
      handle:      player.handle      || 'Personfu',
      faction:     player.faction     || 'NEUTRAL',
      tier:        (player.subscriptionTier || 'guest').toUpperCase(),
      totalXP:     totalXP,
      totalSolves: totalSolves,
      totalChallenges: totalCh,
      pct:         pct,
      rank:        rank.name,
      rankXP:      rank.xp,
      nextRank:    nxt ? nxt.name : null,
      nextRankXP:  nxt ? nxt.xp   : null,
      progressToNext: nxt ? Math.max(0, Math.min(100, Math.round(((totalXP - rank.xp) / (nxt.xp - rank.xp)) * 100))) : 100,
      tracks:      tracks,
      recent:      recent.slice(0, 8),
      arcade:      arcade
    };
  }

  // -------------------- DOM helpers --------------------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function injectStyles() {
    if (document.getElementById('site-stats-css')) return;
    var s = document.createElement('style');
    s.id = 'site-stats-css';
    s.textContent = [
      '.ss-strip{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;background:#02060a;',
      '  border:1px solid rgba(0,232,255,0.25);padding:10px 14px;font-family:"VT323",monospace;color:#cfe7ee;}',
      '.ss-strip .ss-id{display:flex;flex-direction:column;gap:2px;min-width:160px;border-right:1px dashed rgba(0,232,255,0.2);padding-right:10px;}',
      '.ss-strip .ss-handle{font-family:"Pixelify Sans",sans-serif;font-size:18px;color:#fff;letter-spacing:1px;}',
      '.ss-strip .ss-rank{font-size:14px;color:#ffe700;}',
      '.ss-strip .ss-meta{font-size:12px;color:#7c9aa3;}',
      '.ss-strip .ss-tracks{display:flex;flex:1 1 auto;gap:8px;flex-wrap:wrap;}',
      '.ss-track{flex:1 1 140px;min-width:130px;background:#040a14;border:1px solid rgba(0,232,255,0.15);padding:6px 9px;text-decoration:none;color:#cfe7ee;transition:.15s;}',
      '.ss-track:hover{border-color:#00e8ff;box-shadow:0 0 14px rgba(0,232,255,0.18);transform:translateY(-1px);}',
      '.ss-track .lbl{font-size:13px;letter-spacing:1px;}',
      '.ss-track .num{font-size:18px;color:#fff;font-family:"Pixelify Sans",sans-serif;}',
      '.ss-track .bar{height:5px;background:#000;border:1px solid rgba(0,232,255,0.18);position:relative;overflow:hidden;margin-top:4px;}',
      '.ss-track .bar i{display:block;height:100%;}',
      '.ss-strip .ss-xp{flex:0 0 220px;display:flex;flex-direction:column;justify-content:center;}',
      '.ss-xp .lbl{font-size:13px;color:#7c9aa3;letter-spacing:1px;}',
      '.ss-xp .val{font-family:"Pixelify Sans",sans-serif;font-size:22px;color:#00ff41;text-shadow:0 0 10px rgba(0,255,65,0.4);}',
      '.ss-xp .nxt{font-size:12px;color:#9ab;}',
      '.ss-xp .bar{height:6px;background:#000;border:1px solid rgba(0,255,65,0.25);position:relative;overflow:hidden;margin-top:5px;}',
      '.ss-xp .bar i{display:block;height:100%;background:linear-gradient(90deg,#00e8ff,#00ff41);box-shadow:0 0 10px rgba(0,255,65,0.5);}',
      '@media(max-width:720px){.ss-strip .ss-id{border-right:none;padding-right:0;}}',

      '.ss-panel{background:#02060a;border:1px solid rgba(0,232,255,0.25);font-family:"VT323",monospace;color:#cfe7ee;}',
      '.ss-panel .ss-hdr{padding:10px 16px;background:linear-gradient(90deg,#020608,#06121a);border-bottom:1px solid rgba(0,232,255,0.2);font-family:"Pixelify Sans",sans-serif;color:#00e8ff;letter-spacing:2px;font-size:16px;}',
      '.ss-panel .ss-body{padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;}',
      '.ss-recent{padding:14px 16px;border-top:1px solid rgba(0,232,255,0.12);}',
      '.ss-recent ul{list-style:none;padding-left:0;display:flex;flex-direction:column;gap:4px;}',
      '.ss-recent li{display:flex;justify-content:space-between;gap:10px;font-size:14px;color:#cfe7ee;border-bottom:1px dashed rgba(0,232,255,0.1);padding:3px 0;}',
      '.ss-recent .tag{font-size:11px;letter-spacing:1px;padding:1px 6px;border:1px solid rgba(0,232,255,0.25);}',
      '.ss-recent .ts{color:#7c9aa3;font-size:12px;}',
      '.ss-arcade{padding:10px 16px;border-top:1px solid rgba(0,232,255,0.12);display:flex;flex-wrap:wrap;gap:14px;font-size:14px;}',
      '.ss-arcade b{color:#ffe700;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmtTs(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    var now = Date.now();
    var diff = (now - ts) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString();
  }

  // -------------------- renderers --------------------
  var _mounts = [];

  function renderStrip(mountId) {
    injectStyles();
    var mount = (typeof mountId === 'string') ? document.getElementById(mountId) : mountId;
    if (!mount) return;
    function paint() {
      var s = summary();
      clear(mount);
      var wrap = el('div', 'ss-strip');

      var idCol = el('div', 'ss-id');
      idCol.appendChild(el('div', 'ss-handle', s.handle));
      idCol.appendChild(el('div', 'ss-rank', s.rank));
      idCol.appendChild(el('div', 'ss-meta', s.faction + ' · ' + s.tier));
      wrap.appendChild(idCol);

      var tracksCol = el('div', 'ss-tracks');
      s.tracks.forEach(function (t) {
        var a = document.createElement('a');
        a.className = 'ss-track'; a.href = t.href;
        var lbl = el('div', 'lbl', t.label); lbl.style.color = t.color;
        var num = el('div', 'num', t.solveCount + ' / ' + t.total);
        var bar = el('div', 'bar'); var i = el('i');
        i.style.width = Math.max(2, t.pct) + '%';
        i.style.background = t.color;
        i.style.boxShadow = '0 0 8px ' + t.color;
        bar.appendChild(i);
        a.appendChild(lbl); a.appendChild(num); a.appendChild(bar);
        tracksCol.appendChild(a);
      });
      wrap.appendChild(tracksCol);

      var xpCol = el('div', 'ss-xp');
      xpCol.appendChild(el('div', 'lbl', 'TOTAL_XP'));
      xpCol.appendChild(el('div', 'val', s.totalXP.toLocaleString()));
      var bar = el('div', 'bar'); var bi = el('i');
      bi.style.width = s.progressToNext + '%';
      bar.appendChild(bi);
      xpCol.appendChild(bar);
      var nxtTxt = s.nextRank
        ? '→ ' + s.nextRank + ' @ ' + s.nextRankXP.toLocaleString() + ' XP (' + Math.max(0, s.nextRankXP - s.totalXP).toLocaleString() + ' to go)'
        : 'rank cap reached';
      xpCol.appendChild(el('div', 'nxt', nxtTxt));
      wrap.appendChild(xpCol);

      mount.appendChild(wrap);
    }
    paint();
    _mounts.push(paint);
  }

  function renderPanel(mountId) {
    injectStyles();
    var mount = (typeof mountId === 'string') ? document.getElementById(mountId) : mountId;
    if (!mount) return;
    function paint() {
      var s = summary();
      clear(mount);
      var panel = el('div', 'ss-panel');

      var hdr = el('div', 'ss-hdr', ':: OPERATIVE_TELEMETRY :: ' + s.handle + ' · ' + s.rank);
      panel.appendChild(hdr);

      var body = el('div', 'ss-body');
      // Per-track tile
      s.tracks.forEach(function (t) {
        var a = document.createElement('a');
        a.className = 'ss-track'; a.href = t.href;
        var lbl = el('div', 'lbl', t.label); lbl.style.color = t.color;
        var num = el('div', 'num', t.solveCount + ' / ' + t.total + ' (' + t.pct + '%)');
        var sub = el('div'); sub.style.fontSize = '12px'; sub.style.color = '#7c9aa3';
        sub.textContent = 'XP ' + t.xp.toLocaleString() + ' · attempts ' + Object.values(t.attempts || {}).reduce(function (a,b){return a+b;}, 0);
        var bar = el('div', 'bar'); var i = el('i');
        i.style.width = Math.max(2, t.pct) + '%';
        i.style.background = t.color;
        i.style.boxShadow = '0 0 8px ' + t.color;
        bar.appendChild(i);
        a.appendChild(lbl); a.appendChild(num); a.appendChild(sub); a.appendChild(bar);
        body.appendChild(a);
      });
      panel.appendChild(body);

      // Recent solves
      var rec = el('div', 'ss-recent');
      rec.appendChild(el('div', 'ss-hdr-sub')).textContent = 'RECENT_SOLVES';
      var ul = el('ul');
      if (s.recent.length === 0) {
        var li = el('li'); li.textContent = '— no solves yet — boot a mission to populate this feed —';
        li.style.color = '#7c9aa3'; ul.appendChild(li);
      } else {
        s.recent.forEach(function (r) {
          var li = el('li');
          var tag = el('span', 'tag', r.track); tag.style.color = r.color; tag.style.borderColor = r.color;
          var name = el('span'); name.textContent = r.mid;
          var ts = el('span', 'ts', fmtTs(r.ts));
          li.appendChild(tag); li.appendChild(name); li.appendChild(ts);
          ul.appendChild(li);
        });
      }
      rec.appendChild(ul);
      panel.appendChild(rec);

      // Arcade hi-scores
      var arc = el('div', 'ss-arcade');
      arc.appendChild(el('span', null, 'ARCADE_HI:'));
      s.arcade.forEach(function (g) {
        var sp = el('span'); sp.innerHTML = '';
        sp.appendChild(document.createTextNode(g.label + ' '));
        var b = el('b'); b.textContent = g.hi.toLocaleString();
        sp.appendChild(b);
        arc.appendChild(sp);
      });
      panel.appendChild(arc);

      mount.appendChild(panel);
    }
    paint();
    _mounts.push(paint);
  }

  function refresh() { _mounts.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  // Auto-refresh every 5s + on storage events from other tabs
  setInterval(refresh, 5000);
  window.addEventListener('storage', refresh);

  window.SiteStats = {
    summary: summary,
    renderStrip: renderStrip,
    renderPanel: renderPanel,
    refresh: refresh,
    TRACKS: TRACKS,
    ARCADE: ARCADE
  };
})();
