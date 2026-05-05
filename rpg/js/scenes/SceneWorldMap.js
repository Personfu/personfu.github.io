export class SceneWorldMap extends Phaser.Scene {
    constructor() {
        super('SceneWorldMap');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.add.rectangle(w / 2, h / 2, w, h, 0x01050a);

        // Cyber Grid 
        const g = this.add.graphics();
        g.lineStyle(2, 0x00e8ff, 0.1);
        for(let i=0; i<w; i+=40) g.strokeLineShape(new Phaser.Geom.Line(i,0,i,h));
        for(let i=0; i<h; i+=40) g.strokeLineShape(new Phaser.Geom.Line(0,i,w,i));

        this.add.text(w/2, 60, 'GLOBAL_SECTOR_MAP // FURIOS-INT_GEOLOCATION', {
            fontFamily: 'VT323', fontSize: '32px', color: '#00e8ff'
        }).setOrigin(0.5);

        const districts = [
            { name: 'FURIOS-INT BAZAAR', x: 200, y: 250, color: 0xff2cff, info: 'SOCIAL_HUB & MARKETPLACE' },
            { name: 'SECURE_NODE_101', x: 700, y: 180, color: 0x00ff88, info: 'OPERATIONS_DECK // TUTORIAL' },
            { name: 'GALAXY_ARCADE', x: 500, y: 450, color: 0xffff00, info: 'MINIGAME_CLUSTER // VECTOR_RUN' },
            { name: 'NEURAL_NETWORK_CORE', x: 800, y: 500, color: 0x00e8ff, info: 'ADMIN_ACCESS_REQUIRED' }
        ];

        districts.forEach(dist => {
            const btn = this.add.circle(dist.x, dist.y, 15, dist.color).setStrokeStyle(3, 0xffffff, 0.8).setInteractive({ cursor: 'pointer' });
            const txt = this.add.text(dist.x, dist.y + 30, dist.name, { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            
            this.add.text(dist.x, dist.y + 50, dist.info, { fontFamily: 'VT323', fontSize: '14px', color: '#888' }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                if(dist.name === 'FURIOS-INT BAZAAR') this.scene.start('SceneLobby');
                if(dist.name === 'SECURE_NODE_101') this.scene.start('SceneOperationsDeck');
                if(dist.name === 'GALAXY_ARCADE') this.scene.start('SceneMinigame');
            });

            this.tweens.add({ targets: btn, scale: 1.2, duration: 1000, yoyo: true, repeat: -1 });
        });

        // Exit button
        const exit = this.add.text(40, h-40, '[ RETURN_TO_DECK ]', { fontFamily: 'VT323', fontSize: '24px', color: '#ff2cff' })
            .setInteractive({ cursor: 'pointer' });
        exit.on('pointerdown', () => this.scene.start('SceneLobby'));
    }
}
