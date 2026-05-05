/**
 * SCENE_CHARACTER — OPERATIVE IDENTITY CONFIGURATOR v3.0
 * Senior rewrite: reads live player state from localStorage / registry,
 * full FLLC faction/role display, animated character preview, no hardcoded names.
 *
 * Data flow:
 *  Reads: cyberworld-player (localStorage)
 *  Writes: registry → playerRole, playerColor, playerFaction, playerHandle
 *  Scene targets: SceneTutorial (new), SceneOperationsDeck (returning)
 */
export class SceneCharacter extends Phaser.Scene {
  constructor() {
    super('SceneCharacter');
    this._selectedRole    = null;
    this._selectedFaction = null;
    this._selectedColor   = 0x00e8ff;
    this._preview         = null;
    this._previewHead     = null;
    this._statusTxt       = null;
  }

  /* ─── Init: accept data from prior scene ─────────────────────── */
  init(data) {
    this._incoming = data || {};
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    /* Read existing player if any */
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('cyberworld-player') || 'null'); } catch (_) {}

    this.cameras.main.setBackgroundColor('#010c1c');

    /* ── CRT grid ── */
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x00e8ff, 0.04);
    for (let x = 0; x < W; x += 48) grid.strokeLineShape(new Phaser.Geom.Line(x, 0, x, H));
    for (let y = 0; y < H; y += 48) grid.strokeLineShape(new Phaser.Geom.Line(0, y, W, y));

    /* ── Title bar (Win98 style) ── */
    this.add.rectangle(W / 2, 28, W, 40, 0x000080);
    this.add.text(16, 28, 'OPERATIVE_IDENTITY_CONFIG_v5.2 // FLLC NEXUS', {
      fontFamily: 'VT323, monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.rectangle(W - 20, 28, 26, 20, 0x880000).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => window.location.href = '../cyberworld.html');
    this.add.text(W - 20, 28, 'X', { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0.5);

    /* ── Character viewport ── */
    const previewX = 160, previewY = H / 2 - 10;
    this._preview = this.add.circle(previewX, previewY, 45, 0x00e8ff).setStrokeStyle(3, 0xffffff, 0.8);
    this._previewHead = this.add.circle(previewX, previewY - 72, 26, 0x00e8ff).setStrokeStyle(2, 0xffffff, 0.7);
    this.add.rectangle(previewX, previewY - 75, 38, 10, 0x000000, 0.85); /* visor */
    this.tweens.add({ targets: [this._preview, this._previewHead], alpha: 0.8, duration: 1000, yoyo: true, repeat: -1 });
    this.add.text(previewX, previewY + 70, 'OPERATIVE_PREVIEW', {
      fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff'
    }).setOrigin(0.5);

    /* ── Handle display ── */
    const handle = (saved && saved.name) ? saved.name : 'UNKNOWN_OP';
    this.add.text(previewX, previewY + 90, handle, {
      fontFamily: 'Pixelify Sans', fontSize: '16px', color: '#ffe700'
    }).setOrigin(0.5);

    /* ── FACTION selector ── */
    const FACTIONS = [
      { id: 'nomad',   name: 'NOMAD_COLLECTIVE', color: 0x00e8ff, hex: '#00e8ff', icon: '🌍', bonus: 'Stealth +20 · Autonomy +15' },
      { id: 'corsair', name: 'CORSAIR_GUILD',    color: 0xff00ea, hex: '#ff00ea', icon: '⚓', bonus: 'Combat +20 · Loot +25' },
      { id: 'specter', name: 'SPECTER_COLLECTIVE',color:0x00ff41, hex: '#00ff41', icon: '👁️', bonus: 'Intel +25 · Detection −10' },
    ];

    this.add.text(320, 100, 'SELECT FACTION', {
      fontFamily: 'Pixelify Sans', fontSize: '16px', color: '#00e8ff', letterSpacing: 4
    });

    FACTIONS.forEach((f, i) => {
      const cx = 420 + i * 220;
      const cy = 185;
      const card = this.add.rectangle(cx, cy, 190, 120, 0x01061b)
        .setStrokeStyle(2, f.color, 0.5).setInteractive({ cursor: 'pointer' });
      const icon = this.add.text(cx, cy - 36, f.icon, { fontSize: '28px' }).setOrigin(0.5);
      const name = this.add.text(cx, cy + 4, f.name, {
        fontFamily: 'VT323', fontSize: '16px', color: f.hex
      }).setOrigin(0.5);
      const bonus = this.add.text(cx, cy + 24, f.bonus, {
        fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#668', align: 'center', wordWrap: { width: 178 }
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(2, f.color, 1));
      card.on('pointerout',  () => { if (this._selectedFaction !== f.id) card.setStrokeStyle(2, f.color, 0.5); });
      card.on('pointerdown', () => {
        this._selectedFaction = f.id;
        this._selectedColor = f.color;
        this._preview.setFillStyle(f.color);
        this._previewHead.setFillStyle(f.color);
        FACTIONS.forEach((_, j) => this._factionCards[j].setStrokeStyle(2, FACTIONS[j].color, j === i ? 1 : 0.3));
        this._updateStatus();
        this.cameras.main.shake(80, 0.003);
      });
      this._factionCards = this._factionCards || [];
      this._factionCards.push(card);
    });

    /* ── ROLE selector ── */
    const ROLES = [
      { id: 'HACKER',      color: 0x00e8ff, hex: '#00e8ff', desc: 'System breach · Root escalation · Remote exploit' },
      { id: 'INFILTRATOR', color: 0xff00ea, hex: '#ff00ea', desc: 'Social eng · Physical bypass · Credential theft' },
      { id: 'ANALYST',     color: 0x00ff41, hex: '#00ff41', desc: 'OSINT · Traffic analysis · Pattern recognition' },
      { id: 'OPERATOR',    color: 0xffa500, hex: '#ffa500', desc: 'Combat ops · Convoy escort · Tactical response' },
    ];

    this.add.text(320, 285, 'SELECT CLASS', {
      fontFamily: 'Pixelify Sans', fontSize: '16px', color: '#00e8ff', letterSpacing: 4
    });

    this._roleCards = [];
    ROLES.forEach((r, i) => {
      const cx = 350 + i * 210;
      const cy = 390;
      const card = this.add.rectangle(cx, cy, 192, 90, 0x01061b)
        .setStrokeStyle(2, r.color, 0.4).setInteractive({ cursor: 'pointer' });
      this.add.text(cx, cy - 24, r.id, {
        fontFamily: 'Pixelify Sans', fontSize: '15px', color: r.hex
      }).setOrigin(0.5);
      this.add.text(cx, cy + 8, r.desc, {
        fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#557', align: 'center', wordWrap: { width: 178 }
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(2, r.color, 1));
      card.on('pointerout',  () => { if (this._selectedRole !== r.id) card.setStrokeStyle(2, r.color, 0.4); });
      card.on('pointerdown', () => {
        this._selectedRole = r.id;
        ROLES.forEach((_, j) => this._roleCards[j].setStrokeStyle(2, ROLES[j].color, j === i ? 1 : 0.3));
        this._updateStatus();
        this.cameras.main.flash(200, 0, 232, 255);
      });
      this._roleCards.push(card);
    });

    /* Pre-select saved values */
    if (saved) {
      const fi = FACTIONS.findIndex(f => f.id === saved.faction);
      const ri = ROLES.findIndex(r => r.id === saved.role);
      if (fi >= 0) FACTIONS[fi]; /* trigger visual via click sim not needed, just set state */
      this._selectedFaction = saved.faction || 'nomad';
      this._selectedRole    = saved.role    || 'ANALYST';
      this._selectedColor   = (FACTIONS.find(f => f.id === this._selectedFaction) || FACTIONS[0]).color;
      this._preview.setFillStyle(this._selectedColor);
      this._previewHead.setFillStyle(this._selectedColor);
    }

    /* ── Status / info text ── */
    this._statusTxt = this.add.text(320, 500, '', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#445', lineSpacing: 4
    });
    this._updateStatus();

    /* ── DEPLOY button ── */
    const deployBtn = this.add.rectangle(W / 2 + 50, H - 70, 420, 58, 0x000080)
      .setStrokeStyle(2, 0xffffff, 0.8).setInteractive({ cursor: 'pointer' }).setDepth(10);
    this.add.text(W / 2 + 50, H - 70, '[ DEPLOY IDENTITY TO WORLD ]', {
      fontFamily: 'VT323', fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(11);

    this.tweens.add({ targets: deployBtn, scaleX: 1.015, scaleY: 1.015, duration: 900, yoyo: true, repeat: -1 });

    deployBtn.on('pointerdown', () => {
      const faction = this._selectedFaction || 'nomad';
      const role    = this._selectedRole    || 'ANALYST';
      this.registry.set('playerColor',   this._selectedColor);
      this.registry.set('playerRole',    role);
      this.registry.set('playerFaction', faction);
      this.registry.set('playerHandle',  handle);
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.time.delayedCall(800, () => {
        const isReturning = !!saved && (saved.storyProgress || 0) > 0;
        this.scene.start(isReturning ? 'SceneOperationsDeck' : 'SceneTutorial', { role, faction, color: this._selectedColor, handle });
      });
    });

    this.add.text(W / 2 + 50, H - 32, 'AUTH_SYNC: ACTIVE // CLOUD_LATTICE: CONNECTED // FLLC-NET v2030', {
      fontFamily: 'VT323', fontSize: '13px', color: '#333'
    }).setOrigin(0.5);
  }

  _updateStatus() {
    if (!this._statusTxt) return;
    const f = this._selectedFaction || '---';
    const r = this._selectedRole    || '---';
    this._statusTxt.setText([
      '> FACTION_SELECTED  : ' + f.toUpperCase(),
      '> CLASS_SELECTED    : ' + r,
      '> IDENTITY_STATUS   : ' + (f !== '---' && r !== '---' ? 'READY TO DEPLOY' : 'INCOMPLETE — SELECT FACTION & CLASS'),
    ].join('\n'));
  }
}
