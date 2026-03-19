export class SceneBoot extends Phaser.Scene {
    constructor() {
        super('SceneBoot');
    }

    preload() {
        this.load.image('player', 'https://win98icons.alexmeub.com/icons/png/address_book_users.png');
    }

    create() {
        this.add.text(512, 384, 'FURIOS_UPLINK(BOOT_vRAM)...', { 
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff' 
        }).setOrigin(0.5);

        setTimeout(() => {
            this.scene.start('SceneLogin');
        }, 1000);
    }
}
