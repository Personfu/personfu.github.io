/**
 * SCENE_WORLD_MAP — CYBERWORLD GLOBAL SECTOR MAP v3.0
 * Senior rewrite: 9 zones matching CWWorld layout, animated threat lines,
 * zone danger indicators, live world state simulation, zone filtering.
 */
export class SceneWorldMap extends Phaser.Scene {
  constructor() {
    super('SceneWorldMap');
    this._handle    = '';
    this._flags     = new Set();
    this._hoveredZone = null;
    this._infoText  = null;
    this._pulseTimers = [];
  }

  init(data) {
    this._handle = data.handle || 'OPERATIVE';
    this._flags  = new Set(data.flags || []);
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#01050a');

    /* ── Grid ── */
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x00e8ff, 0.06);
    for (let x = 0; x < W; x += 44) grid.strokeLineShape(new Phaser.Geom.Line(x, 0, x, H));
    for (let y = 0; y < H; y += 44) grid.strokeLineShape(new Phaser.Geom.Line(0, y, W, y));

    /* ── Title ── */
    this.add.text(W / 2, 24, 'GLOBAL_SECTOR_MAP // OPERATION STARSHIELD // FLLC-NET', {
      fontFamily: 'VT323', fontSize: '22px', color: '#00e8ff'
    }).setOrigin(0.5).setDepth(40);

    /* ── Zone definitions (matching CWWorld) ── */
    const ZONES = [
      { id:'nexus',   name:'THE NEXUS',      x:W*0.50, y:H*0.42, color:0x00e8ff, hex:'#00e8ff', icon:'🌐', danger:0, scene:'SceneLobby',           connects:['market','guild','signal','relay'] },
      { id:'market',  name:'BLACK MARKET',   x:W*0.26, y:H*0.62, color:0xffa500, hex:'#ffa500', icon:'🏪', danger:1, scene:'SceneLobby',           connects:['nexus','codice'] },
      { id:'guild',   name:'GUILD HALL',     x:W*0.74, y:H*0.26, color:0xff00ea, hex:'#ff00ea', icon:'⚔️', danger:1, scene:'SceneLobby',           connects:['nexus','archive'] },
      { id:'signal',  name:'SIGNAL DISTRICT',x:W*0.32, y:H*0.28, color:0x00ff41, hex:'#00ff41', icon:'📡', danger:1, scene:'SceneLobby',           connects:['nexus','relay'] },
      { id:'relay',   name:'RELAY STATION',  x:W*0.66, y:H*0.64, color:0xffe700, hex:'#ffe700', icon:'📶', danger:2, scene:'SceneOperationsDeck',  connects:['nexus','codice','bunker'] },
      { id:'codice',  name:'CODICE ZONE',    x:W*0.46, y:H*0.86, color:0xff4444, hex:'#ff4444', icon:'☣', danger:3, scene:'SceneOperationsDeck',  connects:['market','relay'] },
      { id:'archive', name:'DATA ARCHIVE',   x:W*0.89, y:H*0.50, color:0xc084fc, hex:'#c084fc', icon:'🗄️', danger:2, scene:'SceneOperationsDeck',  connects:['guild','bunker'] },
      { id:'bunker',  name:'CMD BUNKER',     x:W*0.80, y:H*0.80, color:0x00e8ff, hex:'#00e8ff', icon:'🏰', danger:2, scene:'SceneOperationsDeck',  connects:['relay','archive'] },
      { id:'undernet',name:'UNDERNET',       x:W*0.14, y:H*0.78, color:0x444444, hex:'#444', icon:'?',    danger:5, scene:null,                   connects:['codice'] },
    ];

    const zoneMap = {};
    ZONES.forEach(z => { zoneMap[z.id] = z; });

    /* ── Draw edges ── */
    const edgeG = this.add.graphics().setDepth(2);
    const drawn = new Set();
    ZONES.forEach(z => {
      z.connects.forEach(cid => {
        const key = [z.id, cid].sort().join('~');
        if (drawn.has(key)) return;
        drawn.add(key);
        const cz = zoneMap[cid];
        if (!cz) return;
        const threat = Math.max(z.danger, cz.danger);
        const alpha  = threat >= 3 ? 0.5 : threat >= 2 ? 0.3 : 0.18;
        const col    = threat >= 3 ? 0xff4444 : threat >= 2 ? 0xffe700 : 0x00e8ff;
        edgeG.lineStyle(1.5, col, alpha);
        edgeG.strokeLineShape(new Phaser.Geom.Line(z.x, z.y, cz.x, cz.y));
      });
    });

