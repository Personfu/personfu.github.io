export class SceneBoot extends Phaser.Scene {
    constructor() {
        super('SceneBoot');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#02050b');

        // CyberOS Loading Sequence
        const bootText = [
            "Initializing FURIOS-INT Kernel v2026.3...",
            "Loading SOC_SUBSYSTEM...",
            "Mounting /dev/galaxy_neon...",
            "Synchronizing OSINT archives...",
            "Finalizing CyberWorld Lite Operations...",
            "ACCESS_GRANTED: Welcome Operator"
        ];

        let currentLine = 0;
        const terminal = this.add.text(40, 40, '', {
            fontFamily: 'VT323',
            fontSize: '22px',
            color: '#00ff41',
            lineSpacing: 10
        });

        const timer = this.time.addEvent({
            delay: 200,
            callback: () => {
                terminal.text += `> ${bootText[currentLine]}\n`;
                currentLine++;
                if (currentLine === bootText.length) {
                    this.cameras.main.flash(500, 0, 232, 255);
                    this.time.delayedCall(800, () => this.scene.start('SceneLogin'));
                }
            },
            repeat: bootText.length - 1
        });

        // Texture generation
        const g = this.add.graphics();
        
        // Operator sprite
        g.clear();
        g.fillStyle(0x00e8ff, 1);
        g.fillCircle(14, 14, 12);
        g.lineStyle(2, 0xffffff, 0.85);
        g.strokeCircle(14, 14, 12);
        g.generateTexture('operator', 28, 28);

        // Terminal Node
        g.clear();
        g.fillStyle(0xff2cff, 1);
        g.fillRect(0, 0, 38, 38);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeRect(0, 0, 38, 38);
        g.generateTexture('terminalNode', 38, 38);

        // Intel Cache
        g.clear();
        g.fillStyle(0x00ff88, 1);
        g.fillRect(0, 0, 30, 30);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeRect(0, 0, 30, 30);
        g.generateTexture('intelCache', 30, 30);

        g.destroy();
    }
}
