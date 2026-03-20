import { SceneBoot } from './scenes/SceneBoot.js';
import { SceneLogin } from './scenes/SceneLogin.js';
import { SceneCharacter } from './scenes/SceneCharacter.js';
import { SceneTutorial } from './scenes/SceneTutorial.js';
import { SceneOperationsDeck } from './scenes/SceneOperationsDeck.js';
import { SceneLobby } from './scenes/SceneLobby.js';
import { SceneWorldMap } from './scenes/SceneWorldMap.js';
import { SceneMinigame } from './scenes/SceneMinigame.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [SceneBoot, SceneLogin, SceneCharacter, SceneTutorial, SceneOperationsDeck, SceneLobby, SceneWorldMap, SceneMinigame]
};

const game = new Phaser.Game(config);

export default game;
