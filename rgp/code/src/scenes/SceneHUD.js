export class SceneHUD extends Phaser.Scene {
    constructor() {
        super('SceneHUD');
    }

    create() {
        const h = 768;
        const w = 1024;
        
        // FOOTER HUD BG
        this.add.rectangle(w/2, h - 80, w, 160, 0x011a27).setAlpha(0.9).setStrokeStyle(2, 0x00e8ff);

        // TOOLS BOX
        const toolList = ['NMAP', 'METASPLOIT', 'WIRESHARK', 'HYDRA', 'JACK_RPR'];
        toolList.forEach((t, i) => {
            const x = 100 + (i * 140);
            const btn = this.add.rectangle(x, h - 80, 120, 100, 0x011a27).setStrokeStyle(1, 0x00e8ff).setInteractive();
            this.add.text(x, h - 80, t, { fontSize: '14px', color: '#00e8ff', fontStyle: 'bold' }).setOrigin(0.5);
            
            btn.on('pointerover', () => btn.setFillStyle(0x00e8ff, 0.4));
            btn.on('pointerout', () => btn.setFillStyle(0x011a27, 0.9));
            btn.on('pointerdown', () => this.log(`[EXEC] Running ${t}... Success.`));
        });

        // CONSOLE (LOG)
        this.logText = this.add.text(780, h - 145, 'FURIOS-INT SOC CONSOLE\n--------------------', { 
            fontSize: '12px', color: '#00ff41', fontFamily: 'VT323' 
        });

        this.scene.get('SceneWorld').events.on('combat', (target) => {
            this.log(`[RECON] Scanning ${target}...`);
            this.log(`[SCAN] FOUND CVE-2026-X [CRITICAL]`);
            this.log(`[ATTACK] Meterpreter Session Opened.`);
        });
    }

    log(msg) {
        const lines = this.logText.text.split('\n');
        lines.push(msg);
        if (lines.length > 8) lines.shift();
        this.logText.setText(lines.join('\n'));
    }
}
