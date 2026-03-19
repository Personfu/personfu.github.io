import { SceneBoot } from './scenes/SceneBoot.js';
import { SceneOperationsDeck } from './scenes/SceneOperationsDeck.js';

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#040914',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [SceneBoot, SceneOperationsDeck]
};

const game = new Phaser.Game(config);
export default game;
