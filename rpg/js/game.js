import { SceneBoot } from './scenes/SceneBoot.js';
import { SceneLogin } from './scenes/SceneLogin.js';
import { SceneCharacter } from './scenes/SceneCharacter.js';
import { SceneOperationsDeck } from './scenes/SceneOperationsDeck.js';
import { SceneLobby } from './scenes/SceneLobby.js';

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#02050b',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [SceneBoot, SceneLogin, SceneCharacter, SceneOperationsDeck, SceneLobby]
};

const game = new Phaser.Game(config);
export default game;
