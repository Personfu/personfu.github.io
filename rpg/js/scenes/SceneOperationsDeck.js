export class SceneOperationsDeck extends Phaser.Scene {
    constructor() {
        super('SceneOperationsDeck');
        this.logs = [];
        this.objective = 'Approach the SOC Access Node and press E.';
        this.role = null;
    }

    init(data) {
        this.role = data.role || { id: 'default', color: 0x00e8ff, title: 'OPERATIVE' };
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#050a14');
        this.drawDeck(w, h);

        // Grid (2:1 Isometric feel)
        this.gridSize = 48;
        this.drawIsometricGrid(w, h);

        // Player (Container for more detail)
        this.operator = this.add.container(460, 310);
        const body = this.add.circle(0, 0, 14, this.role.color || 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        const head = this.add.circle(0, -22, 10, this.role.color || 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        this.operator.add([body, head]);
        
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        // Assets (Concept Image 2 Style)
        this.assets = [
            { id: 'soc-terminal', title: 'SOC_TERMINAL_v4', type: 'terminal', complete: false, sprite: this.add.sprite(170, 160, 'terminalNode').setOrigin(0.5).setAlpha(0.8) },
            { id: 'osint-cache', title: 'INTEL_DATA_BARREL', type: 'cache', complete: false, sprite: this.add.sprite(w - 140, h - 220, 'intelCache').setOrigin(0.5).setAlpha(0.8) },
            { id: 'exit-hatch', title: 'MAIN_LOBBY_ENTRY_DOOR', type: 'exit', complete: false, sprite: this.add.rectangle(w - 80, 80, 70, 100, 0x00ff88, 0.4).setStrokeStyle(4, 0xffffff, 1).setDepth(10) }
        ];

        this.assets.forEach(a => {
            if(a.type !== 'exit') {
                this.tweens.add({ targets: a.sprite, alpha: 0.4, scaleX: 1.1, scaleY: 1.1, duration: 1500, yoyo: true, repeat: -1 });
            }
        });

        // Decorative Props (Shelf, Robot)
        this.add.rectangle(300, 100, 100, 20, 0x808080).setStrokeStyle(2, 0xffffff, 1);
        this.add.text(300, 100, 'EQUIPMENT_RACK', { fontFamily: 'VT323', fontSize: '12px', color: '#000' }).setOrigin(0.5);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.input.on('pointerdown', (pointer) => {
            this.target.set(pointer.x, pointer.y);
        });

        this.addHUD(w, h);
        
        // CRT Scanline Overlay
        const overlay = this.add.graphics();
        overlay.lineStyle(1, 0x000000, 0.1);
        for (let y = 0; y < h; y += 4) overlay.beginPath().moveTo(0, y).lineTo(w, y).strokePath();
        overlay.setDepth(100).setScrollFactor(0);

        this.pushLog('BOOT', `Session synchronized with Operative Identity: ${this.role.title}`);
        this.pushLog('MISSION', 'Access the terminal to secure the sector.');
    }

    drawDeck(w, h) {
        const g = this.add.graphics();
        g.fillStyle(0x020a16, 1);
        g.fillRect(0, 0, w, h);
    }

    drawIsometricGrid(w, h) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x00e8ff, 0.1);
        for (let i = -w; i < w * 2; i += 48) {
            g.beginPath().moveTo(i, 0).lineTo(i - h/2, h).strokePath();
            g.beginPath().moveTo(i, 0).lineTo(i + h/2, h).strokePath();
        }
    }

    addHUD(w, h) {
        this.hud = {
            zone: this.add.text(25, 25, `OPERATIVE_ID: ${this.role.title}`, { fontFamily: 'VT323', fontSize: '24px', color: '#00e8ff', fontWeight: 'bold' }),
            task: this.add.text(25, 55, `MISSION_OBJ: ${this.objective}`, { fontFamily: 'VT323', fontSize: '18px', color: '#00ff88' })
        };

        const winFrame = this.add.rectangle(w / 2, h - 85, w - 40, 100, 0x01061b, 0.9).setStrokeStyle(3, 0x00e8ff, 0.6);
        this.logText = this.add.text(45, h - 120, '', { fontFamily: 'VT323', fontSize: '18px', color: '#66ffaa', lineSpacing: 4 });
        
        this.add.text(w - 200, h - 25, 'SYS_STATUS: [ NOMINAL ]', { fontFamily: 'VT323', fontSize: '18px', color: '#00ff88' });
    }

    pushLog(channel, message) {
        const stamp = new Date().toLocaleTimeString('en-GB');
        this.logs.push(`[${stamp}] <${channel}> ${message}`);
        if (this.logs.length > 3) this.logs.shift();
        this.logText.setText(this.logs.join('\n'));
    }

    nearestAsset() {
        let closest = null;
        this.assets.forEach(asset => {
            const assetPos = (asset.type === 'exit') ? asset.sprite.getCenter() : asset.sprite;
            const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, assetPos.x, assetPos.y);
            if (!closest || dist < closest.distance) closest = { asset, distance: dist };
        });
        return closest;
    }

    interact() {
        const nearest = this.nearestAsset();
        if (!nearest || nearest.distance > 80) return;

        if (nearest.asset.type === 'exit') {
            this.pushLog('EXIT', 'Transitioning to Global Social Hub (Lobby)...');
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.time.delayedCall(1000, () => this.scene.start('SceneLobby'));
            return;
        }

        if (nearest.asset.type === 'terminal' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0x00ff88);
            this.objective = 'Sector secured. Proceed to the lobby junction.';
            this.hud.task.setText(`MISSION_OBJ: ${this.objective}`);
            this.pushLog('SOC', 'Authenticated. Remote sector link established.');
            this.cameras.main.flash(400, 0, 255, 136);
            return;
        }

        if (nearest.asset.type === 'cache' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0xffffff);
            this.pushLog('INT', 'Intel packet extraction complete.');
            this.cameras.main.shake(300, 0.01);
            return;
        }
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 280;

        if (this.cursors.left.isDown) this.target.x -= speed * delta;
        if (this.cursors.right.isDown) this.target.x += speed * delta;
        if (this.cursors.up.isDown) this.target.y -= speed * delta;
        if (this.cursors.down.isDown) this.target.y += speed * delta;

        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (dist > 8) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        }

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.interact();

        const nearest = this.nearestAsset();
        if (nearest && nearest.distance < 80) {
            this.hud.task.setText(`[E] TO INTERACT WITH: ${nearest.asset.title}`);
        } else {
            this.hud.task.setText(`MISSION_OBJ: ${this.objective}`);
        }
    }
}
