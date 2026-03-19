export class SceneOperationsDeck extends Phaser.Scene {
    constructor() {
        super('SceneOperationsDeck');
        this.logs = [];
<<<<<<< HEAD
        this.objective = 'Reach the terminal node and press E.';
=======
        this.objective = 'Approach the SOC Access Node and press E.';
>>>>>>> temp
        this.role = null;
    }

    init(data) {
        this.role = data.role || { id: 'default', color: 0x00e8ff, title: 'OPERATIVE' };
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

<<<<<<< HEAD
        this.gridSize = 48;
        this.cameras.main.setBackgroundColor('#040914');
        this.drawDeck(w, h);

        this.operator = this.add.sprite(460, 310, 'operator').setOrigin(0.5);
        this.operator.setTint(this.role.color);
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        this.assets = [
            { id: 'soc-terminal', title: 'SOC Access Node', type: 'terminal', complete: false, sprite: this.add.sprite(170, 160, 'terminalNode').setOrigin(0.5).setAlpha(0.8) },
            { id: 'osint-cache', title: 'OSINT Data Reservoir', type: 'cache', complete: false, sprite: this.add.sprite(w - 140, h - 180, 'intelCache').setOrigin(0.5).setAlpha(0.8) },
            { id: 'exit-door', title: 'LOBBY ACCESS DOOR', type: 'exit', complete: false, sprite: this.add.rectangle(w - 100, 100, 60, 80, 0x00ff88, 0.4).setStrokeStyle(3, 0xffffff, 0.8).setDepth(10) }
        ];

        this.assets.forEach(a => {
            this.tweens.add({ targets: a.sprite, alpha: 0.4, scaleX: 1.1, scaleY: 1.1, duration: 1200, yoyo: true, repeat: -1 });
        });

=======
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

>>>>>>> temp
        this.cursors = this.input.keyboard.createCursorKeys();
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.input.on('pointerdown', (pointer) => {
<<<<<<< HEAD
            this.target.set(Phaser.Math.Snap.To(pointer.x, this.gridSize), Phaser.Math.Snap.To(pointer.y, this.gridSize));
        });

        this.addHUD(w, h);
        this.indicator = this.add.circle(this.target.x, this.target.y, 6, 0x00e8ff, 0.4).setStrokeStyle(2, 0xffffff, 0.3).setVisible(false);

        this.pushLog('BOOT', `Session started as ${this.role.title}`);
    }

    addHUD(w, h) {
        this.hud = {
            fps: this.add.text(w - 110, h - 30, 'FPS: 0', { fontFamily: 'VT323', fontSize: '20px', color: '#00e8ff' }),
            zone: this.add.text(20, 20, `OPERATIVE: ${this.role.title}`, { fontFamily: 'VT323', fontSize: '24px', color: '#00e8ff' }),
            objective: this.add.text(20, 50, `TASK: ${this.objective}`, { fontFamily: 'VT323', fontSize: '24px', color: '#59ff95' })
        };
        this.add.rectangle(w / 2, h - 85, w - 40, 100, 0x01060b, 0.8).setStrokeStyle(2, 0x00e8ff, 0.3);
        this.logText = this.add.text(40, h - 120, '', { fontFamily: 'VT323', fontSize: '18px', color: '#66ffaa', lineSpacing: 2 });
=======
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
>>>>>>> temp
    }

    drawDeck(w, h) {
        const g = this.add.graphics();
<<<<<<< HEAD
        g.fillStyle(0x02050b, 1);
        g.fillRect(0, 0, w, h);
        g.lineStyle(1, 0x00e8ff, 0.1);
        for (let x = 0; x <= w; x += this.gridSize) g.beginPath().moveTo(x, 0).lineTo(x, h).strokePath();
        for (let y = 0; y <= h; y += this.gridSize) g.beginPath().moveTo(0, y).lineTo(w, y).strokePath();
=======
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
>>>>>>> temp
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
<<<<<<< HEAD
            const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, (asset.sprite.x || asset.sprite.getCenter().x), (asset.sprite.y || asset.sprite.getCenter().y));
=======
            const assetPos = (asset.type === 'exit') ? asset.sprite.getCenter() : asset.sprite;
            const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, assetPos.x, assetPos.y);
>>>>>>> temp
            if (!closest || dist < closest.distance) closest = { asset, distance: dist };
        });
        return closest;
    }

    interact() {
        const nearest = this.nearestAsset();
        if (!nearest || nearest.distance > 80) return;

        if (nearest.asset.type === 'exit') {
<<<<<<< HEAD
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('SceneLobby'));
=======
            this.pushLog('EXIT', 'Transitioning to Global Social Hub (Lobby)...');
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.time.delayedCall(1000, () => this.scene.start('SceneLobby'));
>>>>>>> temp
            return;
        }

        if (nearest.asset.type === 'terminal' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0x00ff88);
<<<<<<< HEAD
            this.pushLog('SOC', 'Interface authenticated. Sector decrypted.');
=======
            this.objective = 'Sector secured. Proceed to the lobby junction.';
            this.hud.task.setText(`MISSION_OBJ: ${this.objective}`);
            this.pushLog('SOC', 'Authenticated. Remote sector link established.');
>>>>>>> temp
            this.cameras.main.flash(400, 0, 255, 136);
            return;
        }

        if (nearest.asset.type === 'cache' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0xffffff);
<<<<<<< HEAD
            this.pushLog('SUCCESS', 'FLLC Sector secured.');
=======
            this.pushLog('INT', 'Intel packet extraction complete.');
>>>>>>> temp
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
<<<<<<< HEAD
        if (dist > 4) {
=======
        if (dist > 8) {
>>>>>>> temp
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        }

<<<<<<< HEAD
        this.indicator.setPosition(this.target.x, this.target.y).setVisible(dist > 4);
=======
>>>>>>> temp
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.interact();

        const nearest = this.nearestAsset();
        if (nearest && nearest.distance < 80) {
<<<<<<< HEAD
            this.hud.objective.setText(`NODE NEARBY: ${nearest.asset.title} [E]`);
        } else {
            this.hud.objective.setText(`TASK: ${this.objective}`);
        }
        this.hud.fps.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
=======
            this.hud.task.setText(`[E] TO INTERACT WITH: ${nearest.asset.title}`);
        } else {
            this.hud.task.setText(`MISSION_OBJ: ${this.objective}`);
        }
>>>>>>> temp
    }
}
