export class SceneCharacter extends Phaser.Scene {
    constructor() {
        super('SceneCharacter');
        this.selectedColor = 0x00e8ff;
        this.selectedRole = null;
        this.isGuest = true;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x010c1c);
        
        // FURIOS-INT Identity Generator Frame
        const frame = this.add.rectangle(w / 2, h / 2, w - 100, h - 100, 0xc0c0c0).setStrokeStyle(4, 0xffffff, 1);
        const titleBar = this.add.rectangle(w / 2, 75, w - 106, 30, 0x000080);
        this.add.text(60, 75, 'OPERATIVE_IDENTITY_CONFIG_v5.1 // MODE: ' + (this.isGuest ? 'GUEST' : 'AUTHENTICATED'), { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0, 0.5);

        // Character Viewport
        this.previewContainer = this.add.container(w/2, 260);
        this.preview = this.add.circle(0, 0, 45, 0x00e8ff).setStrokeStyle(4, 0xffffff, 1);
        this.previewHead = this.add.circle(0, -75, 28, 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        this.visor = this.add.rectangle(0, -78, 40, 10, 0x000000, 0.8).setStrokeStyle(1, 0xffffff, 0.4);
        this.previewContainer.add([this.preview, this.previewHead, this.visor]);

        // "GLOW" Effect
        this.tweens.add({
            targets: [this.preview, this.previewHead],
            alpha: 0.7,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        const roles = [
            { title: 'OSINT_ANALYST', color: 0x00ff88, info: 'Intelligence gathering & threat mapping. High agility.' },
            { title: 'INFILTRATOR', color: 0xff2cff, info: 'Network penetration & data extraction. Stealth bias.' },
            { title: 'SOC_RESPONDER', color: 0x00e8ff, info: 'Threat defense & active monitoring. High armor.' }
        ];

        roles.forEach((role, i) => {
            const x = 240 + (i * 280);
            const btn = this.add.rectangle(x, 480, 240, 100, 0xffffff, 0.1).setStrokeStyle(2, role.color, 0.4).setInteractive({ cursor: 'pointer' });
            this.add.text(x, 450, role.title, { fontFamily: 'VT323', fontSize: '24px', color: role.color }).setOrigin(0.5);
            this.add.text(x, 490, role.info, { fontFamily: 'VT323', fontSize: '14px', color: '#666', align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.selectedRole = role;
                this.selectedColor = role.color;
                this.updatePreview();
                this.cameras.main.shake(100, 0.005);
            });
        });

        // Initialize Mission Button
        const playBtn = this.add.rectangle(w/2, h - 100, 360, 60, 0x000080).setStrokeStyle(2, 0xffffff, 1).setInteractive({ cursor: 'pointer' });
        this.add.text(w/2, h - 100, 'DEPLOY_IDENTITY_TO_WORLD', { fontFamily: 'VT323', fontSize: '26px', color: '#fff' }).setOrigin(0.5);

        playBtn.on('pointerdown', () => {
            this.registry.set('playerColor', this.selectedColor);
            this.registry.set('playerRole', this.selectedRole?.title || 'GENERAL_OP');
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.time.delayedCall(1000, () => this.scene.start('SceneTutorial'));
        });

        this.add.text(w/2, h - 35, 'AUTH_SYNC: OK // CLOUD_LATTICE: CONNECTED', { fontFamily: 'VT323', fontSize: '14px', color: '#888' }).setOrigin(0.5);
    }

    updatePreview() {
        this.preview.setFillStyle(this.selectedColor);
        this.previewHead.setFillStyle(this.selectedColor);
    }
}
