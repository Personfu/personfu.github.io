/**
 * SCENE_MINIGAME — FLLC ARCADE v3.0
 * Public, offline-first. Three playable modes:
 *
 *  1. PACKET_DEFENDER  — vertical shooter, dodge & shoot incoming threats
 *  2. CIPHER_RUN       — hex-pair matching puzzle, beat the clock
 *  3. SIGNAL_TRACE     — connect relay nodes without crossing hostile wires
 *
 * Scoring bridges to MMORPG:
 *   localStorage['fllc.arcade.score'] → highest total score
 *   cyberworld-player.xp             → +XP per 100 pts scored (capped per session)
 */
export class SceneMinigame extends Phaser.Scene {
  constructor() {
    super('SceneMinigame');
    this._mode       = null;   // 'packet' | 'cipher' | 'trace'
    this._score      = 0;
    this._hiScores   = { packet: 0, cipher: 0, trace: 0 };
    this._gameActive = false;
    this._handle     = '';
    this._flags      = new Set();
    /* Per-mode state */
    this._pd = {};  // packet defender
    this._cr = {};  // cipher run
    this._st = {};  // signal trace
  }

  init(data) {
    this._handle = data.handle || 'OPERATIVE';
    this._flags  = new Set(data.flags || []);
    try {
      const saved = JSON.parse(localStorage.getItem('fllc.arcade.scores') || '{}');
      this._hiScores.packet = saved.packet || 0;
      this._hiScores.cipher = saved.cipher || 0;
      this._hiScores.trace  = saved.trace  || 0;
    } catch (_) { /* offline, no scores yet */ }
  }

  create() {
    this._W = this.scale.width;
    this._H = this.scale.height;
    this.cameras.main.setBackgroundColor('#020408');
    this._buildModeSelect();
  }

  /* ──────────────────────────────────────────────
   *  MODE SELECT SCREEN
   * ────────────────────────────────────────────── */
  _buildModeSelect() {
    this._clearScene();
    const W = this._W, H = this._H;

    this.add.text(W / 2, 32, `FLLC ARCADE // ${this._handle}`, {
      fontFamily: 'VT323', fontSize: '24px', color: '#00e8ff'
    }).setOrigin(0.5).setDepth(10);

    const MODES = [
      { id: 'packet', label: 'PACKET_DEFENDER', desc: 'Shoot incoming threat packets.\nDodge collisions. Survive 90 sec.', color: 0x00ff41, hi: this._hiScores.packet },
      { id: 'cipher', label: 'CIPHER_RUN',      desc: 'Match hex pairs before\nthe clock hits zero.',              color: 0x00e8ff, hi: this._hiScores.cipher },
      { id: 'trace',  label: 'SIGNAL_TRACE',    desc: 'Route signal from source to\ndest without crossing hostiles.', color: 0xffe700, hi: this._hiScores.trace  },
    ];

    MODES.forEach((m, i) => {
      const cx = W / 2 + (i - 1) * 280;
      const cy = H / 2 - 20;
      const card = this.add.rectangle(cx, cy, 240, 220, 0x010a16, 0.95)
        .setStrokeStyle(2, m.color, 0.8).setDepth(10).setInteractive({ cursor: 'pointer' });
      this.add.text(cx, cy - 78, m.label, { fontFamily: 'Pixelify Sans', fontSize: '17px', color: `#${m.color.toString(16).padStart(6,'0')}` }).setOrigin(0.5).setDepth(11);
      this.add.text(cx, cy - 24, m.desc, { fontFamily: 'VT323', fontSize: '18px', color: '#aaa', align: 'center', lineSpacing: 2 }).setOrigin(0.5).setDepth(11);
      this.add.text(cx, cy + 56, `HI: ${m.hi}`, { fontFamily: 'JetBrains Mono', fontSize: '13px', color: `#${m.color.toString(16).padStart(6,'0')}` }).setOrigin(0.5).setDepth(11);
      const playBtn = this.add.rectangle(cx, cy + 88, 140, 38, m.color, 0.15)
        .setStrokeStyle(2, m.color, 0.9).setDepth(11).setInteractive({ cursor: 'pointer' });
      this.add.text(cx, cy + 88, '▶ PLAY', { fontFamily: 'VT323', fontSize: '22px', color: `#${m.color.toString(16).padStart(6,'0')}` }).setOrigin(0.5).setDepth(12);

      const launch = () => {
        this.cameras.main.flash(300, 0, 255, 64);
        this.time.delayedCall(350, () => {
          this._mode  = m.id;
          this._score = 0;
          this['_start_' + m.id]();
        });
      };
      card.on('pointerdown', launch);
      playBtn.on('pointerdown', launch);
      this.tweens.add({ targets: card, alpha: 0.85, duration: 1200 + i * 200, yoyo: true, repeat: -1 });
    });

    /* back */
    this.add.text(24, 24, '◀ LOBBY', { fontFamily: 'VT323', fontSize: '22px', color: '#00e8ff' })
      .setDepth(15).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.scene.start('SceneLobby', { handle: this._handle, flags: [...this._flags] }));

