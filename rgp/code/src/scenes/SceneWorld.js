export class SceneWorld extends Phaser.Scene {
    constructor() {
        super('SceneWorld');
    }

    create() {
        // WORLD GRID
        this.add.grid(512, 384, 2048, 1536, 64, 64, 0x011a27, 1, 0x0044ff, 0.1).setOrigin(0.5);

        // PLAYER (Operative)
        this.player = this.add.sprite(512, 384, 'player').setScale(2).setTint(0x00e8ff);
        this.playerName = this.add.text(512, 350, `OPERATIVE_${Math.floor(Math.random()*9999)}`, { 
            fontSize: '14px', color: '#00e8ff', fontStyle: 'bold' 
        }).setOrigin(0.5);

        // ENEMIES (Adversaries)
        const enemies = [
            { name: 'FANCY_BEAR', x: 200, y: 200, color: 0xff0000, type: 'APT' },
            { name: 'LAZARUS_SPIDER', x: 800, y: 200, color: 0xff00ff, type: 'RAT' },
            { name: 'CHOLLA_BOTNET', x: 512, y: 600, color: 0x00ff00, type: 'DDOS' }
        ];

        enemies.forEach(e => {
            const sprite = this.add.sprite(e.x, e.y, 'player').setScale(1.5).setTint(e.color).setInteractive();
            this.add.text(e.x, e.y - 40, e.name, { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
            
            sprite.on('pointerdown', () => {
                this.events.emit('combat', e.name);
                this.cameras.main.shake(100, 0.01);
            });
        });

        // MOVEMENT LOGIC
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > 600) return; // Ignore HUD area
            const snapX = Phaser.Math.Snap.To(pointer.worldX, 64);
            const snapY = Phaser.Math.Snap.To(pointer.worldY, 64);
            
            this.tweens.add({
                targets: [this.player, this.playerName],
                x: snapX,
                y: snapY,
                duration: 500,
                ease: 'Power2'
            });
        });

        // TUTORIAL MESSAGE
        this.add.text(512, 700, 'TUTORIAL: USE TOOLS ON THE HUD TO COUNTER ADVERSARIES. CLICK ENEMIES TO INIT_SCAN.', { 
            fontSize: '18px', color: '#00ff41', backgroundColor: '#000', padding: { x: 10, y: 5 } 
        }).setOrigin(0.5);

        this.scene.launch('SceneHUD');
    }
}
