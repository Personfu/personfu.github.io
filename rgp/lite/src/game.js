import { SceneBoot } from './scenes/SceneBoot.js';
import { SceneIceberg } from './scenes/SceneIceberg.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#fff',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [SceneBoot, SceneIceberg]
};

const game = new Phaser.Game(config);
export default game;
