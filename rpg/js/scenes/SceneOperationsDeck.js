/**
 * SCENE_OPERATIONS_DECK — FLLC ENTERPRISE SOC HUB v3.0
 * Senior rewrite: 6 interactive mission nodes, stealth indicator,
 * real-time HUD log, click-to-move operative, skill-gated encounters,
 * multi-objective mission flow with camera flash feedback.
 *
 * Mission flow:
 *  1. Hack SOC Terminal (grants SOC_ACCESS)
 *  2. Retrieve Intel Cache (requires SOC_ACCESS, grants INTEL_SHARD)
 *  3. Disable Rogue AI Node (combat skill check)
 *  4. Exfil via Exit Hatch → SceneLobby
 */
export class SceneOperationsDeck extends Phaser.Scene {
  constructor() {
    super('SceneOperationsDeck');
    this._logs        = [];
    this._inventory   = new Set(['ROOT_KEY', 'OSINT_PROBE']);
    this._flags       = new Set();   // completed objective IDs
    this._detection   = 0;           // 0-100 detection meter
    this._detTimer    = 0;
    this._operative   = null;
    this._target      = null;
    this._pendingNode = null;
    this._role        = null;
    this._handle      = '';
  }

  init(data) {
    this._role   = data.role   || { id: 'nomad', color: 0x00e8ff, title: 'OPERATIVE' };
    this._handle = data.handle || 'OPERATIVE';
    const saved  = this._loadPlayer();
    if (saved) {
      this._handle = saved.name || this._handle;
      (saved.inventory || []).forEach(i => this._inventory.add(i));
    }
  }

