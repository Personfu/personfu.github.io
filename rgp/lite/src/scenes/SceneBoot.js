export class SceneBoot extends Phaser.Scene {
    constructor() {
        super('SceneBoot');
    }

    preload() {
        // Penguin Assets (Simulated)
        this.load.image('penguin', 'https://win98icons.alexmeub.com/icons/png/address_book_users.png');
        this.load.image('iceberg', 'https://win98icons.alexmeub.com/icons/png/world-0.png');
    }

    create() {
        this.add.text(400, 300, 'WADDLE_BOOT(ICEBERG_SOC)...', { 
            fontFamily: 'VT323', 
            fontSize: '32px', 
            color: '#000' 
        }).setOrigin(0.5);

        this.add.text(400, 340, 'Compiling Cybersecurity Iceberg...', { 
            fontFamily: 'VT323', 
            fontSize: '18px', 
            color: '#555' 
        }).setOrigin(0.5);

        setTimeout(() => {
            this.scene.start('SceneIceberg');
        }, 1500);
    }
}
