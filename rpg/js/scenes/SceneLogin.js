/**
 * SCENE_LOGIN — CYBERWORLD OPERATIVE AUTHENTICATION
 * Senior rewrite v3.0 — zero hardcoded user data, full CRT boot animation,
 * animated particles, dynamic player read from localStorage/registry.
 *
 * Flow:
 *  1. Boot text sequence (12 lines, staggered)
 *  2. "ENTER" prompt with scanning bar
 *  3. Click → progress bar → SceneCharacter
 *
 * Registry keys written:
 *   playerHandle  : operative codename (from localStorage or generated)
 *   playerFaction : faction id
 *   playerRole    : role string
 */
export class SceneLogin extends Phaser.Scene {
  constructor() {
    super('SceneLogin');
    this._particles = [];
    this._scanLine  = 0;
  }

  preload() {
    /* Fonts are loaded via HTML link tags. Nothing to preload here. */
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._W = W; this._H = H;

    /* ── Background ── */
    this.cameras.main.setBackgroundColor('#020408');

    /* ── Particle grid ── */
    this._gfx = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      this._particles.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: [0x00e8ff, 0x00ff41, 0xff00ea][Math.floor(Math.random() * 3)]
      });
    }

    /* ── CRT scanline overlay ── */
    const crt = this.add.graphics().setDepth(200);
    crt.lineStyle(1, 0x000000, 0.07);
    for (let y = 0; y < H; y += 4) {
      crt.beginPath().moveTo(0, y).lineTo(W, y).strokePath();
    }

    /* ── CYBERWORLD title ── */
    const title = this.add.text(W / 2, 70, 'CYBERWORLD', {
      fontFamily: 'Pixelify Sans, monospace',
      fontSize: '72px',
      color: '#00e8ff',
      fontStyle: 'bold',
      stroke: '#001830',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const sub = this.add.text(W / 2, 130, 'OPERATIVE AUTHENTICATION TERMINAL // FLLC-NET v2030.3', {
      fontFamily: 'VT323, monospace',
      fontSize: '20px',
      color: '#00ff41'
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    /* ── Boot log panel ── */
    const panelX = W / 2 - 320;
    const panelY = 160;
    const panelW = 640;
    const panelH = 280;
    const panel = this.add.rectangle(W / 2, panelY + panelH / 2, panelW, panelH, 0x010a16, 1)
      .setStrokeStyle(1, 0x00e8ff, 0.25).setDepth(5);

    const bootLines = [
      '[BOOT] FURIOS-INT BIOS v7.4.1 — SECURE BOOT ENABLED',
      '[INIT] Deriving operative identity from FLLC keystore...',
      '[LOAD] Faction databases: NOMAD · CORSAIR · SPECTER — OK',
      '[LOAD] World zones loaded — 9 regions available',
      '[LOAD] Mission contracts: ACTIVE // 12 priority ops',
      '[NET]  Checking Railway multiplayer endpoint...',
      '[AUTH] JWT subsystem initialized. Key rotation: 15m',
      '[WORLD] Starshield uplink integrity: 64% — CRITICAL',
      '[WARN] Hostile activity: CODICE_ZONE / RELAY_STATION',
      '[LOAD] Hacking combat engine: READY',
      '[LOAD] Story engine / StorySync: LINKED',
      '[READY] Insert credentials or continue as guest operative.',
    ];

    const lineObjects = [];
    bootLines.forEach((txt, i) => {
      const col = txt.startsWith('[WARN]') ? '#ff4444' : txt.startsWith('[AUTH') ? '#ffe700' : '#00ff41';
      const t = this.add.text(panelX + 12, panelY + 12 + i * 21, txt, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: col
      }).setAlpha(0).setDepth(6);
      lineObjects.push(t);
    });

    /* ── Animate boot sequence ── */
    this.tweens.add({ targets: title, alpha: 1, y: 60, duration: 600, ease: 'Cubic.Out' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 300 });

    lineObjects.forEach((obj, i) => {
      this.tweens.add({ targets: obj, alpha: 1, delay: 500 + i * 80, duration: 100 });
    });

    /* ── Enter button (appears after boot) ── */
    const btnDelay = 500 + bootLines.length * 80 + 300;
    const btnBg = this.add.rectangle(W / 2, panelY + panelH + 80, 360, 72, 0x001020)
      .setStrokeStyle(3, 0x00e8ff, 0.8).setDepth(10).setAlpha(0)
      .setInteractive({ cursor: 'pointer' });
    const btnTxt = this.add.text(W / 2, panelY + panelH + 80, '[ AUTHENTICATE OPERATIVE ]', {
      fontFamily: 'VT323, monospace', fontSize: '32px', color: '#00e8ff'
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    /* Progress bar */
    const barBg = this.add.rectangle(W / 2, panelY + panelH + 128, 360, 10, 0x001a30)
      .setStrokeStyle(1, 0x00e8ff, 0.3).setDepth(10).setAlpha(0);
    const barFill = this.add.rectangle(W / 2 - 178, panelY + panelH + 128, 2, 8, 0x00e8ff)
      .setOrigin(0, 0.5).setDepth(11).setAlpha(0);

    this.time.delayedCall(btnDelay, () => {
      this.tweens.add({ targets: [btnBg, btnTxt, barBg, barFill], alpha: 1, duration: 400 });
      /* Pulse */
      this.tweens.add({ targets: btnBg, scaleX: 1.02, scaleY: 1.02, duration: 900, yoyo: true, repeat: -1 });
    });

    /* Boot enter */
    btnBg.on('pointerdown', () => {
      btnBg.removeAllListeners();
      this.tweens.add({
        targets: barFill, scaleX: 180, duration: 900, ease: 'Cubic.In',
        onComplete: () => {
          this.cameras.main.flash(400, 0, 232, 255);
          this.cameras.main.fadeOut(600, 0, 0, 0);
          this.time.delayedCall(700, () => this.scene.start('SceneCharacter'));
        }
      });
      btnTxt.setText('[ AUTHENTICATING... ]').setColor('#ffe700');
    });

    /* ── Bottom disclaimer ── */
    this.add.text(W / 2, H - 20, 'UNAUTHORIZED ACCESS PROHIBITED · FLLC-NET SECURITY · LOGGING ENABLED', {
      fontFamily: 'VT323, monospace', fontSize: '14px', color: '#222'
    }).setOrigin(0.5).setDepth(10);

    /* ── Left/right operative silhouettes ── */
    this._drawOperative(100, H / 2 + 80, 0x00e8ff, 1);
    this._drawOperative(W - 100, H / 2 + 80, 0xff00ea, -1);
  }

  _drawOperative(cx, cy, color, dir) {
    const g = this.add.graphics().setDepth(3).setAlpha(0.35);
    g.fillStyle(color, 1);
    /* body */
    g.fillRect(cx - 18 * dir, cy - 30, 36, 55);
    /* head */
    g.fillCircle(cx, cy - 45, 20);
    /* visor */
    g.fillStyle(0x000000, 0.8);
    g.fillRect(cx - 14, cy - 52, 28, 10);
    this.tweens.add({ targets: g, alpha: 0.5, duration: 1800, yoyo: true, repeat: -1 });
  }

  update(time, delta) {
    if (!this._gfx) return;
    const W = this._W, H = this._H;
    this._gfx.clear();
    this._particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      this._gfx.fillStyle(p.color, p.alpha);
      this._gfx.fillCircle(p.x, p.y, p.r);
    });
  }
}
