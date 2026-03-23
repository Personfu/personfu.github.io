export class SceneLogin extends Phaser.Scene {
    constructor() {
        super('SceneLogin');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);

        // CyberWorld Banner (Image 1 Style)
        this.add.text(w / 2, 80, 'CyberWorld', {
            fontFamily: 'Pixelify Sans', fontSize: '80px', color: '#00e8ff', fontStyle: 'italic', fontWeight: 'bold'
        }).setOrigin(0.5).setStroke('#fff', 4).setShadow(0, 0, '#00e8ff', 10, true, true);

        const subTitle = this.add.text(w / 2, 140, 'YOUR QUEST FOR SECURITY BEGINS!', {
            fontFamily: 'VT323', fontSize: '24px', color: '#00ff88'
        }).setOrigin(0.5);

        // Windows 98 Style Frame
        const win = this.add.rectangle(w/2, h/2 + 20, 500, 300, 0xc0c0c0).setStrokeStyle(3, 0xffffff, 1);
        const bar = this.add.rectangle(w/2, h/2 - 110, 496, 26, 0x000080);
        this.add.text(w/2 - 240, h/2 - 110, 'WELCOME_PROTOCOL_v0.9.EXE', { fontFamily: 'VT323', fontSize: '16px', color: '#fff' }).setOrigin(0, 0.5);

        // Decorative Robots (Concepts)
        const robotL = this.add.container(w/4 - 100, h/2 + 100);
        const rBody = this.add.rectangle(0, 0, 40, 60, 0xffffff).setStrokeStyle(4, 0x00e8ff, 1);
        const rHead = this.add.circle(0, -40, 20, 0xffffff).setStrokeStyle(4, 0x00e8ff, 1);
        const rEye = this.add.rectangle(0, -40, 24, 10, 0x00e8ff);
        robotL.add([rBody, rHead, rEye]);

        const agentR = this.add.container(w - w/4 + 100, h/2 + 100);
        const aBody = this.add.circle(0, 0, 30, 0x112136).setStrokeStyle(4, 0x00e8ff, 1);
        const aHead = this.add.circle(0, -45, 18, 0x112136).setStrokeStyle(4, 0x00e8ff, 1);
        agentR.add([aBody, aHead]);
        this.add.text(w - w/4 + 100, h/2 + 150, 'Agent_Zero', { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Play Button (Image 1 Style)
        const loginBtn = this.add.rectangle(w / 2, h / 2 + 30, 280, 80, 0x000080)
            .setStrokeStyle(4, 0xffffff, 1)
            .setInteractive({ cursor: 'pointer' });

        this.add.text(w / 2, h / 2 + 30, 'PLAY NOW', {
            fontFamily: 'VT323', fontSize: '52px', color: '#fff', fontWeight: 'bold'
        }).setOrigin(0.5);

        // Progress Bar
        const progBg = this.add.rectangle(w/2, h/2 + 100, 360, 24, 0x000, 0.5).setStrokeStyle(2, 0x00e8ff, 0.4);
        const progFill = this.add.rectangle(w/2 - 178, h/2 + 100, 2, 20, 0x00e8ff, 0.8).setOrigin(0, 0.5);

        loginBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: progFill,
                width: 356,
                duration: 800,
                onComplete: () => {
                    this.cameras.main.fadeOut(500, 0, 0, 0);
                    this.time.delayedCall(600, () => this.scene.start('SceneCharacter'));
                }
            });
        });

        this.add.text(w / 2, h - 30, 'UNAUTHORIZED ACCESS PROHIBITED // FURIOS-INT SECURITY', {
            fontFamily: 'VT323', fontSize: '18px', color: '#ff2cff', alpha: 0.6
        }).setOrigin(0.5);
    }
}
