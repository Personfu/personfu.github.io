/**
 * SCENE_LOBBY — GLOBAL SOC JUNCTION v3.0
 * Senior rewrite: faction-specific NPC roster, multi-line dialogue trees,
 * market terminal, portal pads to all sectors, animated world ambience.
 *
 * Data flow:
 *  Reads: data.handle, data.flags (from SceneOperationsDeck)
 *  Exports to: SceneOperationsDeck, SceneWorldMap, SceneMinigame
 */
export class SceneLobby extends Phaser.Scene {
  constructor() {
    super('SceneLobby');
    this._npcs         = [];
    this._dialogActive = false;
    this._dialogNPC    = null;
    this._dialogIdx    = 0;
    this._operative    = null;
    this._target       = null;
    this._pendingNPC   = null;
    this._pendingPortal= null;
    this._handle       = '';
    this._flags        = new Set();
  }

  init(data) {
    this._handle = data.handle || 'OPERATIVE';
    this._flags  = new Set(data.flags || []);
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#040b1a');

    /* ── World grid ── */
    const g = this.add.graphics();
    g.lineStyle(1, 0x00e8ff, 0.05);
    for (let i = 0; i < W; i += 48) g.strokeLineShape(new Phaser.Geom.Line(i, 0, i, H));
    for (let i = 0; i < H; i += 48) g.strokeLineShape(new Phaser.Geom.Line(0, i, W, i));

    /* ── Zone label ── */
    this.add.text(W / 2, 22, `FLLC GLOBAL_SOC_JUNCTION // OPERATIVE: ${this._handle}`, {
      fontFamily: 'VT323', fontSize: '18px', color: '#00e8ff'
    }).setOrigin(0.5).setDepth(30);

    /* ── Operative ── */
    this._operative = this.add.container(W / 2, H / 2 + 40);
    const body = this.add.circle(0, 0, 14, 0x00e8ff).setStrokeStyle(2, 0xffffff, 0.7);
    const head = this.add.circle(0, -22, 10, 0x00e8ff).setStrokeStyle(2, 0xffffff, 0.6);
    this._operative.add([body, head]);
    this._target = new Phaser.Math.Vector2(this._operative.x, this._operative.y);

    /* ── NPC roster ── */
    const NPC_DATA = [
      {
        name: 'ARCHIVIST_VAEL',
        role: 'FLLC Field Coordinator',
        x: 160, y: 220, color: 0x00e8ff,
        dialogue: [
          'The uplink integrity is holding — barely. We need three more relay fragments.',
          'Sector Signal_District: resonance interference. Could be jamming. Check it.',
          'Use RELAY_STATION route for data-escorts. Avoid CODICE without backup.',
        ]
      },
      {
        name: 'BROKER-7',
        role: 'Black Market Liaison',
        x: W - 180, y: 200, color: 0xffa500,
        dialogue: [
          'INTEL_SHARD_A going for 1,800¢ on open market right now. Sell window: 2h.',
          'Corsairs hit the Market twice this cycle. Prices inflated 18%.',
          'I can source a Hashcat cluster — but you\'ll owe me a favor.',
        ]
      },
      {
        name: 'WARLORD_NEXIS',
        role: 'Guild Commander',
        x: 200, y: H - 200, color: 0xff00ea,
        dialogue: [
          'Three Corsair raids on Relay Station this week. Twelve escorts lost.',
          'Specter Collective flagged a mole in the Nomad camp. Trust no one.',
          'Join a convoy team. Solo escorts are being targeted specifically.',
        ]
      },
      {
        name: 'DR_AXIOM',
        role: 'Signal Lab Theorist',
        x: W - 200, y: H - 200, color: 0x00ff41,
        dialogue: [
          'The Mandelbrot resonator in Lab 3 maps Corsair burst patterns. Beautiful chaos.',
          'If you understand Fourier decomposition, you can fingerprint enemy comm channels.',
          'Visit signal-lab.html on your device. The math IS the weapon.',
        ]
      },
    ];

    NPC_DATA.forEach(npc => {
      const cont = this.add.container(npc.x, npc.y).setDepth(10).setInteractive(
        new Phaser.Geom.Rectangle(-24, -44, 48, 72), Phaser.Geom.Rectangle.Contains
      );
      const bBody = this.add.rectangle(0, 0, 26, 36, 0x112233).setStrokeStyle(2, npc.color, 0.9);
      const bFace = this.add.rectangle(0, -8, 18, 10, npc.color, 0.6);
      cont.add([bBody, bFace]);
      this.tweens.add({ targets: cont, y: npc.y + 4, duration: 1400 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(npc.x, npc.y - 48, npc.name, {
        fontFamily: 'VT323', fontSize: '13px', color: `#${npc.color.toString(16).padStart(6,'0')}`
      }).setOrigin(0.5).setDepth(11);
      this.add.text(npc.x, npc.y - 36, npc.role, {
        fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#445'
      }).setOrigin(0.5).setDepth(11);

      cont.on('pointerover', () => bBody.setStrokeStyle(3, npc.color, 1));
      cont.on('pointerout',  () => bBody.setStrokeStyle(2, npc.color, 0.9));
      cont.on('pointerdown', () => {
        this._target.set(npc.x, npc.y);
        this._pendingNPC = npc;
      });

      this._npcs.push({ ...npc, container: cont, angle: Math.random() * 6.28 });
    });

    /* ── Portal pads ── */
    const PORTALS = [
      { label: 'OPERATIONS_DECK', scene: 'SceneOperationsDeck', x: W / 2, y: 60, color: 0x00e8ff },
      { label: 'WORLD_MAP',       scene: 'SceneWorldMap',       x: W - 60, y: H / 2, color: 0x00ff41 },
      { label: 'ARCADE',          scene: 'SceneMinigame',        x: W / 2, y: H - 60, color: 0xffe700 },
    ];

    PORTALS.forEach(p => {
      const pad = this.add.ellipse(p.x, p.y, 80, 24, p.color, 0.2)
        .setStrokeStyle(2, p.color, 0.8).setDepth(5).setInteractive({ cursor: 'pointer' });
      this.add.text(p.x, p.y, p.label, {
        fontFamily: 'VT323', fontSize: '12px', color: `#${p.color.toString(16).padStart(6,'0')}`
      }).setOrigin(0.5).setDepth(6);
      this.tweens.add({ targets: pad, scaleX: 1.1, scaleY: 1.1, alpha: 0.6, duration: 1000, yoyo: true, repeat: -1 });
      pad.on('pointerdown', () => {
        this._target.set(p.x, p.y);
        this._pendingPortal = p;
      });
    });

    /* ── Market terminal ── */
    const mkt = this.add.rectangle(80, H / 2, 60, 80, 0xffa500, 0.1)
      .setStrokeStyle(2, 0xffa500, 0.8).setDepth(8).setInteractive({ cursor: 'pointer' });
    this.add.text(80, H / 2 - 50, 'MARKET', { fontFamily: 'VT323', fontSize: '13px', color: '#ffa500' }).setOrigin(0.5).setDepth(9);
    mkt.on('pointerdown', () => this._openMarket());

    /* ── Inventory sidebar ── */
    this.add.rectangle(W - 70, H / 2, 110, 320, 0x01061b, 0.8).setStrokeStyle(1, 0x334455, 0.5).setDepth(20);
    this.add.text(W - 120, H / 2 - 148, 'INVENTORY', { fontFamily: 'VT323', fontSize: '13px', color: '#00e8ff' }).setDepth(21);
    this._invText = this.add.text(W - 120, H / 2 - 130, '', {
      fontFamily: 'VT323', fontSize: '13px', color: '#fff', lineSpacing: 3
    }).setDepth(21);
    this._refreshInv();

    /* ── Dialog UI ── */
    this._dialogContainer = this.add.container(W / 2, H - 100).setDepth(150).setVisible(false);
    const dlgBox  = this.add.rectangle(0, 0, W - 80, 100, 0x01061b, 0.97).setStrokeStyle(2, 0x00e8ff, 0.8);
    this._dlgName = this.add.text(-W / 2 + 50 + 16, -36, '', { fontFamily: 'Pixelify Sans', fontSize: '14px', color: '#00e8ff' });
    this._dlgText = this.add.text(-W / 2 + 50 + 16, -12, '', { fontFamily: 'VT323', fontSize: '20px', color: '#ccffcc', wordWrap: { width: W - 120 }, lineSpacing: 2 });
    const nextHint= this.add.text(W / 2 - 60, 40, '[ CLICK TO CONTINUE ]', { fontFamily: 'VT323', fontSize: '13px', color: '#334' }).setOrigin(0.5);
    this._dialogContainer.add([dlgBox, this._dlgName, this._dlgText, nextHint]);
    this._dialogContainer.setInteractive(new Phaser.Geom.Rectangle(-W / 2 + 40, -60, W - 80, 120), Phaser.Geom.Rectangle.Contains);
    this._dialogContainer.on('pointerdown', () => this._advanceDialog());

    /* ── Click to move (world) ── */
    this.input.on('pointerdown', (ptr, gos) => {
      if (gos.length === 0) {
        this._target.set(ptr.x, ptr.y);
        this._pendingNPC = null;
        this._pendingPortal = null;
        this._dialogContainer.setVisible(false);
        this._dialogActive = false;
      }
    });

    /* ── CRT overlay ── */
    const crt = this.add.graphics().setDepth(200);
    crt.lineStyle(1, 0x000000, 0.07);
    for (let y = 0; y < H; y += 4) crt.beginPath().moveTo(0, y).lineTo(W, y).strokePath();
  }

  _refreshInv() {
    const flags = [...this._flags];
    this._invText && this._invText.setText(flags.length ? flags.map(f => `> ${f}`).join('\n') : '> EMPTY');
  }

  _openMarket() {
    this._pushToast('🏪 MARKET: Current offers:\n  INTEL_SHARD_A → 1,800¢\n  ROOT_KEY_EXT → 4,200¢');
  }

  _showDialog(npc) {
    this._dialogNPC    = npc;
    this._dialogIdx    = 0;
    this._dialogActive = true;
    this._dlgName.setText(npc.name + ' [' + npc.role + ']');
    this._dlgText.setText(npc.dialogue[0]);
    this._dialogContainer.setVisible(true);
  }

  _advanceDialog() {
    if (!this._dialogNPC) return;
    this._dialogIdx++;
    if (this._dialogIdx >= this._dialogNPC.dialogue.length) {
      this._dialogActive = false;
      this._dialogContainer.setVisible(false);
      return;
    }
    this._dlgText.setText(this._dialogNPC.dialogue[this._dialogIdx]);
  }

  _pushToast(msg) {
    const t = this.add.text(this._W / 2, 70, msg, {
      fontFamily: 'VT323', fontSize: '16px', color: '#ffe700',
      backgroundColor: '#010a16', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: t, alpha: 0, delay: 3000, duration: 600, onComplete: () => t.destroy() });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    const speed = 240;

    const dist = Phaser.Math.Distance.Between(this._operative.x, this._operative.y, this._target.x, this._target.y);
    if (dist > 8) {
      const angle = Phaser.Math.Angle.Between(this._operative.x, this._operative.y, this._target.x, this._target.y);
      this._operative.x += Math.cos(angle) * speed * delta;
      this._operative.y += Math.sin(angle) * speed * delta;
    } else {
      if (this._pendingNPC) {
        this._showDialog(this._pendingNPC);
        this._pendingNPC = null;
      }
      if (this._pendingPortal) {
        const p = this._pendingPortal;
        this._pendingPortal = null;
        this.cameras.main.flash(400, 0, 232, 255);
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.time.delayedCall(800, () => this.scene.start(p.scene, { handle: this._handle, flags: [...this._flags] }));
      }
    }

    /* Floating NPC bob */
    this._npcs.forEach(npc => {
      npc.angle += 0.018;
      npc.container.y = npc.y + Math.sin(npc.angle) * 5;
    });
  }
}