  _loadPlayer() {
    try { return JSON.parse(localStorage.getItem('cyberworld-player') || 'null'); } catch (_) { return null; }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._W = W; this._H = H;
    const roleColor = this._role.color || 0x00e8ff;

    this.cameras.main.setBackgroundColor('#050a14');

    /* ── Isometric grid ── */
    const g = this.add.graphics();
    g.lineStyle(1, roleColor, 0.05);
    for (let i = -W; i < W * 2; i += 48) {
      g.beginPath().moveTo(i, 0).lineTo(i - H / 2, H).strokePath();
      g.beginPath().moveTo(i, 0).lineTo(i + H / 2, H).strokePath();
    }

    /* ── Zone title ── */
    this.add.text(W / 2, 18, `OPERATIONS_DECK // ${this._role.title} // FLLC SOC`, {
      fontFamily: 'VT323', fontSize: '20px', color: `#${roleColor.toString(16).padStart(6,'0')}`
    }).setOrigin(0.5).setDepth(30);

    /* ── Operative (player) ── */
    this._operative = this.add.container(W / 2, H / 2);
    const body = this.add.circle(0, 0, 14, roleColor).setStrokeStyle(2, 0xffffff, 0.7);
    const head = this.add.circle(0, -22, 10, roleColor).setStrokeStyle(2, 0xffffff, 0.6);
    const visor= this.add.rectangle(0, -24, 16, 5, 0x000000, 0.85);
    this._operative.add([body, head, visor]);
    this._target = new Phaser.Math.Vector2(this._operative.x, this._operative.y);

    /* ── Mission nodes ── */
    const NODES = [
      {
        id: 'soc-terminal', title: 'SOC_TERMINAL_v4', type: 'terminal', x: 170, y: 170,
        requires: [], grants: 'SOC_ACCESS',
        hint: 'Hack this to establish gateway access.',
        hintDone: 'Terminal compromised. Gateway OPEN.',
        color: 0x00ff41
      },
      {
        id: 'intel-cache', title: 'INTEL_CACHE_A', type: 'cache', x: W - 160, y: 200,
        requires: ['SOC_ACCESS'], grants: 'INTEL_SHARD_A',
        hint: 'Locked — requires SOC_ACCESS.',
        hintDone: 'Data shard extracted.',
        color: 0x00e8ff
      },
      {
        id: 'relay-tap', title: 'RELAY_TAP_9', type: 'terminal', x: 260, y: H - 180,
        requires: [], grants: 'RELAY_COORDS',
        hint: 'Tap relay to read Starshield routing table.',
        hintDone: 'Relay coords acquired.',
        color: 0xffe700
      },
      {
        id: 'ai-node', title: 'ROGUE_AI_NODE_X9', type: 'hostile', x: W - 280, y: H - 200,
        requires: ['SOC_ACCESS'], grants: 'AI_NEUTRALIZED',
        hint: 'Neutralize before accessing server vault.',
        hintDone: 'AI core wiped. Vault accessible.',
        color: 0xff4444
      },
      {
        id: 'server-vault', title: 'SERVER_VAULT_ALPHA', type: 'cache', x: W - 120, y: H / 2,
        requires: ['AI_NEUTRALIZED'], grants: 'CLASSIFIED_DATA',
        hint: 'LOCKED — Neutralize AI first.',
        hintDone: 'Classified data bundle secured.',
        color: 0xc084fc
      },
      {
        id: 'exit-hatch', title: 'EXFIL_HATCH', type: 'exit', x: W - 60, y: 60,
        requires: [], grants: null,
        hint: 'Exfil to Lobby when objectives complete.',
        hintDone: '',
        color: 0x00ff88
      },
    ];

    this._nodes = [];
    NODES.forEach(nd => {
      let sprite;
      if (nd.type === 'exit') {
        sprite = this.add.rectangle(nd.x, nd.y, 64, 36, 0x00ff88, 0.15)
          .setStrokeStyle(3, 0x00ff88, 0.8).setDepth(8).setInteractive({ cursor: 'pointer' });
        this.add.text(nd.x, nd.y, 'EXFIL', { fontFamily: 'VT323', fontSize: '13px', color: '#00ff88' }).setOrigin(0.5).setDepth(9);
      } else if (nd.type === 'hostile') {
        sprite = this.add.rectangle(nd.x, nd.y, 44, 56, 0xff4444, 0.12)
          .setStrokeStyle(3, 0xff4444, 0.9).setDepth(8).setInteractive({ cursor: 'pointer' });
        this.add.text(nd.x, nd.y - 38, nd.title, { fontFamily: 'VT323', fontSize: '12px', color: '#ff4444' }).setOrigin(0.5).setDepth(9);
      } else {
        sprite = this.add.sprite(nd.x, nd.y, nd.type === 'cache' ? 'intelCache' : 'terminalNode')
          .setOrigin(0.5).setTint(nd.color).setAlpha(0.85).setDepth(8).setInteractive({ cursor: 'pointer' });
        this.add.text(nd.x, nd.y - 36, nd.title, { fontFamily: 'VT323', fontSize: '11px', color: `#${nd.color.toString(16).padStart(6,'0')}` }).setOrigin(0.5).setDepth(9);
      }

      this.tweens.add({ targets: sprite, alpha: 0.45, scale: 1.06, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1 });
      sprite.on('pointerdown', () => {
        this._target.set(nd.x, nd.y);
        this._pendingNode = nd;
        this._pushLog('NAV', `Moving to: ${nd.title}`);
      });
      this._nodes.push({ ...nd, sprite, done: false });
    });

    /* ── Click-to-move ── */
    this.input.on('pointerdown', (pointer, gameObjects) => {
      if (gameObjects.length === 0) {
        this._target.set(pointer.x, pointer.y);
        this._pendingNode = null;
        this._spawnClickFX(pointer.x, pointer.y);
      }
    });

    /* ── CRT overlay ── */
    const crt = this.add.graphics().setDepth(200);
    crt.lineStyle(1, 0x000000, 0.08);
    for (let y = 0; y < H; y += 4) crt.beginPath().moveTo(0, y).lineTo(W, y).strokePath();

    this._buildHUD(W, H);
    this._pushLog('BOOT', `Identity: ${this._handle} (${this._role.title})`);
    this._pushLog('MISSION', 'Breach SOC Terminal to establish gateway.');
  }

  _buildHUD(W, H) {
    /* Top-left objective */
    this._objText = this.add.text(16, 30, '', {
      fontFamily: 'VT323', fontSize: '18px', color: '#00ff88', lineSpacing: 3
    }).setDepth(50);
    this._refreshObj();

    /* Detection meter */
    this.add.text(W - 160, 30, 'DETECTION', {
      fontFamily: 'VT323', fontSize: '14px', color: '#ff4444'
    }).setDepth(50);
    this._detBg   = this.add.rectangle(W - 80, 48, 120, 8, 0x220000).setDepth(50);
    this._detFill = this.add.rectangle(W - 140, 48, 2, 8, 0xff4444).setOrigin(0, 0.5).setDepth(51);

    /* Inventory bar */
    this._invText = this.add.text(16, H - 110, '', {
      fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff', lineSpacing: 2
    }).setDepth(50);
    this._refreshInv();

    /* Log window */
    this.add.rectangle(W / 2, H - 50, W - 32, 80, 0x010a16, 0.92)
      .setStrokeStyle(1, 0x00e8ff, 0.3).setDepth(48);
    this._logText = this.add.text(18, H - 86, '', {
      fontFamily: 'VT323', fontSize: '16px', color: '#66ffaa', lineSpacing: 3
    }).setDepth(49);
  }

