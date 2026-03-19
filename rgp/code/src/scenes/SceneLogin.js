export class SceneLogin extends Phaser.Scene {
    constructor() {
        super('SceneLogin');
    }

    create() {
        this.add.text(512, 100, 'FURIOS-INT // NEURAL_UPLINK', { 
            fontFamily: 'VT323', fontSize: '48px', color: '#00e8ff' 
        }).setOrigin(0.5);

        this.add.text(512, 160, 'REGISTER_OPERATIVE', { 
            fontFamily: 'VT323', fontSize: '24px', color: '#00ff41' 
        }).setOrigin(0.5);

        // LOGIN UI
        this.add.rectangle(512, 350, 400, 300, 0x011a27).setStrokeStyle(2, 0x00e8ff);
        
        const btnLogin = this.add.rectangle(512, 450, 200, 50, 0x00e8ff).setInteractive();
        this.add.text(512, 450, 'INITIALIZE_AUTH', { 
            fontSize: '20px', color: '#000', fontStyle: 'bold' 
        }).setOrigin(0.5);

        btnLogin.on('pointerdown', () => {
            this.scene.start('SceneCharacter');
        });

        // Background Pulse
        this.add.grid(512, 384, 1024, 768, 32, 32, 0x050a0f, 1, 0x0044ff, 0.1);
    }
}
