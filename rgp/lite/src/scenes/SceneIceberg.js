export class SceneIceberg extends Phaser.Scene {
    constructor() {
        super('SceneIceberg');
    }

    create() {
        // Snow/Iceberg background
        this.add.rectangle(400, 300, 800, 600, 0xe0faff);
        
        // Penguin Operative
        this.player = this.add.sprite(400, 300, 'penguin');
        this.player.setScale(2.5);

        // Click to move (Isometric style)
        this.input.on('pointerdown', (pointer) => {
            this.tweens.add({
                targets: this.player,
                x: pointer.x,
                y: pointer.y,
                duration: 600,
                ease: 'Linear'
            });
            
            // Wobble effect while walking (CP style)
            this.tweens.add({
                targets: this.player,
                angle: { from: -5, to: 5 },
                duration: 100,
                yoyo: true,
                repeat: 3
            });
        });

        // Cybersecurity Elements
        this.add.text(10, 530, 'SECURITY_PROTOCOL: PENGUIN_HACKER_OS', { fontFamily: 'VT323', fontSize: '14px', color: '#000' });
        this.add.text(10, 550, 'LOCATION: DATA_CENTER_ICEBERG', { fontFamily: 'VT323', fontSize: '14px', color: '#000' });

        // Add "Hackable" objects
        const node = this.add.sprite(100, 100, 'iceberg').setTint(0x00e8ff);
        this.add.text(100, 140, 'VULN_NODE', { fontSize: '12px', color: '#00e8ff' }).setOrigin(0.5);
    }
}
