import Phaser from 'phaser';
import * as utils from '../utils';

export class GameOverUIScene extends Phaser.Scene {
  private currentLevelKey: string | null;
  private isRestarting: boolean;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({
      key: "GameOverUIScene",
    });
    this.currentLevelKey = null;
    this.isRestarting = false;
    this.uiContainer = null;
  }

  init(data: { currentLevelKey?: string }) {
    // Receive data from level scene
    this.currentLevelKey = data.currentLevelKey || "Level1Scene";
    // Reset restart flag
    this.isRestarting = false;
  }

  create(): void {
    // Play game over sound
    this.sound.play("game_over_sound", { volume: 0.5 });
    // Create DOM UI
    this.createDOMUI();
    // Setup input controls
    this.setupInputs();

    // Show sync status
    setTimeout(() => {
      const syncEl = document.getElementById('sync-status');
      if (syncEl) syncEl.style.opacity = '1';
    }, 1000);
  }

  restartGameWithSound(): void {
    this.sound.play("ui_click", { volume: 0.5 });
    this.restartGame();
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="game-over-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-center items-center" style="background-color: rgba(51, 0, 0, 0.8);">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center justify-center gap-16 p-8 text-center pointer-events-auto">
          
          <!-- Game Over Title -->
          <div id="game-over-title" class="text-red-500 font-bold pointer-events-none" style="
            font-size: clamp(56px, 8rem, 80px);
            text-shadow: 4px 4px 0px #000000;
            animation: dangerBlink 0.5s ease-in-out infinite alternate;
          ">GAME OVER</div>

          <!-- Failure Text -->
          <div id="failure-text" class="text-white font-bold pointer-events-none" style="
            font-size: clamp(24px, 3rem, 36px);
            text-shadow: 2px 2px 0px #000000;
            line-height: 1.4;
          ">Better luck next time!</div>

          <!-- Press Enter Text -->
          <div id="press-enter-text" class="text-yellow-400 font-bold pointer-events-none animate-pulse" style="
            font-size: clamp(24px, 3rem, 36px);
            text-shadow: 3px 3px 0px #000000;
            animation: blink 0.8s ease-in-out infinite alternate;
          ">PRESS ENTER TO RESTART</div>

          <!-- Blockchain Sync Status -->
          <div id="sync-status" class="text-red-400 font-bold opacity-0 transition-opacity duration-500" style="
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 1px 1px 0px #000;
          ">Updating score on Somnia...</div>
        </div>

        <!-- Custom Animations -->
        <style>
          @keyframes dangerBlink {
            from { 
              opacity: 0.5; 
              filter: brightness(1);
            }
            to { 
              opacity: 1; 
              filter: brightness(1.2);
            }
          }
          
          @keyframes blink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
        </style>
      </div>
    `;

    // Add DOM element to scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupInputs(): void {
    // Clear previous event listeners
    this.input.off('pointerdown');

    // Create keyboard input
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Listen for mouse click events
    this.input.on('pointerdown', () => this.restartGameWithSound());

    // Listen for key events
    this.enterKey.on('down', () => this.restartGameWithSound());
    this.spaceKey.on('down', () => this.restartGameWithSound());
  }

  restartGame(): void {
    // Prevent multiple triggers
    if (this.isRestarting) return;
    this.isRestarting = true;

    console.log(`Restarting current level: ${this.currentLevelKey}`);

    // Stop current level's background music
    const currentScene = this.scene.get(this.currentLevelKey!) as any;
    if (currentScene && currentScene.backgroundMusic) {
      currentScene.backgroundMusic.stop();
    }

    // Clear event listeners
    this.input.off('pointerdown');
    if (this.enterKey) {
      this.enterKey.off('down');
    }
    if (this.spaceKey) {
      this.spaceKey.off('down');
    }

    // Stop all game-related scenes based on which level we're restarting
    this.scene.stop("UIScene");
    this.scene.stop("FallingUIScene");
    this.scene.stop("BossUIScene");
    this.scene.stop("FallingSequenceScene");
    this.scene.stop("BossArenaScene");
    this.scene.stop(this.currentLevelKey!);

    // For boss arena, we need to restart the entire boss sequence from the beginning
    // For regular levels, just restart the level
    if (this.currentLevelKey === "BossArenaScene" || this.currentLevelKey === "FallingSequenceScene") {
      // Restart from BossArenaScene directly (skip falling sequence on death)
      this.scene.start("BossArenaScene");
    } else {
      // Restart current level
      this.scene.start(this.currentLevelKey!);
    }
  }

  update(): void {
    // Game Over UI scene doesn't need special update logic
  }
}