    /* CRT */
    const crt = this.add.graphics().setDepth(200);
    crt.lineStyle(1, 0x000, 0.07);
    for (let y = 0; y < H; y += 4) crt.beginPath().moveTo(0, y).lineTo(W, y).strokePath();
  }

  _clearScene() {
    this.children.removeAll(true);
    this._gameActive = false;
    this._pd = {}; this._cr = {}; this._st = {};
  }

  /* ──────────────────────────────────────────────
   *  HUD COMMON
   * ────────────────────────────────────────────── */
  _buildCommonHUD(color) {
    const W = this._W, H = this._H;
    this.add.rectangle(W / 2, 28, W, 52, 0x010a16, 0.95).setDepth(40);
    this._scoreTxt = this.add.text(16, 16, 'SCORE: 0', { fontFamily: 'VT323', fontSize: '26px', color: `#${color.toString(16).padStart(6,'0')}` }).setDepth(41);
    this._timerTxt = this.add.text(W / 2, 16, '', { fontFamily: 'VT323', fontSize: '26px', color: '#aaa' }).setOrigin(0.5).setDepth(41);
    this.add.text(W - 16, 16, '◀ MENU', { fontFamily: 'VT323', fontSize: '22px', color: '#334' }).setOrigin(1, 0).setDepth(41)
      .setInteractive({ cursor: 'pointer' }).on('pointerdown', () => this._buildModeSelect());
    const crt = this.add.graphics().setDepth(200);
    crt.lineStyle(1, 0x000, 0.07);
    for (let y = 0; y < H; y += 4) crt.beginPath().moveTo(0, y).lineTo(W, y).strokePath();
  }

  _addScore(pts) {
    this._score += pts;
    this._scoreTxt && this._scoreTxt.setText(`SCORE: ${this._score}`);
  }

  _gameOver(msg) {
    this._gameActive = false;
    /* Update hi scores */
    if (this._mode && this._score > this._hiScores[this._mode]) {
      this._hiScores[this._mode] = this._score;
      try { localStorage.setItem('fllc.arcade.scores', JSON.stringify(this._hiScores)); } catch (_) {}
    }
    /* Bridge XP to MMORPG */
    this._bridgeXP(this._score);

    const W = this._W, H = this._H;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(180);
    this.add.text(W / 2, H / 2 - 60, 'SESSION TERMINATED', { fontFamily: 'Pixelify Sans', fontSize: '36px', color: '#ff4444' }).setOrigin(0.5).setDepth(181);
    this.add.text(W / 2, H / 2 - 12, msg, { fontFamily: 'VT323', fontSize: '24px', color: '#aaa', align: 'center' }).setOrigin(0.5).setDepth(181);
    this.add.text(W / 2, H / 2 + 28, `SCORE: ${this._score}   HI: ${this._hiScores[this._mode]}`, { fontFamily: 'VT323', fontSize: '26px', color: '#00e8ff' }).setOrigin(0.5).setDepth(181);
    const retry = this.add.rectangle(W / 2, H / 2 + 90, 200, 46, 0x00ff41, 0.12).setStrokeStyle(2, 0x00ff41, 0.8).setDepth(181).setInteractive({ cursor: 'pointer' });
    this.add.text(W / 2, H / 2 + 90, '↺ RETRY', { fontFamily: 'VT323', fontSize: '26px', color: '#00ff41' }).setOrigin(0.5).setDepth(182);
    const menu  = this.add.rectangle(W / 2 + 220, H / 2 + 90, 180, 46, 0x00e8ff, 0.10).setStrokeStyle(2, 0x00e8ff, 0.8).setDepth(181).setInteractive({ cursor: 'pointer' });
    this.add.text(W / 2 + 220, H / 2 + 90, '◀ MENU', { fontFamily: 'VT323', fontSize: '26px', color: '#00e8ff' }).setOrigin(0.5).setDepth(182);
    retry.on('pointerdown', () => { this._score = 0; this['_start_' + this._mode](); });
    menu.on('pointerdown', () => this._buildModeSelect());
  }

  _bridgeXP(score) {
    const xpGain = Math.floor(score / 100) * 15;
    if (xpGain <= 0) return;
    try {
      const player = JSON.parse(localStorage.getItem('cyberworld-player') || '{}');
      player.xp = (player.xp || 0) + xpGain;
      player.credits = (player.credits || 0) + Math.floor(score / 50);
      localStorage.setItem('cyberworld-player', JSON.stringify(player));
    } catch (_) { /* offline, skip */ }
  }

  /* ══════════════════════════════════════════════
   *  MODE 1: PACKET DEFENDER
   * ══════════════════════════════════════════════ */
  _start_packet() {
    this._clearScene();
    this._buildCommonHUD(0x00ff41);
    const W = this._W, H = this._H;
    this._gameActive = true;

    /* Ship */
    const ship = this.add.triangle(W / 2, H - 80, 0, 20, 16, -20, -16, -20, 0x00ff41).setDepth(10);
    const shipHit = this.add.circle(W / 2, H - 80, 10, 0x00ff41, 0).setDepth(9);

    /* Controls */
    const keys = this.input.keyboard.addKeys({ left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D', space: 'SPACE' });
    const SHIP_SPEED = 380;
    let lastShot = 0;

    /* Mobile drag control */
    let dragX = null;
    this.input.on('pointermove', ptr => { if (ptr.isDown) dragX = ptr.x; });
    this.input.on('pointerup',   ()  => { dragX = null; });

    this._pd = {
      ship, shipHit, keys, lastShot, dragX,
      bullets: [], enemies: [], spawnTimer: 0, spawnInterval: 1400,
      time: 90, timeTimer: 0, alive: true
    };

    this._timerTxt.setText('90s');
  }

  _update_packet(delta) {
    const pd = this._pd;
    if (!pd.alive) return;
    const W = this._W, H = this._H;
    const dt = delta / 1000;
    const { ship, shipHit, keys } = pd;

    /* Timer */
    pd.timeTimer += delta;
    if (pd.timeTimer >= 1000) { pd.time--; pd.timeTimer = 0; this._timerTxt.setText(`${pd.time}s`); }
    if (pd.time <= 0) { pd.alive = false; this._gameOver('TIME EXPIRED\n90-second patrol complete.'); return; }

    /* Ship movement */
    let dx = 0;
    if (keys.left.isDown || keys.a.isDown) dx = -1;
    if (keys.right.isDown || keys.d.isDown) dx = 1;
    if (pd.dragX !== null) dx = pd.dragX < ship.x ? -1 : 1;
    ship.x = Phaser.Math.Clamp(ship.x + dx * SHIP_SPEED * dt, 24, W - 24);
    shipHit.x = ship.x;

    /* Shoot */
    pd.lastShot += delta;
    if ((keys.space.isDown || this.input.activePointer.isDown) && pd.lastShot > 220) {
      pd.lastShot = 0;
      const b = this.add.rectangle(ship.x, ship.y - 20, 4, 16, 0x00ff41).setDepth(8);
      pd.bullets.push({ obj: b, vy: -580 });
    }

    /* Bullets */
    for (let i = pd.bullets.length - 1; i >= 0; i--) {
      const b = pd.bullets[i];
      b.obj.y += b.vy * dt;
      if (b.obj.y < -20) { b.obj.destroy(); pd.bullets.splice(i, 1); }
    }

    /* Enemy spawn */
    pd.spawnTimer += delta;
    if (pd.spawnTimer > pd.spawnInterval) {
      pd.spawnTimer = 0;
      pd.spawnInterval = Math.max(500, pd.spawnInterval - 18);
      const ex = Phaser.Math.Between(24, W - 24);
      const eColor = [0xff4444, 0xff00ea, 0xffe700][Math.floor(Math.random() * 3)];
      const e = this.add.circle(ex, -20, 10, eColor, 0.85).setDepth(8);
      pd.enemies.push({ obj: e, vy: Phaser.Math.Between(140, 320), size: 10 });
    }

    /* Enemies */
    for (let i = pd.enemies.length - 1; i >= 0; i--) {
      const e = pd.enemies[i];
      e.obj.y += e.vy * dt;

      /* Hit player */
      if (Phaser.Math.Distance.Between(e.obj.x, e.obj.y, ship.x, ship.y) < e.size + 12) {
        pd.alive = false;
        e.obj.destroy(); pd.enemies.splice(i, 1);
        this.cameras.main.shake(300, 0.012);
        this.cameras.main.flash(200, 255, 0, 0);
        this._gameOver('OPERATIVE COMPROMISED\nShip destroyed by hostile packet.');
        return;
      }

      /* Hit bullet */
      let hit = false;
      for (let j = pd.bullets.length - 1; j >= 0; j--) {
        if (Phaser.Math.Distance.Between(pd.bullets[j].obj.x, pd.bullets[j].obj.y, e.obj.x, e.obj.y) < e.size + 3) {
          pd.bullets[j].obj.destroy(); pd.bullets.splice(j, 1);
          e.obj.destroy(); pd.enemies.splice(i, 1);
          this._addScore(10 + Math.floor(e.vy / 30));
          hit = true; break;
        }
      }
      if (hit) continue;
      if (e.obj.y > H + 20) { e.obj.destroy(); pd.enemies.splice(i, 1); }
    }
  }

  /* ══════════════════════════════════════════════
   *  MODE 2: CIPHER RUN
   *  Hex pair matching — click matched pairs before 45s expire.
   * ══════════════════════════════════════════════ */
  _start_cipher() {
    this._clearScene();
    this._buildCommonHUD(0x00e8ff);
    const W = this._W, H = this._H;
    this._gameActive = true;

    const HEX_POOL = ['A1','B2','C3','D4','E5','F6','0F','1E','2D','3C','7B','8A','9F','FF','AA','55'];
    const numPairs = 8;
    const pool = [];
    for (let i = 0; i < numPairs; i++) pool.push(HEX_POOL[i % HEX_POOL.length], HEX_POOL[i % HEX_POOL.length]);
    Phaser.Utils.Array.Shuffle(pool);

    const cols = 4, rows = 4;
    const cellW = 140, cellH = 70;
    const startX = W / 2 - (cols * cellW) / 2 + cellW / 2;
    const startY = H / 2 - (rows * cellH) / 2 + cellH / 2 + 10;

    const cards = [];
    pool.forEach((hex, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const cx = startX + col * cellW, cy = startY + row * cellH;
      const bg = this.add.rectangle(cx, cy, cellW - 8, cellH - 8, 0x010a16, 1)
        .setStrokeStyle(2, 0x00e8ff, 0.7).setDepth(10).setInteractive({ cursor: 'pointer' });
      const txt = this.add.text(cx, cy, hex, { fontFamily: 'JetBrains Mono', fontSize: '22px', color: '#00e8ff' }).setOrigin(0.5).setDepth(11).setAlpha(0);
      cards.push({ bg, txt, hex, revealed: false, matched: false });
    });

    this._cr = {
      cards, selected: null, time: 45, timeTimer: 0,
      matched: 0, total: numPairs, locked: false
    };
    this._timerTxt.setText('45s');

    /* Reveal-on-click */
    cards.forEach((card, idx) => {
      card.bg.on('pointerdown', () => this._cr_click(idx));
    });
  }

  _cr_click(idx) {
    const cr = this._cr;
    if (!this._gameActive || cr.locked) return;
    const card = cr.cards[idx];
    if (card.matched || card.revealed) return;

    card.revealed = true;
    card.txt.setAlpha(1);
    card.bg.setFillStyle(0x001a2e, 1).setStrokeStyle(2, 0x00e8ff, 1);

    if (cr.selected === null) {
      cr.selected = idx;
    } else {
      const prev = cr.cards[cr.selected];
      if (prev.hex === card.hex) {
        /* Match */
        card.matched = prev.matched = true;
        card.bg.setFillStyle(0x002200, 1).setStrokeStyle(2, 0x00ff41, 1);
        prev.bg.setFillStyle(0x002200, 1).setStrokeStyle(2, 0x00ff41, 1);
        this._addScore(50);
        cr.matched++;
        cr.selected = null;
        if (cr.matched >= cr.total) {
          this._gameActive = false;
          this._gameOver(`ALL PAIRS MATCHED!\nDecryption: ${cr.time}s remaining.`);
        }
      } else {
        /* Mismatch */
        cr.locked = true;
        this.time.delayedCall(700, () => {
          card.revealed = prev.revealed = false;
          card.txt.setAlpha(0); prev.txt.setAlpha(0);
          card.bg.setFillStyle(0x010a16, 1).setStrokeStyle(2, 0x00e8ff, 0.7);
          prev.bg.setFillStyle(0x010a16, 1).setStrokeStyle(2, 0x00e8ff, 0.7);
          cr.selected = null;
          cr.locked = false;
        });
        cr.selected = null;
      }
    }
  }

  _update_cipher(delta) {
    const cr = this._cr;
    if (!cr || !this._gameActive) return;
    cr.timeTimer += delta;
    if (cr.timeTimer >= 1000) {
      cr.time--; cr.timeTimer = 0;
      this._timerTxt.setText(`${cr.time}s`);
      if (cr.time <= 0) { this._gameActive = false; this._gameOver('CIPHER_LOCKED\nSession timeout. Retry.'); }
    }
  }

  /* ══════════════════════════════════════════════
   *  MODE 3: SIGNAL TRACE
   *  Connect source to dest via relay nodes, avoid hostile segments.
   * ══════════════════════════════════════════════ */
  _start_trace() {
    this._clearScene();
    this._buildCommonHUD(0xffe700);
    const W = this._W, H = this._H;
    this._gameActive = true;

    const NODES = [
      { id: 0, x: 80,     y: H/2,    label: 'SRC',  color: 0x00ff41, src: true },
      { id: 1, x: 250,    y: H*0.3,  label: 'R-01', color: 0x00e8ff },
      { id: 2, x: 250,    y: H*0.7,  label: 'R-02', color: 0x00e8ff },
      { id: 3, x: W/2,    y: H*0.25, label: 'R-03', color: 0xffe700 },
      { id: 4, x: W/2,    y: H*0.5,  label: 'HUB',  color: 0xffa500 },
      { id: 5, x: W/2,    y: H*0.75, label: 'R-04', color: 0x00e8ff },
      { id: 6, x: W-250,  y: H*0.35, label: 'R-05', color: 0x00e8ff },
      { id: 7, x: W-250,  y: H*0.65, label: 'R-06', color: 0x00e8ff },
      { id: 8, x: W-80,   y: H/2,    label: 'DST',  color: 0xff00ea, dst: true },
    ];

    const HOSTILE_EDGES = [[1, 5], [3, 7], [2, 4]];  // cannot use these
    const VALID_EDGES   = [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8]];

    const g = this.add.graphics().setDepth(5);

    /* Draw valid routes */
    g.lineStyle(1, 0x00e8ff, 0.12);
    VALID_EDGES.forEach(([a, b]) => {
      g.beginPath().moveTo(NODES[a].x, NODES[a].y).lineTo(NODES[b].x, NODES[b].y).strokePath();
    });

    /* Draw hostile routes */
    g.lineStyle(2, 0xff4444, 0.55);
    HOSTILE_EDGES.forEach(([a, b]) => {
      g.beginPath().moveTo(NODES[a].x, NODES[a].y).lineTo(NODES[b].x, NODES[b].y).strokePath();
      const mx = (NODES[a].x + NODES[b].x) / 2, my = (NODES[a].y + NODES[b].y) / 2;
      this.add.text(mx, my, '✗', { fontFamily: 'VT323', fontSize: '18px', color: '#ff4444' }).setOrigin(0.5).setDepth(6);
    });

    /* Draw nodes */
    NODES.forEach(nd => {
      const r = nd.src || nd.dst ? 18 : 13;
      const circ = this.add.circle(nd.x, nd.y, r, 0x010a16).setStrokeStyle(2, nd.color, 0.85).setDepth(7).setInteractive({ cursor: 'pointer' });
      this.add.text(nd.x, nd.y + r + 12, nd.label, { fontFamily: 'VT323', fontSize: '13px', color: `#${nd.color.toString(16).padStart(6,'0')}` }).setOrigin(0.5).setDepth(8);
      nd.circ = circ;
    });

    this._st = {
      nodes: NODES, validEdges: VALID_EDGES, hostileEdges: HOSTILE_EDGES,
      path: [0], routeGfx: this.add.graphics().setDepth(9),
      time: 30, timeTimer: 0
    };
    this._timerTxt.setText('30s');

    NODES.forEach((nd, idx) => {
      nd.circ.on('pointerdown', () => this._st_click(idx));
    });

    this.add.text(W / 2, 56, 'Connect SRC → DST. Avoid ✗ hostile edges.', {
      fontFamily: 'VT323', fontSize: '20px', color: '#aaa'
    }).setOrigin(0.5).setDepth(15);
  }

  _st_click(idx) {
    const st = this._st;
    if (!this._gameActive) return;
    const last = st.path[st.path.length - 1];
    if (idx === last) return;

    /* Check valid edge */
    const isValid = st.validEdges.some(([a,b]) => (a===last&&b===idx)||(b===last&&a===idx));
    const isHostile = st.hostileEdges.some(([a,b]) => (a===last&&b===idx)||(b===last&&a===idx));

    if (isHostile) {
      this.cameras.main.shake(200, 0.008);
      this.cameras.main.flash(150, 255, 0, 0);
      this._st.path = [0]; this._redrawRoute();
      return;
    }
    if (!isValid) return;

    /* Backtrack if revisiting */
    const prev = st.path.indexOf(idx);
    if (prev !== -1) { st.path = st.path.slice(0, prev + 1); this._redrawRoute(); return; }

    st.path.push(idx);
    this._redrawRoute();
    this._addScore(20);

    /* Check destination reached */
    const dst = st.nodes.find(n => n.dst);
    if (idx === dst.id) {
      this._gameActive = false;
      this._addScore(100 + st.time * 5);
      this._gameOver(`SIGNAL ROUTED!\nPath length: ${st.path.length} hops.`);
    }
  }

  _redrawRoute() {
    const st = this._st;
    st.routeGfx.clear();
    if (st.path.length < 2) return;
    st.routeGfx.lineStyle(3, 0x00ff41, 0.85);
    for (let i = 1; i < st.path.length; i++) {
      const a = st.nodes[st.path[i-1]], b = st.nodes[st.path[i]];
      st.routeGfx.beginPath().moveTo(a.x, a.y).lineTo(b.x, b.y).strokePath();
    }
  }

  _update_trace(delta) {
    const st = this._st;
    if (!st || !this._gameActive) return;
    st.timeTimer += delta;
    if (st.timeTimer >= 1000) {
      st.time--; st.timeTimer = 0;
      this._timerTxt.setText(`${st.time}s`);
      if (st.time <= 0) { this._gameActive = false; this._gameOver('SIGNAL_LOST\nRoute not established in time.'); }
    }
  }

  /* ──────────────────────────────────────────────
   *  PHASER UPDATE — dispatcher
   * ────────────────────────────────────────────── */
  update(_, delta) {
    if (!this._gameActive || !this._mode) return;
    if (this._mode === 'packet') this._update_packet(delta);
    if (this._mode === 'cipher') this._update_cipher(delta);
    if (this._mode === 'trace')  this._update_trace(delta);
  }
}
