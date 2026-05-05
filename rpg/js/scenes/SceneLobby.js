/**
 * SCENE_LOBBY: GLOBAL_SOC_JUNCTION
 * Version: 2.6.5 (ADVANCED_NPC_DIALOG_OVERHAUL)
 */

export class SceneLobby extends Phaser.Scene {
    constructor() {
        super('SceneLobby');
        this.npcs = [];
        this.dialogActive = false;
        this.inventory = ['ROOT_KEY', 'OSINT_PROBE', 'SOC_DECRYPTOR'];
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor('#040b1a');
        this.drawWorld(w, h);

        // Player (The Operative)
        this.operator = this.add.container(w/2, h/2);
        const body = this.add.circle(0, 0, 14, 0x00e8ff).setStrokeStyle(3, 0xffffff, 1);
        const head = this.add.circle(0, -22, 10, 0x00e8ff).setStrokeStyle(2, 0xffffff, 1);
        this.operator.add([body, head]);
        
        this.target = new Phaser.Math.Vector2(this.operator.x, this.operator.y);

        // NPCs with Advanced Dialog
        const botNames = ['SENTINEL_A1', 'DECRYPT_BOT_4', 'MISSION_CORE_7', 'GALAXY_WATCH'];
        botNames.forEach((name, i) => {
            const x = 200 + (i * 180);
            const y = 300 + (Math.sin(i) * 50);
            const bot = this.add.container(x, y);
            const bBody = this.add.rectangle(0, 0, 24, 30, 0x112233).setStrokeStyle(2, 0x00e8ff, 1);
            const bFace = this.add.rectangle(0, -6, 16, 8, 0x00ff88);
            bot.add([bBody, bFace]);
            bot.setAlpha(0.9).setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 60), Phaser.Geom.Rectangle.Contains);
            
            this.npcs.push({ container: bot, name, angle: Math.random() * 6.28 });
            this.add.text(x, y - 35, name, { fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff' }).setOrigin(0.5);

            bot.on('pointerdown', () => {
                this.target.set(bot.x, bot.y);
                this.pendingNPC = { bot, name };
            });
        });

        // Dialog UI
        this.dialogUI = this.add.container(w/2, h-120).setVisible(false).setDepth(200);
        this.dialogBox = this.add.rectangle(0, 0, w - 100, 100, 0x000, 0.9).setStrokeStyle(2, 0x00e8ff, 1);
        this.dialogText = this.add.text(-w/2 + 70, -30, '', { fontFamily: 'VT323', fontSize: '20px', color: '#00ff88', lineSpacing: 4 });
        this.dialogUI.add([this.dialogBox, this.dialogText]);

        // Inventory Sidebar
        const invPanel = this.add.rectangle(w - 100, h/2, 140, 300, 0x01061b, 0.8).setStrokeStyle(2, 0x808080, 0.4);
        this.add.text(w - 160, h/2 - 140, 'INVENTORY_HUD', { fontFamily: 'VT323', fontSize: '14px', color: '#00e8ff' });
        this.inventory.forEach((item, i) => {
            this.add.text(w - 160, h/2 - 110 + (i * 24), `[${item}]`, { fontFamily: 'VT323', fontSize: '16px', color: '#fff' });
        });

        // Click to move (Global Layer)
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.target.set(pointer.x, pointer.y);
                this.pendingNPC = null;
                this.dialogUI.setVisible(false);
            }
        });

        this.addHUD(w, h);
    }

    drawWorld(w, h) {
        const g = this.add.graphics();
        g.lineStyle(2, 0x00e8ff, 0.05);
        for (let i = -w; i < w * 2; i += 50) {
            g.beginPath().moveTo(i, 0).lineTo(i - h, h).strokePath();
            g.beginPath().moveTo(i, 0).lineTo(i + h, h).strokePath();
        }
    }

    addHUD(w, h) {
        this.logText = this.add.text(20, 20, '[ LOBBY_SYNC_ACTIVE ]', { fontFamily: 'VT323', fontSize: '18px', color: '#00ff88', alpha: 0.8 });
    }

    showDialog(bot) {
        const quotes = [
            "Initializing neural-link... The Data Bazaar is open.",
            "System Integrity Nominal. Have you secured Sector 4?",
            "Uplink established. Accessing FLLC Mainframe archives...",
            "Welcome Operative. Tactical overview available at the Deck."
        ];
        this.dialogUI.setVisible(true);
        this.dialogText.setText(`${bot.name}: ${quotes[Math.floor(Math.random() * quotes.length)]}`);
    }

    update(_, deltaMs) {
        const delta = deltaMs / 1000;
        const speed = 260;

        const dist = Phaser.Math.Distance.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
        if (dist > 8) {
            const angle = Phaser.Math.Angle.Between(this.operator.x, this.operator.y, this.target.x, this.target.y);
            this.operator.x += Math.cos(angle) * speed * delta;
            this.operator.y += Math.sin(angle) * speed * delta;
        } else if (this.pendingNPC) {
            this.showDialog(this.pendingNPC);
            this.pendingNPC = null;
        }

        this.npcs.forEach(npc => {
            npc.angle += 0.02;
            npc.container.y += Math.sin(npc.angle) * 0.2;
        });
    }
}
