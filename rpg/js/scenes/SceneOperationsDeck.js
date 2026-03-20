/**
 * SCENE_OPERATIONS_DECK: FLLC ENTERPRISE HUB
 * Version: 2.6.5 (ADVANCED_POINT_AND_CLICK)
 */

export class SceneOperationsDeck extends Phaser.Scene {
    constructor() {
        super('SceneOperationsDeck');
        this.logs = [];
        this.objective = 'Approach the SOC Access Node and press E or Click.';
        this.role = null;
        this.inventory = ['ROOT_KEY', 'OSINT_PROBE'];
    }

    init(data) {
        this.role = data.role || { id: 'default', color: 0x00e8ff, title: 'OPERATIVE' };
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#050a14');

        // Draw Advanced Isometric Grid
        this.drawIsometricGrid(w, h);

        // Player (More detailed visual)
        this.operator = this.add.container(460, 310);
        const body = this.add.circle(0, 0, 14, this.role.color || 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        const head = this.add.circle(0, -22, 10, this.role.color || 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        const vis = this.add.rectangle(0, -24, 16, 4, 0x000, 1); // Visor
        this.operator.add([body, head, vis]);
        
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        // Mission Assets
        this.assets = [
            { id: 'soc-terminal', title: 'SOC_TERMINAL_v4', type: 'terminal', complete: false, sprite: this.add.sprite(170, 160, 'terminalNode').setOrigin(0.5).setAlpha(0.8).setInteractive({ cursor: 'pointer' }) },
            { id: 'osint-cache', title: 'INTEL_DATA_BARREL', type: 'cache', complete: false, sprite: this.add.sprite(w - 140, h - 220, 'intelCache').setOrigin(0.5).setAlpha(0.8).setInteractive({ cursor: 'pointer' }) },
            { id: 'exit-hatch', title: 'MAIN_LOBBY_ENTRY_DOOR', type: 'exit', complete: false, sprite: this.add.rectangle(w - 80, 80, 70, 100, 0x00ff88, 0.4).setStrokeStyle(4, 0xffffff, 1).setDepth(10).setInteractive({ cursor: 'pointer' }) }
        ];

        this.assets.forEach(a => {
            this.tweens.add({ targets: a.sprite, alpha: 0.4, scaleX: 1.1, scaleY: 1.1, duration: 1500, yoyo: true, repeat: -1 });
            a.sprite.on('pointerdown', (p) => {
                this.target.set(a.sprite.x || a.sprite.getCenter().x, a.sprite.y || a.sprite.getCenter().y);
                this.pendingInteract = a;
            });
        });

        // Click to move (Global Layer)
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.target.set(pointer.x, pointer.y);
                this.pendingInteract = null;
                this.spawnClickFX(pointer.x, pointer.y);
            }
        });

        this.addHUD(w, h);
        
        // CRT Scanline Overlay
        const overlay = this.add.graphics();
        overlay.lineStyle(1, 0x000000, 0.1);
        for (let y = 0; y < h; y += 4) overlay.beginPath().moveTo(0, y).lineTo(w, y).strokePath();
        overlay.setDepth(100).setScrollFactor(0);

        this.pushLog('BOOT', `Unified Operative Identity: ${this.role.title}`);
        this.pushLog('MISSION', 'Analyze nodes to secure the sector.');
    }

    drawIsometricGrid(w, h) {
        const g = this.add.graphics();
        g.lineStyle(2, 0x00e8ff, 0.05);
        for (let i = -w; i < w * 2; i += 48) {
            g.beginPath().moveTo(i, 0).lineTo(i - h/2, h).strokePath();
            g.beginPath().moveTo(i, 0).lineTo(i + h/2, h).strokePath();
        }
    }

    addHUD(w, h) {
        this.hud = {
            zone: this.add.text(25, 25, `OPERATIVE: ${this.role.title}`, { fontFamily: 'VT323', fontSize: '24px', color: '#00e8ff' }),
            task: this.add.text(25, 55, `MISSION_OBJ: ${this.objective}`, { fontFamily: 'VT323', fontSize: '18px', color: '#00ff88' })
        };

        // Inventory GUI
        this.add.rectangle(w - 120, h - 180, 200, 40, 0x000, 0.6).setStrokeStyle(1, 0x00e8ff, 0.3);
        this.add.text(w - 210, h - 210, 'EQUIPMENT_HUD', { fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff' });
        this.inventory.forEach((item, i) => {
            this.add.text(w - 210, h - 190 + (i * 20), `> ${item}`, { fontFamily: 'VT323', fontSize: '16px', color: '#fff' });
        });

        const winFrame = this.add.rectangle(w / 2, h - 65, w - 40, 100, 0x01061b, 0.9).setStrokeStyle(3, 0x00e8ff, 0.6);
        this.logText = this.add.text(45, h - 100, '', { fontFamily: 'VT323', fontSize: '18px', color: '#66ffaa', lineSpacing: 4 });
    }

    spawnClickFX(x, y) {
        const circle = this.add.circle(x, y, 4, 0x00e8ff, 0.8).setStrokeStyle(2, 0xffffff, 1);
        this.tweens.add({ targets: circle, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => circle.destroy() });
    }

    pushLog(channel, message) {
        const stamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        this.logs.push(`[${stamp}] <${channel}> ${message}`);
        if (this.logs.length > 3) this.logs.shift();
        this.logText.setText(this.logs.join('\n'));
    }

    interact(asset) {
        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, asset.sprite.x || asset.sprite.getCenter().x, asset.sprite.y || asset.sprite.getCenter().y);
        if (dist > 80) return;

        if (asset.type === 'exit') {
            this.pushLog('EXIT', 'Transitioning to Lobby junction...');
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.time.delayedCall(1000, () => this.scene.start('SceneLobby'));
            return;
        }

        if (asset.type === 'terminal' && !asset.complete) {
            asset.complete = true;
            asset.sprite.setTint(0x00ff88);
            this.objective = 'Sector secured. Proceed to the junction.';
            this.hud.task.setText(`MISSION_OBJ: ${this.objective}`);
            this.pushLog('SOC', 'Decryption link established. Gateway unlocked.');
            this.cameras.main.flash(400, 0, 255, 136);
            return;
        }
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 280;

        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (dist > 8) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        } else if (this.pendingInteract) {
            this.interact(this.pendingInteract);
            this.pendingInteract = null;
        }
    }
}
