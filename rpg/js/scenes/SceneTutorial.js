/**
 * SCENE_TUTORIAL — OPERATIVE ONBOARDING v3.0
 * Senior rewrite: animated multi-step tutorial with interactive hacking mini-demo,
 * faction-colored UI, progressive reveal, and hands-on terminal interaction.
 */
export class SceneTutorial extends Phaser.Scene {
  constructor() {
    super('SceneTutorial');
    this._step    = 0;
    this._stepBtns= [];
    this._role    = null;
    this._faction = null;
  }

  init(data) {
    this._role    = data.role    || 'ANALYST';
    this._faction = data.faction || 'nomad';
    this._handle  = data.handle  || 'OPERATIVE';
    this._color   = data.color   || 0x00e8ff;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#050a14');

    /* ── Frame ── */
    this.add.rectangle(W / 2, H / 2, W - 60, H - 60, 0x01061b)
      .setStrokeStyle(2, this._color, 0.5);

    /* ── Title ── */
    this.add.text(W / 2, 55, 'OPERATIVE_ONBOARDING // FLLC-NET TRAINING MODULE', {
      fontFamily: 'Pixelify Sans', fontSize: '20px', color: '#00ff88'
    }).setOrigin(0.5);

    this.add.text(W / 2, 82, `[ ${this._handle} · ${this._role} · ${this._faction.toUpperCase()} ]`, {
      fontFamily: 'VT323', fontSize: '16px', color: '#556'
    }).setOrigin(0.5);

    /* ── Steps ── */
    const STEPS = [
      {
        label: '01 · MOVEMENT',
        body: [
          'CLICK anywhere in the world to move your operative.',
          'Your operative pathfinds to the clicked position.',
          'Avoid patrol zones — detection = mission failure.',
        ],
        demo: (cx, cy, scene) => {
          const op = scene.add.container(cx, cy + 40);
          const body = scene.add.circle(0, 0, 16, scene._color, 1).setStrokeStyle(2, 0xffffff, 0.6);
          const head = scene.add.circle(0, -26, 10, scene._color).setStrokeStyle(2, 0xffffff, 0.5);
          op.add([body, head]);
          scene.tweens.add({ targets: op, x: cx + 80, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
          return op;
        }
      },
      {
        label: '02 · INTERACTION',
        body: [
          'Click on glowing terminals and nodes to interact.',
          'Press E when adjacent to interact via keyboard.',
          'Green terminals = hackable. Red = hostile/locked.',
        ],
        demo: (cx, cy, scene) => {
          const node = scene.add.rectangle(cx, cy + 30, 44, 56, 0x01061b).setStrokeStyle(3, 0x00ff41, 1);
          const lbl = scene.add.text(cx, cy + 30, 'NODE', { fontFamily: 'VT323', fontSize: '14px', color: '#00ff41' }).setOrigin(0.5);
          scene.tweens.add({ targets: node, alpha: 0.4, scaleX: 1.1, scaleY: 1.1, duration: 800, yoyo: true, repeat: -1 });
          return node;
        }
      },
      {
        label: '03 · HACKING COMBAT',
        body: [
          'Engage enemies by clicking ENGAGE in hostile zones.',
          'Choose attack moves — each costs CPU cycles.',
          'CPU recovers 10/turn. Manage cooldowns to survive.',
        ],
        demo: (cx, cy, scene) => {
          const bar = scene.add.rectangle(cx - 40, cy + 40, 80, 12, 0xff4444).setOrigin(0, 0.5);
          const fill = scene.add.rectangle(cx - 40, cy + 40, 80, 12, 0x00ff41).setOrigin(0, 0.5);
          scene.add.text(cx, cy + 20, 'ENEMY_HP', { fontFamily: 'VT323', fontSize: '13px', color: '#aaa' }).setOrigin(0.5);
          scene.tweens.add({ targets: fill, scaleX: 0.2, duration: 2000, yoyo: true, repeat: -1 });
          return fill;
        }
      },
      {
        label: '04 · MISSIONS & HUD',
        body: [
          'Top-left HUD shows your active objective.',
          'Bottom log panel streams kernel events in real-time.',
          'Inventory sidebar tracks your current loadout.',
        ],
        demo: (cx, cy, scene) => {
          const hud = scene.add.rectangle(cx, cy + 30, 180, 60, 0x01061b).setStrokeStyle(1, 0x00e8ff, 0.4);
          scene.add.text(cx - 82, cy + 10, 'OBJ: Secure terminal\nINVENTORY: ROOT_KEY', {
            fontFamily: 'VT323', fontSize: '13px', color: '#00e8ff', lineSpacing: 2
          });
          return hud;
        }
      },
      {
        label: '05 · FACTIONS & PROGRESSION',
        body: [
          'Complete missions to earn XP, credits, and reputation.',
          'Faction rep unlocks special zones and companion bonds.',
          'XP bridges back to the main CyberWorld MMORPG shell.',
        ],
        demo: (cx, cy, scene) => {
          ['NOMAD','CORSAIR','SPECTER'].forEach((f, i) => {
            const col = [0x00e8ff, 0xff00ea, 0x00ff41][i];
            scene.add.rectangle(cx - 60 + i * 60, cy + 40, 48, 30, col, 0.15).setStrokeStyle(1, col, 0.7);
            scene.add.text(cx - 60 + i * 60, cy + 40, f.slice(0,3), { fontFamily: 'VT323', fontSize: '13px', color: `#${col.toString(16).padStart(6,'0')}` }).setOrigin(0.5);
          });
          return null;
        }
      }
    ];

    /* Step container */
    this._demoObjects = [];
    this._stepContainer = this.add.container(0, 0);

    const renderStep = (idx) => {
      /* Clear demo objects */
      this._demoObjects.forEach(o => { if (o && o.destroy) o.destroy(); });
      this._demoObjects = [];

      const step = STEPS[idx];

      /* Label */
      const lbl = this.add.text(W / 2, 130, step.label, {
        fontFamily: 'Pixelify Sans', fontSize: '22px', color: '#00e8ff'
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: lbl, alpha: 1, y: 140, duration: 400 });
      this._demoObjects.push(lbl);

      /* Body text */
      step.body.forEach((line, i) => {
        const t = this.add.text(W / 2, 180 + i * 28, line, {
          fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#aaa'
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, delay: 100 + i * 80, duration: 300 });
        this._demoObjects.push(t);
      });

      /* Demo visual */
      const demoObj = step.demo(W / 2, 320, this);
      if (demoObj) this._demoObjects.push(demoObj);
    };

    renderStep(0);

    /* ── Nav buttons ── */
    const prevBtn = this.add.text(80, H - 60, '◀ PREV', {
      fontFamily: 'VT323', fontSize: '26px', color: '#445'
    }).setInteractive({ cursor: 'pointer' });
    const nextBtn = this.add.text(W - 80, H - 60, 'NEXT ▶', {
      fontFamily: 'VT323', fontSize: '26px', color: '#00e8ff'
    }).setOrigin(1, 0).setInteractive({ cursor: 'pointer' });

    /* Step dots */
    const dots = STEPS.map((_, i) => {
      return this.add.circle(W / 2 - (STEPS.length - 1) * 16 + i * 32, H - 55, 6, 0x002040)
        .setStrokeStyle(1, 0x00e8ff, 0.6).setInteractive({ cursor: 'pointer' });
    });
    const refreshDots = () => dots.forEach((d, i) => d.setFillStyle(i === this._step ? this._color : 0x002040));
    refreshDots();
    dots.forEach((d, i) => d.on('pointerdown', () => { this._step = i; refreshDots(); renderStep(i); }));

    prevBtn.on('pointerdown', () => {
      if (this._step > 0) { this._step--; refreshDots(); renderStep(this._step); }
    });
    nextBtn.on('pointerdown', () => {
      if (this._step < STEPS.length - 1) {
        this._step++; refreshDots(); renderStep(this._step);
      } else {
        /* Launch into game */
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.time.delayedCall(800, () => this.scene.start('SceneOperationsDeck', {
          role: { id: this._faction, color: this._color, title: this._role },
          handle: this._handle
        }));
      }
    });

    /* Progress label */
    const progTxt = this.add.text(W / 2, H - 30, `STEP 1 / ${STEPS.length}`, {
      fontFamily: 'VT323', fontSize: '16px', color: '#334'
    }).setOrigin(0.5);
    this.events.on('step', () => progTxt.setText(`STEP ${this._step + 1} / ${STEPS.length}`));

    /* Background circuit shapes */
    const g = this.add.graphics().setAlpha(0.06);
    g.lineStyle(1, this._color, 1);
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(0, W), y = Phaser.Math.Between(0, H);
      g.strokeRect(x, y, Phaser.Math.Between(30, 120), Phaser.Math.Between(20, 80));
    }
  }
}
