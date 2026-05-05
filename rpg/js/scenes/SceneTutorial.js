export class SceneTutorial extends Phaser.Scene {
    constructor() {
        super('SceneTutorial');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);
        
        // FURIOS-INT Onboarding Interface
        const frame = this.add.rectangle(w/2, h/2, w - 80, h - 80, 0x01061b).setStrokeStyle(3, 0x00e8ff, 0.4);
        this.add.text(w/2, 100, 'OPERATIVE_ONBOARDING_INITIALIZED', {
            fontFamily: 'VT323', fontSize: '36px', color: '#00ff88'
        }).setOrigin(0.5);

        const steps = [
            "1. USE_MOUSE: Point to relocate your operative.",
            "2. KEYBOARD_E: Interact with secure terminals and nodes.",
            "3. KEYBOARD_ARROWS: Manual micro-positioning controls.",
            "4. MISSION_OBJ: Follow the HUD at the top-left corner.",
            "5. STATUS_BAR: Monitor kernel logs at the bottom."
        ];

        steps.forEach((step, i) => {
            const txt = this.add.text(120, 180 + (i * 50), step, {
                fontFamily: 'VT323', fontSize: '24px', color: '#fff'
            });
            this.tweens.add({ targets: txt, alpha: { from: 0, to: 1 }, x: { from: 80, to: 120 }, delay: i * 300, duration: 800 });
        });

        // Prompt to continue
        const prompt = this.add.text(w/2, h - 120, '[ ENABLE_OPERATIONS_MODE ]', {
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff'
        }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

        this.tweens.add({ targets: prompt, scale: 1.1, duration: 800, yoyo: true, repeat: -1 });

        prompt.on('pointerdown', () => {
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.time.delayedCall(1000, () => this.scene.start('SceneOperationsDeck'));
        });

        // Background Cyber-Shapes
        this.add.circle(w - 150, h - 150, 60, 0x00e8ff, 0.05).setStrokeStyle(2, 0x00e8ff, 0.2);
        this.add.rectangle(150, h - 150, 100, 100, 0xff2cff, 0.05).setStrokeStyle(2, 0xff2cff, 0.2);
    }
}