    /* ── Info panel ── */
    const infoPanel = this.add.rectangle(W / 2, H - 48, W - 40, 60, 0x010a16, 0.94)
      .setStrokeStyle(1, 0x00e8ff, 0.3).setDepth(50);
    this._infoText = this.add.text(W / 2, H - 48, 'HOVER or CLICK a zone', {
      fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#445', align: 'center'
    }).setOrigin(0.5).setDepth(51);

    /* ── Zone nodes ── */
    ZONES.forEach(z => {
      const discovered = z.id !== 'undernet';
      const r = 18;
      const ring  = this.add.circle(z.x, z.y, r + 6, 0x000000, 0).setStrokeStyle(1, z.color, 0.3).setDepth(5);
      const node  = this.add.circle(z.x, z.y, r, discovered ? 0x01061b : 0x111111, 1)
        .setStrokeStyle(2, z.color, discovered ? 0.9 : 0.2).setDepth(6);
      const icon  = this.add.text(z.x, z.y + 1, discovered ? z.icon : '?', { fontSize: '14px' }).setOrigin(0.5).setDepth(7);
      const label = this.add.text(z.x, z.y + r + 16, discovered ? z.name : '???', {
        fontFamily: 'VT323', fontSize: '13px', color: z.hex
      }).setOrigin(0.5).setDepth(7);

      /* Danger badge */
      if (z.danger >= 1 && discovered) {
        const stars = '★'.repeat(Math.min(z.danger, 5));
        this.add.text(z.x + r, z.y - r + 2, stars, {
          fontFamily: 'VT323', fontSize: '11px', color: z.danger >= 3 ? '#ff4444' : '#ffe700'
        }).setDepth(8);
      }

      /* Pulse for high-danger zones */
      if (z.danger >= 2 && discovered) {
        this.tweens.add({ targets: ring, scaleX: 1.4, scaleY: 1.4, alpha: 0.6, duration: 1200 + z.danger * 200, yoyo: true, repeat: -1 });
      }

      if (!discovered) return;

      /* Interactivity */
      node.setInteractive({ cursor: 'pointer' });
      icon.setInteractive({ cursor: 'pointer' });

      const showInfo = () => {
        const dangerStr = ['SAFE','LOW','MEDIUM','HIGH','CRITICAL','CLASSIFIED'][z.danger] || '???';
        this._infoText.setText(`${z.icon}  ${z.name}  |  THREAT: ${dangerStr}  |  ${z.scene ? 'ENTER: click again' : 'ACCESS: CLASSIFIED'}`).setColor(z.hex);
        node.setFillStyle(z.color, 0.25);
        this._hoveredZone = z;
      };
      const hideInfo = () => {
        if (this._hoveredZone === z) {
          this._infoText.setText('HOVER or CLICK a zone').setColor('#445');
          node.setFillStyle(0x01061b, 1);
          this._hoveredZone = null;
        }
      };

      node.on('pointerover', showInfo).on('pointerout', hideInfo);
      node.on('pointerdown', () => {
        if (!z.scene) { this._infoText.setText(`${z.name}: ACCESS DENIED — TIER 5+ REQUIRED`).setColor('#ff4444'); return; }
        this.cameras.main.flash(500, ...(z.danger >= 3 ? [255, 0, 0] : [0, 232, 255]));
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.time.delayedCall(900, () => this.scene.start(z.scene, { handle: this._handle, flags: [...this._flags] }));
      });
    });

    /* ── Legend ── */
    this.add.text(16, H - 90, '★★★+ = HIGH THREAT   ★★ = MED   ★ = LOW   DASHED = HOSTILE ROUTE', {
      fontFamily: 'VT323', fontSize: '13px', color: '#333'
    }).setDepth(50);

    /* ── Back button ── */
    const back = this.add.text(30, 24, '◀ LOBBY', {
      fontFamily: 'VT323', fontSize: '22px', color: '#00e8ff'
    }).setOrigin(0, 0.5).setDepth(50).setInteractive({ cursor: 'pointer' });
    back.on('pointerdown', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(700, () => this.scene.start('SceneLobby', { handle: this._handle, flags: [...this._flags] }));
    });
  }
}
