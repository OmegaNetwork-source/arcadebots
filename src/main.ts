import Phaser from "phaser";
import { screenSize, debugConfig, renderConfig } from "./gameConfig.json";
import "./styles/tailwind.css";
import { Preloader } from "./scenes/Preloader";
import { TitleScreen } from "./scenes/TitleScreen";
import { Level1Scene } from "./scenes/Level1Scene";
import { Level2Scene } from "./scenes/Level2Scene";
import { FallingSequenceScene } from "./scenes/FallingSequenceScene";
import { BossArenaScene } from "./scenes/BossArenaScene";
import { UIScene } from "./scenes/UIScene";
import { FallingUIScene } from "./scenes/FallingUIScene";
import { BossUIScene } from "./scenes/BossUIScene";
import { VictoryUIScene } from "./scenes/VictoryUIScene";
import { GameCompleteUIScene } from "./scenes/GameCompleteUIScene";
import { GameOverUIScene } from "./scenes/GameOverUIScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: screenSize.width.value,
  height: screenSize.height.value,
  backgroundColor: "#1a1a2e",
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      fps: 120,
      debug: debugConfig.debug.value,
      debugShowBody: debugConfig.debug.value,
      debugShowStaticBody: debugConfig.debug.value,
      debugShowVelocity: debugConfig.debug.value,
    },
  },
  pixelArt: renderConfig.pixelArt.value,
};

const game = new Phaser.Game(config);

// Strictly add scenes in the following order: Preloader, TitleScreen, level scenes, UI-related scenes

// Preloader: Load all game resources
game.scene.add("Preloader", Preloader, true);

// TitleScreen
game.scene.add("TitleScreen", TitleScreen);

// Character Selection
game.scene.add("CharacterSelectScene", CharacterSelectScene);

// Level scenes
game.scene.add("Level1Scene", Level1Scene);
game.scene.add("Level2Scene", Level2Scene);

// Boss sequence scenes (Level 1 ending)
game.scene.add("FallingSequenceScene", FallingSequenceScene);
game.scene.add("BossArenaScene", BossArenaScene);

// UI-related scenes
game.scene.add("UIScene", UIScene);
game.scene.add("FallingUIScene", FallingUIScene);
game.scene.add("BossUIScene", BossUIScene);
game.scene.add("VictoryUIScene", VictoryUIScene);
game.scene.add("GameCompleteUIScene", GameCompleteUIScene);
game.scene.add("GameOverUIScene", GameOverUIScene);
