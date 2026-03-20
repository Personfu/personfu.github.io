export class SceneCharacter extends Phaser.Scene {
    constructor() {
        super('SceneCharacter');
        this.selectedColor = 0x00e8ff;
        this.selectedRole = null;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x010c1c);
        
        // FURIOS-INT Identity Generator Frame
        const frame = this.add.rectangle(w / 2, h / 2, w - 100, h - 100, 0xc0c0c0).setStrokeStyle(4, 0xffffff, 1);
        const titleBar = this.add.rectangle(w / 2, 75, w - 106, 30, 0x000080);
        this.add.text(60, 75, 'OPERATIVE_IDENTITY_CONFIG_v4.5', { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0, 0.5);

        // Character Viewport
        this.previewContainer = this.add.container(w/2, 260);
        this.preview = this.add.circle(0, 0, 40, 0x00e8ff).setStrokeStyle(4, 0xffffff, 1);
        this.previewHead = this.add.circle(0, -65, 25, 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        this.previewContainer.add([this.preview, this.previewHead]);

        const roles = [
            { title: 'OSINT_ANALYST', color: 0x00ff88, info: 'Intelligence gathering & threat mapping.' },
            { title: 'INFILTRATOR', color: 0xff2cff, info: 'Network penetration & data extraction.' },
            { title: 'SOC_RESPONDER', color: 0x00e8ff, info: 'Threat defense & active monitoring.' }
        ];

        roles.forEach((role, i) => {
            const x = 240 + (i * 280);
            const btn = this.add.rectangle(x, 480, 240, 100, 0xffffff, 0.1).setStrokeStyle(2, role.color, 0.4).setInteractive({ cursor: 'pointer' });
            this.add.text(x, 450, role.title, { fontFamily: 'VT323', fontSize: '24px', color: role.color }).setOrigin(0.5);
            this.add.text(x, 490, role.info, { fontFamily: 'VT323', fontSize: '14px', color: '#aaa', align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.selectedRole = role;
                this.selectedColor = role.color;
                this.updatePreview();
                this.cameras.main.shake(100, 0.005);
            });
        });

        // Initialize Mission Button
        const playBtn = this.add.rectangle(w/2, h - 100, 320, 60, 0x000080).setStrokeStyle(2, 0xffffff, 1).setInteractive({ cursor: 'pointer' });
        this.add.text(w/2, h - 100, 'INITIALIZE_ONBOARDING', { fontFamily: 'VT323', fontSize: '28px', color: '#fff' }).setOrigin(0.5);

        playBtn.on('pointerdown', () => {
            this.registry.set('playerColor', this.selectedColor);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('SceneTutorial'));
        });

        this.add.text(w/2, h - 35, 'SYSTEM_IDENT: TOP_SECRET // KERNEL: FURIOS-INT_v4.5', { fontFamily: 'VT323', fontSize: '14px', color: '#555' }).setOrigin(0.5);
    }

    updatePreview() {
        this.preview.setFillStyle(this.selectedColor);
        this.previewHead.setFillStyle(this.selectedColor);
    }
}
