export class SceneBoot extends Phaser.Scene {
    constructor() {
        super('SceneBoot');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#03060f');

        const title = this.add.text(w / 2, h / 2 - 60, 'CYBERWORLD LITE', {
            fontFamily: 'VT323',
            fontSize: '68px',
            color: '#00e8ff'
        }).setOrigin(0.5);

        const subtitle = this.add.text(w / 2, h / 2 + 5, 'FLLC SOC // MIDNIGHT NEON OPS STACK', {
            fontFamily: 'VT323',
            fontSize: '30px',
            color: '#6fe6ff'
        }).setOrigin(0.5);

        const status = this.add.text(w / 2, h / 2 + 48, 'Loading sector telemetry and command overlays...', {
            fontFamily: 'VT323',
            fontSize: '24px',
            color: '#5aff96'
        }).setOrigin(0.5);

        const g = this.add.graphics();

        g.clear();
        g.fillStyle(0x00e8ff, 1);
        g.fillCircle(14, 14, 12);
        g.lineStyle(2, 0xffffff, 0.85);
        g.strokeCircle(14, 14, 12);
        g.generateTexture('operator', 28, 28);

        g.clear();
        g.fillStyle(0xff3a66, 1);
        g.fillRect(0, 0, 38, 38);
        g.lineStyle(2, 0xffffff, 0.85);
        g.strokeRect(0, 0, 38, 38);
        g.generateTexture('terminalNode', 38, 38);

        g.clear();
        g.fillStyle(0xffcf5d, 1);
        g.fillRect(0, 0, 30, 30);
        g.lineStyle(2, 0xffffff, 0.85);
        g.strokeRect(0, 0, 30, 30);
        g.generateTexture('intelCache', 30, 30);

        g.destroy();

        this.tweens.add({
            targets: [title, subtitle, status],
            alpha: { from: 0.55, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: 1
        });

        this.time.delayedCall(1600, () => this.scene.start('SceneOperationsDeck'));
    }
}
