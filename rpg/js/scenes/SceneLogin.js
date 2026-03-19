export class SceneLogin extends Phaser.Scene {
    constructor() {
        super('SceneLogin');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x050a0f);

        this.add.text(w / 2, h / 2 - 140, 'FURIOS-INT // SECURE_LOGIN', {
            fontFamily: 'VT323', fontSize: '56px', color: '#00e8ff'
        }).setOrigin(0.5);

        this.add.rectangle(w / 2, h / 2, 400, 220, 0x112136).setStrokeStyle(2, 0x00e8ff, 0.5);

        this.add.text(w / 2 - 180, h / 2 - 70, 'OPERATOR_ID:', { fontFamily: 'VT323', fontSize: '28px', color: '#fff' });
        this.add.text(w / 2 - 180, h / 2 - 10, 'ACCESS_CODE:', { fontFamily: 'VT323', fontSize: '28px', color: '#fff' });

        this.add.rectangle(w / 2 + 40, h / 2 - 58, 240, 34, 0x000, 0.8).setStrokeStyle(1, 0x00e8ff, 0.3);
        this.add.rectangle(w / 2 + 40, h / 2 + 2, 240, 34, 0x000, 0.8).setStrokeStyle(1, 0x00e8ff, 0.3);

        this.add.text(w / 2 - 70, h / 2 - 68, 'PRESTON_FLLC', { fontFamily: 'VT323', fontSize: '24px', color: '#00ff88' });
        this.add.text(w / 2 - 70, h / 2 - 8, '••••••••••••', { fontFamily: 'VT323', fontSize: '24px', color: '#00ff88' });

        const loginBtn = this.add.rectangle(w / 2, h / 2 + 65, 340, 50, 0x00e8ff, 0.2)
            .setStrokeStyle(2, 0x00e8ff, 1)
            .setInteractive({ cursor: 'pointer' });

        const btnText = this.add.text(w / 2, h / 2 + 65, 'INITIALIZE_SESSION', {
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff'
        }).setOrigin(0.5);

        loginBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(600, () => this.scene.start('SceneCharacter'));
        });

        this.add.text(w / 2, h - 30, 'UNAUTHORIZED ACCESS IS PROHIBITED // FURIOS-INT V2.5.3', {
            fontFamily: 'VT323', fontSize: '18px', color: '#ff2cff', alpha: 0.6
        }).setOrigin(0.5);
    }
}
