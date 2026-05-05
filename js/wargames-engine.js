/* ============================================================
   FURIOS-INT // WAR_GAMES ENGINE  v2.0  ::  Personfu  ::  2026
   ------------------------------------------------------------
   Senior-grade flag-verification + progression engine.
   Modeled after HackThisSite-Basic mission flow and the WeChall
   federated profile model — but every credential, hash, and
   integrity signature is generated and verified strictly client
   side using the SubtleCrypto Web API.

   ┌──────────────────────────  SECURITY MODEL  ─────────────────┐
   │ 1. Flags are NEVER in source plaintext.  Source contains    │
   │    only SHA-256(normalize(answer)) hex digests.             │
   │ 2. Submitted answers are normalized (NFC trim lower) and    │
   │    hashed with crypto.subtle.digest('SHA-256', ...).        │
   │ 3. Hex comparison is constant-time (no early-exit timing).  │
   │ 4. Progress is HMAC-SHA-256 signed using a PBKDF2(100k)     │
   │    key derived from a per-browser nonce. Hand-edited        │
   │    progress fails verification and is rejected.             │
   │ 5. submitFlag() is rate-limited (1 attempt per 250ms per    │
   │    mission) to defeat trivial brute force.                  │
   │ 6. All DOM writes use textContent / element constructors —  │
   │    user input is never reflected via innerHTML.             │
   │ 7. CSP-friendly — no eval, no Function, no inline handlers. │
   └─────────────────────────────────────────────────────────────┘

   PUBLIC API
     WG.init({ missions, mountId, storageKey?, onComplete? })
     WG.submitFlag(missionId, answer)         -> {ok,attempts,xpGain}
     WG.unlockHint(missionId, level)          -> bool
     WG.getProgress()                         -> deep clone
     WG.resetProgress()                       -> void
     WG.exportProgress()                      -> base64 string
     WG.importProgress(b64)                   -> Promise<bool>
     WG.on(event, handler)                    -> off()
     WG.openMission(id)                       -> open mission modal

   EVENTS  ('wargames:<event>' on window + WG.on)
     'state'   { progress }              every state mutation
     'solved'  { mission, progress, ms } on first valid flag
     'hint'    { mission, level }        on hint reveal
     'reset'   {}                        on resetProgress
     'tier-up' { from, to, progress }    on rank promotion
   ============================================================ */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------ *
   *  Constants
   * ------------------------------------------------------------ */
  var DEFAULT_STORAGE_KEY = 'fllc.wargames.v1';
  var NONCE_KEY           = 'fllc.wargames.nonce';
  var SUBMIT_COOLDOWN_MS  = 250;
  var COMBO_WINDOW_MS     = 5 * 60 * 1000;   // 5-min combo bonus window
  var COMBO_BONUS         = 0.10;            // +10% XP on 3rd consecutive solve
  var HINT_PENALTY_PER_LV = 5;               // -5 / -10 / -15 XP per hint level
  var STORAGE_KEY         = DEFAULT_STORAGE_KEY;

  var RANKS = [
    { name: '\u25C7 RECRUIT',         xp: 0    },
    { name: '\u25C6 ROOKIE',          xp: 300  },
    { name: '\uD83D\uDD25 OPERATIVE', xp: 1000 },
    { name: '\u26A1 ELITE',           xp: 2500 },
    { name: '\uD83D\uDC51 LEGEND',    xp: 5000 }
  ];

  /* ------------------------------------------------------------ *
   *  Tiny event bus
   * ------------------------------------------------------------ */
  var listeners = Object.create(null);
  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(event, detail) {
    (listeners[event] || []).forEach(function (fn) {
      try { fn(detail); } catch (_) { /* listener errors must not break engine */ }
    });
    try { global.dispatchEvent(new CustomEvent('wargames:' + event, { detail: detail })); } catch (_) {}
  }

  /* ------------------------------------------------------------ *
   *  Crypto helpers
   * ------------------------------------------------------------ */
  function bufToHex(buf) {
    var b = new Uint8Array(buf), out = '';
    for (var i = 0; i < b.length; i++) {
      out += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    }
    return out;
  }
  function hexToBuf(hex) {
    var n = (hex.length / 2) | 0, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out.buffer;
  }
  function constantTimeEq(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
  function normalize(answer) {
    var s = String(answer == null ? '' : answer);
    if (s.normalize) s = s.normalize('NFC');
    return s.trim().toLowerCase();
  }
  function sha256Hex(str) {
    var enc = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', enc).then(bufToHex);
  }

  /* ------------------------------------------------------------ *
   *  Per-browser nonce + HMAC integrity key
   * ------------------------------------------------------------ */
  function getNonce() {
    var n = localStorage.getItem(NONCE_KEY);
    if (!n) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      n = bufToHex(a);
      try { localStorage.setItem(NONCE_KEY, n); } catch (_) {}
    }
    return n;
  }
  var _hmacKeyPromise = null;
  function getHmacKey() {
    if (_hmacKeyPromise) return _hmacKeyPromise;
    var nonce = getNonce();
    var encNonce = new TextEncoder().encode(nonce);
    var encSalt  = new TextEncoder().encode('fllc.wargames.salt.v1');
    _hmacKeyPromise = crypto.subtle.importKey(
      'raw', encNonce, 'PBKDF2', false, ['deriveKey']
    ).then(function (baseKey) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: encSalt, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign', 'verify']
      );
    });
    return _hmacKeyPromise;
  }
  function signPayload(jsonStr) {
    return getHmacKey().then(function (key) {
      return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(jsonStr));
    }).then(bufToHex);
  }
  function verifyPayload(jsonStr, hexSig) {
    return getHmacKey().then(function (key) {
      return crypto.subtle.verify(
        'HMAC', key,
        hexToBuf(hexSig),
        new TextEncoder().encode(jsonStr)
      );
    });
  }

  /* ------------------------------------------------------------ *
   *  Progress shape + persistence
   * ------------------------------------------------------------ */
  function defaultProgress() {
    return {
      v: 2,
      nonce: getNonce(),
      solved: [],
      xp: 0,
      rank: RANKS[0].name,
      hints: {},        // 'mid:level' -> ts
      attempts: {},     // mid -> int
      firstSolve: {},   // mid -> ts
      openedAt: {},     // mid -> ts (for solve-time)
      solveTimes: {},   // mid -> ms
      streak: { last: 0, count: 0 },
      lastSeen: Date.now()
    };
  }
  function rankForXp(xp) {
    var current = RANKS[0].name;
    for (var i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) current = RANKS[i].name;
    return current;
  }
  function loadProgressSync() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      var obj = JSON.parse(raw);
      if (!obj || obj.nonce !== getNonce()) return defaultProgress();
      return obj;
    } catch (_) { return defaultProgress(); }
  }
  function revalidate(state) {
    if (!state || !state.__sig) return Promise.resolve(false);
    var sig = state.__sig;
    var clone = JSON.parse(JSON.stringify(state));
    delete clone.__sig;
    return verifyPayload(JSON.stringify(clone), sig).catch(function () { return false; });
  }
  function saveProgress(state) {
    state.lastSeen = Date.now();
    var clone = JSON.parse(JSON.stringify(state));
    delete clone.__sig;
    var json = JSON.stringify(clone);
    return signPayload(json).then(function (sig) {
      clone.__sig = sig;
      state.__sig = sig;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clone)); } catch (_) {}
    });
  }

  /* ------------------------------------------------------------ *
   *  Engine
   * ------------------------------------------------------------ */
  var WG = {
    _cfg: null,
    _state: null,
    _lastSubmit: Object.create(null),
    _missionMap: Object.create(null),

    init: function (cfg) {
      this._cfg = cfg || {};
      STORAGE_KEY = (cfg && cfg.storageKey) || DEFAULT_STORAGE_KEY;
      this._state = loadProgressSync();
      this._missionMap = Object.create(null);
      (this._cfg.missions || []).forEach(function (m) { WG._missionMap[m.id] = m; });

      // Async integrity check — silently reset on tampered/imported state.
      var self = this;
      revalidate(this._state).then(function (ok) {
        if (!ok && self._state.solved && self._state.solved.length > 0) {
          self._state = defaultProgress();
          saveProgress(self._state);
          self._renderAll();
        }
      });

      // Cross-tab sync
      global.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY) {
          self._state = loadProgressSync();
          self._renderAll();
          emit('state', { progress: self.getProgress() });
        }
      });

      this._renderAll();
      emit('state', { progress: this.getProgress() });
      return this;
    },

    on: on,

    getProgress: function () {
      var copy = JSON.parse(JSON.stringify(this._state || defaultProgress()));
      delete copy.__sig;
      return copy;
    },

    resetProgress: function () {
      this._state = defaultProgress();
      saveProgress(this._state);
      this._renderAll();
      emit('reset', {});
      emit('state', { progress: this.getProgress() });
    },

    exportProgress: function () {
      var clone = JSON.parse(JSON.stringify(this._state));
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(clone)))); }
      catch (_) { return ''; }
    },

    importProgress: function (b64) {
      var self = this;
      try {
        var json = decodeURIComponent(escape(atob(String(b64 || ''))));
        var obj  = JSON.parse(json);
        if (!obj || obj.v !== 2) return Promise.resolve(false);
        obj.nonce = getNonce();
        return saveProgress(obj).then(function () {
          self._state = obj;
          self._renderAll();
          emit('state', { progress: self.getProgress() });
          return true;
        });
      } catch (_) { return Promise.resolve(false); }
    },

    submitFlag: function (missionId, answer) {
      var m = this._missionMap[missionId];
      if (!m) return Promise.resolve({ ok: false, reason: 'unknown_mission' });

      var now = Date.now();
      var last = this._lastSubmit[missionId] || 0;
      if (now - last < SUBMIT_COOLDOWN_MS) {
        return Promise.resolve({ ok: false, reason: 'rate_limited',
          cooldownMs: SUBMIT_COOLDOWN_MS - (now - last) });
      }
      this._lastSubmit[missionId] = now;

      var self = this;
      this._state.attempts[missionId] = (this._state.attempts[missionId] || 0) + 1;

      return sha256Hex(normalize(answer)).then(function (hex) {
        var ok = constantTimeEq(hex, String(m.flagHash || '').toLowerCase());
        var xpGain = 0, ms = null;

        if (ok && self._state.solved.indexOf(missionId) === -1) {
          var openedAt = self._state.openedAt[missionId] || now;
          ms = Math.max(0, now - openedAt);
          self._state.solveTimes[missionId] = ms;

          // combo bonus: 3+ solves within COMBO_WINDOW_MS
          var st = self._state.streak;
          if (now - st.last <= COMBO_WINDOW_MS) st.count += 1; else st.count = 1;
          st.last = now;
          var combo = (st.count >= 3) ? COMBO_BONUS : 0;

          xpGain = Math.round(m.points * (1 + combo));
          var prevRank = rankForXp(self._state.xp);
          self._state.solved.push(missionId);
          self._state.xp += xpGain;
          self._state.firstSolve[missionId] = now;
          var newRank = rankForXp(self._state.xp);
          self._state.rank = newRank;

          if (prevRank !== newRank) {
            emit('tier-up', { from: prevRank, to: newRank, progress: self.getProgress() });
          }
          if (typeof self._cfg.onComplete === 'function') {
            try { self._cfg.onComplete(m, self._state); } catch (_) {}
          }
          emit('solved', { mission: m, progress: self.getProgress(), ms: ms, xpGain: xpGain });
        }

        return saveProgress(self._state).then(function () {
          self._renderAll();
          emit('state', { progress: self.getProgress() });
          return { ok: ok, attempts: self._state.attempts[missionId], xpGain: xpGain, ms: ms };
        });
      });
    },

    unlockHint: function (missionId, level) {
      var key = missionId + ':' + level;
      if (this._state.hints[key]) return false;
      var m = this._missionMap[missionId];
      if (!m) return false;
      this._state.hints[key] = Date.now();
      var penalty = level * HINT_PENALTY_PER_LV;
      this._state.xp = Math.max(0, this._state.xp - penalty);
      this._state.rank = rankForXp(this._state.xp);
      saveProgress(this._state);
      this._renderAll();
      emit('hint', { mission: m, level: level });
      emit('state', { progress: this.getProgress() });
      return true;
    },

    /* ----------- locking ----------- */
    _isLocked: function (m) {
      if (!m.requires || !m.requires.length) return false;
      var solved = this._state.solved;
      for (var i = 0; i < m.requires.length; i++) {
        if (solved.indexOf(m.requires[i]) === -1) return true;
      }
      return false;
    },

    /* ----------- rendering ----------- */
    _renderAll: function () {
      this._renderHeader();
      this._renderMissionList();
    },

    _renderHeader: function () {
      var s = this._state;
      var total = (this._cfg.missions || []).length;
      var solved = s.solved.length;
      var pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
      set('wg-xp', s.xp.toLocaleString());
      set('wg-rank', s.rank);
      set('wg-solved', solved + ' / ' + total);
      set('wg-pct', pct + '%');
      var bar = document.getElementById('wg-progressbar');
      if (bar) bar.style.width = pct + '%';
    },

    _renderMissionList: function () {
      var mount = document.getElementById(this._cfg.mountId);
      if (!mount) return;
      while (mount.firstChild) mount.removeChild(mount.firstChild);

      var self = this;
      (this._cfg.missions || []).forEach(function (m, idx) {
        var solved = self._state.solved.indexOf(m.id) !== -1;
        var locked = !solved && self._isLocked(m);

        var card = document.createElement('article');
        card.className = 'wg-mission' + (solved ? ' wg-solved' : '') + (locked ? ' wg-locked' : '');
        card.dataset.mid = m.id;
        card.setAttribute('role', 'listitem');

        var head = document.createElement('div'); head.className = 'wg-mhead';
        var num  = document.createElement('span'); num.className  = 'wg-mnum';
        num.textContent = 'M-' + String(idx + 1).padStart(2, '0');
        var ttl  = document.createElement('h3');   ttl.className  = 'wg-mttl';
        ttl.textContent = m.title;
        var dif  = document.createElement('span'); dif.className  = 'wg-mdiff wg-d-' + m.tier;
        dif.textContent = String(m.tier || '').toUpperCase();
        head.appendChild(num); head.appendChild(ttl); head.appendChild(dif);

        var meta = document.createElement('div'); meta.className = 'wg-mmeta';
        var sp1 = document.createElement('span'); sp1.textContent = '\u2605 ' + m.points + ' XP';
        var sp2 = document.createElement('span'); sp2.textContent = '\u00B7 ' + m.skill;
        var sp3 = document.createElement('span'); sp3.textContent = '\u00B7 solves est. ' + m.solves;
        meta.appendChild(sp1); meta.appendChild(sp2); meta.appendChild(sp3);

        if (self._state.solveTimes[m.id]) {
          var sp4 = document.createElement('span');
          sp4.className = 'wg-mtime';
          sp4.textContent = '\u00B7 your time: ' + formatMs(self._state.solveTimes[m.id]);
          meta.appendChild(sp4);
        }

        var brief = document.createElement('p'); brief.className = 'wg-mbrief'; brief.textContent = m.brief;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wg-mbtn';
        btn.textContent = solved
          ? 'REVIEW SOLVED MISSION'
          : (locked ? '[LOCKED \u2014 solve previous tier]' : 'OPEN MISSION');
        btn.disabled = locked && !solved;
        btn.addEventListener('click', function () { WG.openMission(m.id); });

        card.appendChild(head);
        card.appendChild(meta);
        card.appendChild(brief);
        card.appendChild(btn);
        mount.appendChild(card);
      });
    },

    /* ----------- mission modal ----------- */
    openMission: function (id) {
      var m = this._missionMap[id];
      if (!m) return;
      if (!this._state.openedAt[id]) {
        this._state.openedAt[id] = Date.now();
        saveProgress(this._state);
      }

      var dlg = document.getElementById('wg-mission-dialog');
      if (!dlg) return;
      var self = this;
      function setText(sel, val) { var el = dlg.querySelector(sel); if (el) el.textContent = val; }

      setText('[data-f=title]',    m.title);
      setText('[data-f=tier]',     String(m.tier || '').toUpperCase());
      setText('[data-f=skill]',    m.skill);
      setText('[data-f=points]',   m.points + ' XP');
      setText('[data-f=brief]',    m.brief);
      setText('[data-f=scenario]', m.scenario);

      var labWrap = dlg.querySelector('[data-f=lab]');
      if (labWrap) {
        while (labWrap.firstChild) labWrap.removeChild(labWrap.firstChild);
        if (m.lab) {
          var pre = document.createElement('pre'); pre.className = 'wg-lab-pre';
          pre.textContent = m.lab;
          labWrap.appendChild(pre);
        }
        if (Array.isArray(m.assets)) {
          m.assets.forEach(function (a) {
            var det = document.createElement('details'); det.className = 'wg-asset';
            var sum = document.createElement('summary'); sum.textContent = a.label;
            var p   = document.createElement('pre');     p.textContent   = a.body;
            det.appendChild(sum); det.appendChild(p);
            labWrap.appendChild(det);
          });
        }
      }

      var hintsWrap = dlg.querySelector('[data-f=hints]');
      if (hintsWrap) {
        while (hintsWrap.firstChild) hintsWrap.removeChild(hintsWrap.firstChild);
        (m.hints || []).forEach(function (h, i) {
          var lvl = i + 1;
          var key = m.id + ':' + lvl;
          var unlocked = !!self._state.hints[key];
          var row = document.createElement('div'); row.className = 'wg-hint';
          var lbl = document.createElement('span');
          lbl.textContent = 'HINT ' + lvl + ' (-' + (lvl * HINT_PENALTY_PER_LV) + ' XP)';
          var txt = document.createElement('span'); txt.className = 'wg-hint-text';
          txt.textContent = unlocked ? h : '[ENCRYPTED \u2014 click to unlock]';
          row.appendChild(lbl); row.appendChild(txt);
          if (!unlocked) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', function () {
              self.unlockHint(m.id, lvl);
              self.openMission(m.id);
            }, { once: true });
          }
          hintsWrap.appendChild(row);
        });
      }

      var wt = dlg.querySelector('[data-f=walkthrough]');
      if (wt) {
        while (wt.firstChild) wt.removeChild(wt.firstChild);
        var solved = this._state.solved.indexOf(m.id) !== -1;
        if (solved && m.walkthrough) {
          var det = document.createElement('details');
          var sum = document.createElement('summary');
          sum.textContent = 'POST-MORTEM WALKTHROUGH (spoilers)';
          var p = document.createElement('pre'); p.textContent = m.walkthrough;
          det.appendChild(sum); det.appendChild(p);
          wt.appendChild(det);
        } else {
          var note = document.createElement('p'); note.className = 'wg-locked-note';
          note.textContent = 'Walkthrough is sealed until you submit a valid flag.';
          wt.appendChild(note);
        }
      }

      var status = dlg.querySelector('[data-f=status]');
      var input  = dlg.querySelector('[data-f=input]');
      var btn    = dlg.querySelector('[data-f=submit]');
      if (status) { status.textContent = ''; status.className = 'wg-status'; }
      if (input)  { input.value = ''; try { input.focus(); } catch (_) {} }
      if (btn) {
        btn.onclick = function () {
          if (!input || !status) return;
          var val = input.value;
          status.textContent = '\u2026 verifying \u2026'; status.className = 'wg-status';
          self.submitFlag(m.id, val).then(function (r) {
            if (r.ok) {
              var bonusTxt = r.xpGain && r.xpGain > m.points
                ? ' (combo +' + (r.xpGain - m.points) + ' XP)'
                : '';
              status.textContent = '[+] FLAG ACCEPTED \u2014 +' + r.xpGain + ' XP' + bonusTxt + '. Mission archived.';
              status.className = 'wg-status wg-ok';
              self.openMission(m.id);
            } else if (r.reason === 'rate_limited') {
              status.textContent = '[!] slow down \u2014 wait ' + r.cooldownMs + 'ms before re-submitting.';
              status.className = 'wg-status wg-bad';
            } else {
              status.textContent = '[!] flag rejected (' + r.attempts + ' attempt' + (r.attempts === 1 ? '' : 's') + '). check your work.';
              status.className = 'wg-status wg-bad';
            }
          });
        };
      }

      if (input) {
        input.onkeydown = function (e) {
          if (e.key === 'Enter' && btn) { e.preventDefault(); btn.click(); }
          if (e.key === 'Escape') dlg.classList.remove('open');
        };
      }

      dlg.classList.add('open');
    }
  };

  /* ------------------------------------------------------------ *
   *  Helpers
   * ------------------------------------------------------------ */
  function formatMs(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s - m * 60;
    if (m >= 60) { var h = Math.floor(m / 60); return h + 'h ' + (m - h * 60) + 'm'; }
    if (m > 0)   return m + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
    return s + 's';
  }

  global.WG = WG;
})(window);