  _refreshObj() {
    const remaining = this._nodes.filter(n => !n.done && n.type !== 'exit').length;
    this._objText && this._objText.setText([
      `OBJ: ${remaining} node(s) remaining`,
      `FLAGS: ${[...this._flags].join(' · ') || 'none'}`
    ].join('\n'));
  }

  _refreshInv() {
    this._invText && this._invText.setText('INV: ' + [...this._inventory].join(' · '));
  }

  _pushLog(ch, msg) {
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this._logs.push(`[${ts}] <${ch}> ${msg}`);
    if (this._logs.length > 4) this._logs.shift();
    this._logText && this._logText.setText(this._logs.join('\n'));
  }

  _spawnClickFX(x, y) {
    const c = this.add.circle(x, y, 5, 0x00e8ff, 0.9).setStrokeStyle(2, 0xffffff, 0.5);
    this.tweens.add({ targets: c, scaleX: 4, scaleY: 4, alpha: 0, duration: 350, onComplete: () => c.destroy() });
  }

  _interact(node) {
    const dist = Phaser.Math.Distance.Between(this._operative.x, this._operative.y, node.sprite.x || node.sprite.getCenter().x, node.sprite.y || node.sprite.getCenter().y);
    if (dist > 90) { this._pushLog('ERR', 'Too far — move closer.'); return; }
    if (node.done) { this._pushLog('INFO', `${node.title} already secured.`); return; }

    /* Check requirements */
    const missing = node.requires.filter(r => !this._flags.has(r));
    if (missing.length) {
      this._pushLog('LOCK', `Requires: ${missing.join(', ')}`);
      this.cameras.main.shake(150, 0.006);
      return;
    }

    /* EXIT node */
    if (node.type === 'exit') {
      this._pushLog('EXFIL', 'Extraction sequence initiated...');
      this.cameras.main.flash(500, 0, 255, 136);
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.time.delayedCall(1100, () => this.scene.start('SceneLobby', { handle: this._handle, flags: [...this._flags] }));
      return;
    }

    /* Hostile node — quick skill check */
    if (node.type === 'hostile') {
      const roll = Math.random();
      if (roll < 0.45) {
        this._detection = Math.min(100, this._detection + 30);
        this._pushLog('COMBAT', `Hack attempt failed! Detection +30%`);
        this.cameras.main.shake(300, 0.01);
        return;
      }
    }

    /* Success */
    node.done = true;
    node.sprite.setTint(0x00ff88).setAlpha(0.5);
    if (node.grants) {
      this._flags.add(node.grants);
      this._inventory.add(node.grants);
    }
    this._pushLog('OK', node.hintDone);
    this.cameras.main.flash(300, 0, 255, 100);
    this._refreshObj();
    this._refreshInv();
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    const speed = 260;

    /* Movement */
    const dist = Phaser.Math.Distance.Between(this._operative.x, this._operative.y, this._target.x, this._target.y);
    if (dist > 8) {
      const angle = Phaser.Math.Angle.Between(this._operative.x, this._operative.y, this._target.x, this._target.y);
      this._operative.x += Math.cos(angle) * speed * delta;
      this._operative.y += Math.sin(angle) * speed * delta;
    } else if (this._pendingNode) {
      this._interact(this._pendingNode);
      this._pendingNode = null;
    }

    /* Detection decay */
    this._detTimer += deltaMs;
    if (this._detTimer > 2000) {
      this._detection = Math.max(0, this._detection - 2);
      this._detTimer = 0;
    }

    /* Detection bar update */
    if (this._detFill) {
      this._detFill.scaleX = Math.max(0, this._detection / 100) * 120;
      const col = this._detection > 66 ? 0xff2222 : this._detection > 33 ? 0xffa500 : 0x00ff41;
      this._detFill.setFillStyle(col);
    }

    /* Passive detection increase in hostile proximity */
    this._nodes.forEach(nd => {
      if (nd.type === 'hostile' && !nd.done) {
        const d = Phaser.Math.Distance.Between(this._operative.x, this._operative.y, nd.sprite.x, nd.sprite.y);
        if (d < 120) this._detection = Math.min(100, this._detection + 0.03);
      }
    });
  }
}
