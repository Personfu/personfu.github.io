export class SceneLobby extends Phaser.Scene {
    constructor() {
        super('SceneLobby');
        this.players = [];
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#050a14');
        this.drawCity(w, h);

        // Operator
        this.operator = this.add.sprite(w/2, h/2, 'operator').setOrigin(0.5);
        this.operator.setTint(this.registry.get('playerColor') || 0x00e8ff);
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        // Simulated Players (NPCs)
        for(let i=0; i<5; i++) {
            const npc = this.add.sprite(Phaser.Math.Between(100, w-100), Phaser.Math.Between(100, h-156), 'operator');
            npc.setTint(Phaser.Math.RND.pick([0xff2cff, 0x00ff88, 0xffff00]));
            npc.setAlpha(0.6);
            this.players.push(npc);
            
            this.add.text(npc.x, npc.y - 30, `Runner_${Phaser.Math.Between(1000, 9999)}`, {
                fontFamily: 'VT323', fontSize: '16px', color: '#fff'
            }).setOrigin(0.5);
        }

        // Interface points
        this.add.text(480, 100, '<< FURIOS-INT MAIN LOBBY >>', {
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff'
        }).setOrigin(0.5);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.input.on('pointerdown', (pointer) => {
            this.target.set(pointer.x, pointer.y);
        });

        this.addHUD(w, h);
        this.pushLog('SYS', 'Entered High-Fidelity Social Hub.');
    }

    drawCity(w, h) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x00e8ff, 0.05);
        for (let x = 0; x <= w; x += 40) g.beginPath().moveTo(x, 0).lineTo(x, h).strokePath();
        for (let y = 0; y <= h; y += 40) g.beginPath().moveTo(0, y).lineTo(w, y).strokePath();
        
        // Neon Buildings (Simple rects)
        g.fillStyle(0x0a1a2a, 1);
        g.fillRect(100, 100, 80, 200);
        g.setStrokeStyle(2, 0x00e8ff, 0.5);
        g.strokeRect(100, 100, 80, 200);
        
        g.fillRect(w-180, 50, 60, 150);
        g.setStrokeStyle(2, 0xff2cff, 0.5);
        g.strokeRect(w-180, 50, 60, 150);
    }

    addHUD(w, h) {
        this.logText = this.add.text(20, h - 80, '', { fontFamily: 'VT323', fontSize: '18px', color: '#66ffaa', lineSpacing: 2 });
    }

    pushLog(channel, message) {
        this.logText.setText(`[${channel}] ${message}`);
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 250;

        if (this.cursors.left.isDown) this.target.x -= speed * delta;
        if (this.cursors.right.isDown) this.target.x += speed * delta;
        if (this.cursors.up.isDown) this.target.y -= speed * delta;
        if (this.cursors.down.isDown) this.target.y += speed * delta;

        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (dist > 4) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        }

        // Random NPC micro-moves
        this.players.forEach(p => {
            if(Math.random() > 0.98) {
                p.x += Phaser.Math.Between(-10, 10);
                p.y += Phaser.Math.Between(-10, 10);
            }
        });
    }
}
