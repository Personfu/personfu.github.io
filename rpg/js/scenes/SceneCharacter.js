export class SceneCharacter extends Phaser.Scene {
    constructor() {
        super('SceneCharacter');
        this.selectedRole = null;
        this.selectedColor = 0x00e8ff;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

<<<<<<< HEAD
        this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);
        
        this.add.text(w / 2, 50, 'PERSONA_CONFIGURATION // V2.0', {
            fontFamily: 'VT323', fontSize: '42px', color: '#00e8ff'
        }).setOrigin(0.5);
=======
        this.add.mainBackground = this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);
        
        // Window Frame (Win98 Style)
        const frame = this.add.rectangle(w/2, h/2, w - 40, h - 40, 0xc0c0c0).setStrokeStyle(3, 0xffffff, 1);
        const titleBar = this.add.rectangle(w/2, 40, w - 44, 30, 0x000080);
        this.add.text(40, 40, 'AVATAR_EDITOR_v1.07 // CONFIGURATION_SHELL', { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0, 0.5);

        // Character Viewport (Left)
        const viewPort = this.add.rectangle(w/4 + 20, h/2 + 20, w/2 - 100, h - 140, 0x112136).setStrokeStyle(2, 0x00e8ff, 0.3);
        this.add.text(w/4 + 20, 80, 'PREVIEW: ONLINE', { fontFamily: 'VT323', fontSize: '20px', color: '#00ff88' }).setOrigin(0.5);

        // Preview Model
        this.preview = this.add.circle(w/4 + 20, h/2, 60, 0x00e8ff).setStrokeStyle(6, 0xffffff, 1);
        this.previewHead = this.add.circle(w/4 + 20, h/2 - 80, 25, 0x00e8ff).setStrokeStyle(4, 0xffffff, 1);

        // Customization Grid (Right)
        const gridX = w/2 + 80;
        const gridY = 120;
        this.add.text(gridX, 90, 'EQUIPMENT_MODULES', { fontFamily: 'VT323', fontSize: '24px', color: '#000' });

        const gear = [
            { id: 'helmet', icon: '🪖', color: 0x00e8ff },
            { id: 'arm', icon: '🦾', color: 0xff2cff },
            { id: 'core', icon: '🔋', color: 0x00ff88 },
            { id: 'boots', icon: '🥾', color: 0xffff00 },
            { id: 'link', icon: '🔌', color: 0xffffff },
            { id: 'scan', icon: '👁️', color: 0xff3355 }
        ];

        gear.forEach((item, i) => {
            const r = i % 3;
            const c = Math.floor(i / 3);
            const slotX = gridX + (r * 80);
            const slotY = gridY + (c * 80);
            
            const slot = this.add.rectangle(slotX, slotY, 70, 70, 0xffffff).setStrokeStyle(2, 0x808080, 1).setInteractive({ cursor: 'pointer' });
            this.add.text(slotX, slotY, item.icon, { fontSize: '32px' }).setOrigin(0.5);
            
            slot.on('pointerdown', () => {
                this.selectedColor = item.color;
                this.updatePreview();
                this.cameras.main.shake(100, 0.005);
            });
        });
>>>>>>> temp

        // Class Selection
        const roles = [
            { id: 'analyst', title: 'OSINT ANALYST', color: 0x00ff88 },
            { id: 'infiltrator', title: 'INFILTRATOR', color: 0xff2cff },
            { id: 'responder', title: 'SOC RESPONDER', color: 0x00e8ff }
        ];

        roles.forEach((role, i) => {
<<<<<<< HEAD
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
=======
            const btn = this.add.rectangle(gridX + 80, 360 + (i * 50), 240, 40, 0x000080).setInteractive({ cursor: 'pointer' });
            this.add.text(gridX + 80, 360 + (i * 50), `[ ${role.title} ]`, { fontFamily: 'VT323', fontSize: '20px', color: '#fff' }).setOrigin(0.5);
            
            btn.on('pointerdown', () => {
                this.selectedRole = role;
>>>>>>> temp
                this.updatePreview();
            });
        });

<<<<<<< HEAD
        // Preview
        this.preview = this.add.circle(w/2, 480, 50, 0x00e8ff).setStrokeStyle(4, 0xffffff, 1);
        this.previewText = this.add.text(w/2, 550, 'IDENTITY_READY', { fontFamily: 'VT323', fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        // Start Game
        const startBtn = this.add.rectangle(w / 2, h - 50, 300, 50, 0x00ff88, 0.2)
            .setStrokeStyle(2, 0x00ff88, 1).setInteractive({ cursor: 'pointer' });
        this.add.text(w / 2, h - 50, 'INITIALIZE_MMORPG_UPLINK', { fontFamily: 'VT323', fontSize: '28px', color: '#00ff88' }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
=======
        // Mission Alert Style "PLAY"
        const playBtn = this.add.rectangle(w - 180, h - 80, 240, 60, 0x00e8ff, 0.2).setStrokeStyle(4, 0x00e8ff, 1).setInteractive({ cursor: 'pointer' });
        this.add.text(w - 180, h - 80, 'INITIALIZE_MISSION', { fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff', fontWeight: 'bold' }).setOrigin(0.5);

        playBtn.on('pointerdown', () => {
>>>>>>> temp
            this.registry.set('playerColor', this.selectedColor);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('SceneOperationsDeck', { role: this.selectedRole || roles[0], color: this.selectedColor }));
        });
<<<<<<< HEAD
=======

        this.add.text(w/2, h - 15, 'MEMORY_STATUS: OPTIMAL // SECURITY_CLEARENCE: TOP_SECRET', { fontFamily: 'VT323', fontSize: '14px', color: '#000', alpha: 0.7 }).setOrigin(0.5);
>>>>>>> temp
    }

    updatePreview() {
        this.preview.setFillStyle(this.selectedColor);
<<<<<<< HEAD
        if(this.selectedRole) this.previewText.setText(`ROLE: ${this.selectedRole.title}`);
=======
        this.previewHead.setFillStyle(this.selectedColor);
>>>>>>> temp
    }
}
