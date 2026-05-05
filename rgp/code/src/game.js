import { SceneBoot } from './scenes/SceneBoot.js';
import { SceneLogin } from './scenes/SceneLogin.js';
import { SceneCharacter } from './scenes/SceneCharacter.js';
import { SceneWorld } from './scenes/SceneWorld.js';
import { SceneHUD } from './scenes/SceneHUD.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#050a0f',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [SceneBoot, SceneLogin, SceneCharacter, SceneWorld, SceneHUD]
};

const game = new Phaser.Game(config);
export default game;
