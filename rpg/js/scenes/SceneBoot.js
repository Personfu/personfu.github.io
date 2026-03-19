export class SceneBoot extends Phaser.Scene {
    constructor() {
        super('SceneBoot');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#02050b');

<<<<<<< HEAD
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
=======
        // CyberWorld Logo Concept (Big text then kernel load)
        const logo = this.add.text(w/2, h/2 - 60, 'CYBERWORLD', {
            fontFamily: 'Pixelify Sans', fontSize: '92px', color: '#00e8ff', fontStyle: 'italic', fontWeight: 'bold'
        }).setOrigin(0.5).setStroke('#fff', 4).setShadow(0, 0, '#00e8ff', 15, true, true).setAlpha(0);

        this.tweens.add({ targets: logo, alpha: 1, duration: 1000, yoyo: true, hold: 1000 });

        // CyberOS Loading Sequence
        const bootText = [
            "FURIOS-INT Kernel v2026.3 >> LOAD_SECTOR_0x001",
            "MOD: [NET_INFIL] [SOC_DEF] [OSINT_SCAN]",
            "MOUNT: /mnt/cyberworld/galaxies/nebula_7",
            "SYNC: Establishing neural-link to Data Bazaar...",
            "STATUS: All nodes active. Memory check: 100% OK",
            "READY: Welcome to the Machine."
        ];

        let currentLine = 0;
        const terminal = this.add.text(40, h - 220, '', {
            fontFamily: 'VT323',
            fontSize: '18px',
            color: '#00ff41',
            lineSpacing: 8
        });

        const timer = this.time.addEvent({
            delay: 400,
>>>>>>> temp
            callback: () => {
                terminal.text += `> ${bootText[currentLine]}\n`;
                currentLine++;
                if (currentLine === bootText.length) {
<<<<<<< HEAD
                    this.cameras.main.flash(500, 0, 232, 255);
                    this.time.delayedCall(800, () => this.scene.start('SceneLogin'));
=======
                    this.cameras.main.flash(800, 0, 232, 255);
                    this.time.delayedCall(1200, () => this.scene.start('SceneLogin'));
>>>>>>> temp
                }
            },
            repeat: bootText.length - 1
        });

<<<<<<< HEAD
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
=======
        // Texture generation for the game world props
        const g = this.add.graphics();
        
        // Detailed Operator (Stick with iconic dots but add glow)
        g.clear();
        g.fillStyle(0x00e8ff, 1);
        g.fillCircle(14, 14, 12);
        g.lineStyle(3, 0xffffff, 1);
        g.strokeCircle(14, 14, 12);
        g.generateTexture('operator', 28, 28);

        // Terminal Node (A proper screen block)
        g.clear();
        g.fillStyle(0x112136, 1);
        g.fillRect(0, 10, 38, 28);
        g.fillStyle(0x00e8ff, 0.5);
        g.fillRect(4, 14, 30, 20);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeRect(0, 10, 38, 28);
        g.generateTexture('terminalNode', 38, 48);

        // Intel Cache (Box with green glow)
        g.clear();
        g.fillStyle(0x00ff88, 1);
        g.fillRect(5, 5, 28, 28);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeRect(5, 5, 28, 28);
        g.generateTexture('intelCache', 38, 38);
>>>>>>> temp

        g.destroy();
    }
}
