export class SceneCharacter extends Phaser.Scene {
    constructor() {
        super('SceneCharacter');
        this.selectedRole = null;
        this.selectedColor = 0x00e8ff;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);
        
        this.add.text(w / 2, 50, 'PERSONA_CONFIGURATION // V2.0', {
            fontFamily: 'VT323', fontSize: '42px', color: '#00e8ff'
        }).setOrigin(0.5);

        // Class Selection
        const roles = [
            { id: 'analyst', title: 'OSINT ANALYST', color: 0x00ff88 },
            { id: 'infiltrator', title: 'INFILTRATOR', color: 0xff2cff },
            { id: 'responder', title: 'SOC RESPONDER', color: 0x00e8ff }
        ];

        roles.forEach((role, i) => {
            const x = w/2 - 240 + (i * 240);
            const btn = this.add.rectangle(x, 180, 200, 60, 0x112136).setStrokeStyle(2, role.color, 0.5).setInteractive({ cursor: 'pointer' });
            const txt = this.add.text(x, 180, role.title, { fontFamily: 'VT323', fontSize: '24px', color: role.color }).setOrigin(0.5);
            
            btn.on('pointerdown', () => {
                this.selectedRole = role;
                this.selectedColor = role.color;
                this.updatePreview();
                roles.forEach(r => r.rect.setStrokeStyle(2, r.color, 0.5));
                btn.setStrokeStyle(4, role.color, 1);
            });
            role.rect = btn;
        });

        // Color Customization
        this.add.text(w/2, 280, 'COLOR_SYNC_PROTOCOL', { fontFamily: 'VT323', fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        const colors = [0x00e8ff, 0x00ff88, 0xff2cff, 0xffff00, 0xffffff, 0xff3355];
        colors.forEach((c, i) => {
            const x = w/2 - 150 + (i * 60);
            const dot = this.add.circle(x, 330, 20, c).setInteractive({ cursor: 'pointer' }).setStrokeStyle(2, 0xffffff, 0.5);
            dot.on('pointerdown', () => {
                this.selectedColor = c;
                this.updatePreview();
            });
        });

        // Preview
        this.preview = this.add.circle(w/2, 480, 50, 0x00e8ff).setStrokeStyle(4, 0xffffff, 1);
        this.previewText = this.add.text(w/2, 550, 'IDENTITY_READY', { fontFamily: 'VT323', fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        // Start Game
        const startBtn = this.add.rectangle(w / 2, h - 50, 300, 50, 0x00ff88, 0.2)
            .setStrokeStyle(2, 0x00ff88, 1).setInteractive({ cursor: 'pointer' });
        this.add.text(w / 2, h - 50, 'INITIALIZE_MMORPG_UPLINK', { fontFamily: 'VT323', fontSize: '28px', color: '#00ff88' }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.registry.set('playerColor', this.selectedColor);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('SceneOperationsDeck', { role: this.selectedRole || roles[0], color: this.selectedColor }));
        });
    }

    updatePreview() {
        this.preview.setFillStyle(this.selectedColor);
        if(this.selectedRole) this.previewText.setText(`ROLE: ${this.selectedRole.title}`);
    }
}
