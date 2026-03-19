export class SceneMinigame extends Phaser.Scene {
    constructor() {
        super('SceneMinigame');
        this.score = 0;
        this.obstacles = null;
        this.gameActive = false;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x050a14);
        
        // Arcade Frame 
        const frame = this.add.rectangle(w/2, h/2, 600, 480, 0x000, 1).setStrokeStyle(4, 0xffff00, 0.5);
        this.add.text(w/2, 60, 'GALAXY_ARCADE // VECTOR_RUN_v1.0', {
            fontFamily: 'VT323', fontSize: '32px', color: '#ffff00'
        }).setOrigin(0.5);

        // Player (Mini ship)
        this.ship = this.physics.add.sprite(w/2, h - 160, 'operator').setTint(0xffff00);
        this.ship.setCollideWorldBounds(true);

        this.obstacles = this.physics.add.group();
        this.physics.add.overlap(this.ship, this.obstacles, this.gameOver, null, this);

        this.scoreText = this.add.text(w/2 - 280, 100, 'SCORE: 0000', { fontFamily: 'VT323', fontSize: '24px', color: '#fff' });

        this.startBtn = this.add.rectangle(w/2, h/2, 200, 50, 0xffff00, 0.2).setStrokeStyle(2, 0xffff00, 0.8).setInteractive({ cursor: 'pointer' });
        this.startTxt = this.add.text(w/2, h/2, 'PRESS_TO_BOOT', { fontFamily: 'VT323', fontSize: '24px', color: '#ffff00' }).setOrigin(0.5);

        this.startBtn.on('pointerdown', () => this.startGame());

        this.cursors = this.input.keyboard.createCursorKeys();
        
        const exit = this.add.text(40, h-40, '[ EXIT_ARCADE ]', { fontFamily: 'VT323', fontSize: '24px', color: '#ff2cff' })
            .setInteractive({ cursor: 'pointer' });
        exit.on('pointerdown', () => this.scene.start('SceneLobby'));
    }

    startGame() {
        this.score = 0;
        this.scoreText.setText('SCORE: 0000');
        this.obstacles.clear(true, true);
        this.gameActive = true;
        this.startBtn.setVisible(false);
        this.startTxt.setVisible(false);

        this.spawnTimer = this.time.addEvent({
            delay: 1000,
            callback: () => this.spawnObstacle(),
            loop: true
        });
    }

    spawnObstacle() {
        if(!this.gameActive) return;
        const x = Phaser.Math.Between(this.scale.width/2 - 280, this.scale.width/2 + 280);
        const obs = this.obstacles.create(x, 100, 'intelCache').setTint(0xff3355);
        obs.setVelocityY(200 + (this.score / 10));
    }

    gameOver() {
        this.gameActive = false;
        this.spawnTimer.remove();
        this.startBtn.setVisible(true);
        this.startTxt.setText('RETRY').setVisible(true);
        this.cameras.main.shake(300, 0.01);
    }

    update() {
        if(!this.gameActive) return;

        if (this.cursors.left.isDown) this.ship.setX(this.ship.x - 5);
        if (this.cursors.right.isDown) this.ship.setX(this.ship.x + 5);

        this.score += 1;
        this.scoreText.setText(`SCORE: ${String(Math.floor(this.score / 10)).padStart(4, '0')}`);
    }
}
