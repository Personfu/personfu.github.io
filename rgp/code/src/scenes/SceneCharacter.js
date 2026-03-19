export class SceneCharacter extends Phaser.Scene {
    constructor() {
        super('SceneCharacter');
    }

    create() {
        this.add.text(512, 50, 'SELECT_CLASS', { 
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff' 
        }).setOrigin(0.5);

        const classes = [
            { name: 'RED_TEAM', icon: '⚔️', desc: 'Offensive Operations (Nmap, Metasploit, Hydra)' },
            { name: 'BLUE_TEAM', icon: '🛡️', desc: 'Defensive Hardening (Wireshark, CSET, CEST)' },
            { name: 'OSINT_AI', icon: '🔍', desc: 'Intelligence Scanning (CVE, FBI Dossiers)' }
        ];

        classes.forEach((c, i) => {
            const x = 512;
            const y = 200 + (i * 150);
            
            const btn = this.add.rectangle(x, y, 600, 120, 0x011a27).setStrokeStyle(2, 0x00e8ff).setInteractive();
            this.add.text(x - 280, y, `${c.icon} ${c.name}`, { 
                fontSize: '28px', color: '#00e8ff', fontStyle: 'bold' 
            }).setOrigin(0, 0.5);
            
            this.add.text(x - 280, y + 25, c.desc, { 
                fontSize: '14px', color: '#808080' 
            }).setOrigin(0, 0.5);

            btn.on('pointerdown', () => {
                this.registry.set('playerClass', c.name);
                this.scene.start('SceneWorld');
            });
        });
    }
}
