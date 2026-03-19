export class SceneOperationsDeck extends Phaser.Scene {
    constructor() {
        super('SceneOperationsDeck');
        this.logs = [];
        this.objective = 'Reach the terminal node and press E.';
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.gridSize = 48;
        this.cameras.main.setBackgroundColor('#040914');
        this.drawDeck(w, h);

        this.operator = this.add.sprite(460, 310, 'operator').setOrigin(0.5);
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        this.assets = [
            {
                id: 'soc-terminal',
                title: 'SOC Terminal',
                type: 'terminal',
                complete: false,
                sprite: this.add.sprite(170, 160, 'terminalNode').setOrigin(0.5)
            },
            {
                id: 'osint-cache',
                title: 'OSINT Cache',
                type: 'cache',
                complete: false,
                sprite: this.add.sprite(w - 140, h - 150, 'intelCache').setOrigin(0.5)
            }
        ];

        this.cursors = this.input.keyboard.createCursorKeys();
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.input.on('pointerdown', (pointer) => {
            this.target.set(
                Phaser.Math.Snap.To(pointer.x, this.gridSize),
                Phaser.Math.Snap.To(pointer.y, this.gridSize)
            );
            this.pushLog('MOVE', `Routing operator to ${Math.round(this.target.x)},${Math.round(this.target.y)}`);
        });

        this.hud = {
            fps: this.add.text(16, 14, 'FPS: 0', { fontFamily: 'VT323', fontSize: '28px', color: '#00e8ff' }),
            zone: this.add.text(16, 42, 'ZONE: FLLC LITE OPERATIONS DECK', { fontFamily: 'VT323', fontSize: '28px', color: '#00e8ff' }),
            objective: this.add.text(16, 70, `OBJECTIVE: ${this.objective}`, { fontFamily: 'VT323', fontSize: '28px', color: '#59ff95' })
        };

        this.banner = this.add.text(w - 16, 14, 'MODE: CYBERSECURITY SIM', {
            fontFamily: 'VT323',
            fontSize: '28px',
            color: '#ffd166'
        }).setOrigin(1, 0);

        this.logBg = this.add.rectangle(w / 2, h - 76, w - 14, 124, 0x01060b, 0.95)
            .setStrokeStyle(2, 0x00e8ff, 0.7);
        this.logText = this.add.text(16, h - 132, '', {
            fontFamily: 'VT323',
            fontSize: '24px',
            color: '#66ffaa',
            lineSpacing: 4
        });

        this.prompt = this.add.text(16, h - 24, 'ops@fllc:~$', {
            fontFamily: 'VT323',
            fontSize: '26px',
            color: '#52ff7c'
        });

        this.indicator = this.add.circle(this.target.x, this.target.y, 5, 0x00e8ff, 0.55)
            .setStrokeStyle(2, 0xffffff, 0.5)
            .setVisible(false);

        this.help = this.add.text(16, h - 156, 'Click to move. Arrow keys nudge. E interacts with nearby nodes.', {
            fontFamily: 'VT323',
            fontSize: '23px',
            color: '#b7efff'
        });

        this.pushLog('BOOT', 'Operations deck online.');
        this.pushLog('BOOT', 'SOC and OSINT channels synchronized.');
    }

    drawDeck(w, h) {
        const g = this.add.graphics();
        g.fillStyle(0x040914, 1);
        g.fillRect(0, 0, w, h);

        g.lineStyle(1, 0x143b86, 0.22);
        for (let x = 0; x <= w; x += this.gridSize) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, h);
            g.strokePath();
        }
        for (let y = 0; y <= h; y += this.gridSize) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(w, y);
            g.strokePath();
        }
    }

    pushLog(channel, message) {
        const stamp = new Date().toLocaleTimeString();
        this.logs.push(`>> [${channel}] ${stamp} ${message}`);
        if (this.logs.length > 4) {
            this.logs.shift();
        }
        this.logText.setText(this.logs.join('\n'));
    }

    nearestAsset() {
        let closest = null;
        for (const asset of this.assets) {
            const distance = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, asset.sprite.x, asset.sprite.y);
            if (!closest || distance < closest.distance) {
                closest = { asset, distance };
            }
        }
        return closest;
    }

    interact() {
        const nearest = this.nearestAsset();
        if (!nearest || nearest.distance > 72) {
            this.pushLog('ERROR', 'No valid node in range.');
            return;
        }

        if (nearest.asset.type === 'terminal' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0x00ff88);
            this.objective = 'Extract the amber OSINT cache.';
            this.hud.objective.setText(`OBJECTIVE: ${this.objective}`);
            this.pushLog('SOC', 'Terminal authenticated. Internal path unlocked.');
            return;
        }

        if (nearest.asset.type === 'cache' && !nearest.asset.complete) {
            nearest.asset.complete = true;
            nearest.asset.sprite.setTint(0x7effff);
            this.objective = 'Deck secured. Awaiting next sector load.';
            this.hud.objective.setText(`OBJECTIVE: ${this.objective}`);
            this.pushLog('OSINT', 'Cache extraction complete. Mission packet assembled.');
            this.pushLog('SUCCESS', 'Lite mission flow complete.');
            return;
        }

        this.pushLog('SYSTEM', `${nearest.asset.title} already complete.`);
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 250;

        if (this.cursors.left.isDown) this.target.x -= speed * delta;
        if (this.cursors.right.isDown) this.target.x += speed * delta;
        if (this.cursors.up.isDown) this.target.y -= speed * delta;
        if (this.cursors.down.isDown) this.target.y += speed * delta;

        this.target.x = Phaser.Math.Clamp(this.target.x, 22, this.scale.width - 22);
        this.target.y = Phaser.Math.Clamp(this.target.y, 22, this.scale.height - 150);

        const distance = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (distance > 2) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        }

        this.indicator.setPosition(this.target.x, this.target.y).setVisible(distance > 2);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.interact();
        }

        const nearest = this.nearestAsset();
        if (nearest && nearest.distance < 72) {
            this.help.setText(`IN RANGE: ${nearest.asset.title} | Press E to interact`);
            this.help.setColor('#ffd166');
        } else {
            this.help.setText('Click to move. Arrow keys nudge. E interacts with nearby nodes.');
            this.help.setColor('#b7efff');
        }

        this.hud.fps.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }
}
