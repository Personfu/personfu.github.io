export class SceneLobby extends Phaser.Scene {
    constructor() {
        super('SceneLobby');
        this.npcs = [];
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#040b1a');
        this.drawWorld(w, h);

        // Player (The Operative)
        this.operator = this.add.container(w/2, h/2);
        const body = this.add.circle(0, 0, 14, this.registry.get('playerColor') || 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        const head = this.add.circle(0, -22, 10, this.registry.get('playerColor') || 0x00e8ff).setStrokeStyle(2, 0xffffff, 1);
        this.operator.add([body, head]);
        
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        // Simulated NPCs (Cyber Robots)
        for(let i=0; i<6; i++) {
            const x = Phaser.Math.Between(100, w-300);
            const y = Phaser.Math.Between(100, h-200);
            const bot = this.add.container(x, y);
            
            const bBody = this.add.rectangle(0, 0, 24, 24, 0xffffff).setStrokeStyle(2, 0x00e8ff, 1);
            const bFace = this.add.rectangle(0, -4, 16, 8, 0x00e8ff);
            bot.add([bBody, bFace]);
            
            this.npcs.push({ container: bot, angle: Math.random() * Math.PI * 2 });
            this.add.text(x, y - 30, `ROBOT_${Phaser.Math.Between(100,999)}`, { fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff' }).setOrigin(0.5);
        }

        // Interface: Chat (Bottom Right)
        const chatBox = this.add.rectangle(w - 200, h - 140, 360, 220, 0x000, 0.8).setStrokeStyle(2, 0x808080, 0.5);
        this.add.text(w - 370, h - 235, '[ CHAT_SESSION_GATEWAY ]', { fontFamily: 'VT323', fontSize: '16px', color: '#00ffff' });
        
        const chatMsgs = [
            { user: 'Agent_Zero', msg: 'Anyone know how to decrypt the firewall?' },
            { user: 'Hacker_X', msg: 'Try the CSET module in Sector 4.' },
            { user: 'Preston_FLLC', msg: 'System integrity: STABLE.' }
        ];

        chatMsgs.forEach((chat, i) => {
            const yOff = h - 200 + (i * 24);
            const u = this.add.text(w - 370, yOff, chat.user + ":", { fontFamily: 'VT323', fontSize: '16px', color: '#00e8ff', fontWeight: 'bold' });
            this.add.text(w - 370 + u.width + 5, yOff, chat.msg, { fontFamily: 'VT323', fontSize: '16px', color: '#fff' });
        });

        this.addHUD(w, h);
        
        // Data Bazaar Interface (Concept 2)
        this.bazaarUI = this.add.container(w/2, h/2).setVisible(false).setDepth(100);
        const bzFrame = this.add.rectangle(0, 0, 500, 400, 0x1a1a2a).setStrokeStyle(3, 0x00e8ff, 1);
        const bzBar = this.add.rectangle(0, -185, 496, 26, 0x000080);
        this.bazaarUI.add([bzFrame, bzBar, this.add.text(-240, -185, 'DATA_BAZAAR_v1.0 // BROWSE_INVENTORY', { fontFamily: 'VT323', fontSize: '16px', color: '#fff' }).setOrigin(0, 0.5)]);

        // Inventory Grid
        for(let r=0; r<3; r++) {
            for(let c=0; c<4; c++) {
                const x = -190 + (c * 120);
                const y = -100 + (r * 100);
                const slot = this.add.rectangle(x, y, 90, 80, 0x01061b).setStrokeStyle(2, 0x00e8ff, 0.3).setInteractive({ cursor: 'pointer' });
                this.bazaarUI.add(slot);
                const icons = ['🦾', '🔋', '🔌', '👁️', '🛰️', '💾', '🗝️', '🧬', '🛡️', '📡', '💻', '🔋'];
                this.bazaarUI.add(this.add.text(x, y, icons[r * 4 + c], { fontSize: '32px' }).setOrigin(0.5));
            }
        }

        const closeBtn = this.add.rectangle(180, 160, 100, 30, 0x000080).setInteractive({ cursor: 'pointer' });
        this.bazaarUI.add([closeBtn, this.add.text(180, 160, 'CLOSE', { fontFamily: 'VT323', fontSize: '16px', color: '#fff' }).setOrigin(0.5)]);
        closeBtn.on('pointerdown', () => this.bazaarUI.setVisible(false));

        // Interface: Action Buttons (Bottom Left)
        const actions = [
            { id: 'WORLD MAP', scene: 'SceneWorldMap' },
            { id: 'GALAXY ARCADE', scene: 'SceneMinigame' },
            { id: 'CREATE AGENT', scene: 'SceneCharacter' }
        ];

        actions.forEach((act, i) => {
            const x = 140 + (i * 160);
            const btn = this.add.rectangle(x, h - 40, 140, 36, 0x000080).setStrokeStyle(2, 0xffffff, 0.8).setInteractive({ cursor: 'pointer' });
            this.add.text(x, h - 40, act.id, { fontFamily: 'VT323', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            btn.on('pointerdown', () => this.scene.start(act.scene));
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.on('pointerdown', (pointer) => this.target.set(pointer.x, pointer.y));

        this.pushLog('SYS', 'Session localized in CYBERWORLD_GALAXY_LOBBY.');
    }

    drawWorld(w, h) {
        const g = this.add.graphics();
        g.lineStyle(1, 0x00e8ff, 0.1);
        for (let i = -w; i < w * 2; i += 50) {
            g.beginPath().moveTo(i, 0).lineTo(i - h, h).strokePath();
            g.beginPath().moveTo(i, 0).lineTo(i + h, h).strokePath();
        }
        
        this.bazaarZone = this.add.rectangle(160, 190, 150, 150, 0x0, 0);
        g.fillStyle(0x0a1a2a, 1);
        g.fillRect(100, 100, 120, 180);
        g.setStrokeStyle(2, 0x00e8ff, 1);
        g.strokeRect(100, 100, 120, 180);
        this.add.text(160, 140, 'FRRULIE\nBAZAAR', { fontFamily: 'VT323', fontSize: '24px', color: '#ff2cff', align: 'center' }).setOrigin(0.5);
    }

    addHUD(w, h) {
        this.logText = this.add.text(20, 20, '', { fontFamily: 'VT323', fontSize: '18px', color: '#00ff88', alpha: 0.8 });
    }

    pushLog(channel, message) {
        this.logText.setText(`[${channel}] ${message}`);
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 260;

        if (this.cursors.left.isDown) this.target.x -= speed * delta;
        if (this.cursors.right.isDown) this.target.x += speed * delta;
        if (this.cursors.up.isDown) this.target.y -= speed * delta;
        if (this.cursors.down.isDown) this.target.y += speed * delta;

        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (dist > 4) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        }

        this.npcs.forEach(npc => {
            npc.angle += 0.02;
            npc.container.x += Math.cos(npc.angle) * 0.5;
            npc.container.y += Math.sin(npc.angle) * 0.5;
        });

        const bzDist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.bazaarZone.x, this.bazaarZone.y);
        if(bzDist < 80) {
            if(!this.bazaarUI.visible) {
                this.bazaarUI.setVisible(true);
                this.pushLog('SYNC', 'Marketplace established.');
            }
        }
    }
}
