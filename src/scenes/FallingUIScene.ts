import Phaser from "phaser";
import * as utils from "../utils";

/**
 * UI Scene for the falling sequence - shows countdown timer and health
 */
export class FallingUIScene extends Phaser.Scene {
  public fallingSceneKey: string | null = null;
  public uiContainer: Phaser.GameObjects.DOMElement | null = null;

  constructor() {
    super({ key: "FallingUIScene" });
  }

  init(data: { fallingSceneKey?: string }): void {
    this.fallingSceneKey = data.fallingSceneKey || null;
  }

  create(): void {
    this.createDOMUI();
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="falling-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro p-4">
        <!-- Top Center: Timer -->
        <div class="flex flex-col items-center">
          <div class="text-yellow-300 text-lg mb-1" style="text-shadow: 2px 2px 0px #000;">SURVIVE!</div>
          <div class="game-pixel-container-slot-gray-800 px-6 py-2">
            <span id="fall-timer" class="text-white text-3xl font-bold" style="text-shadow: 2px 2px 0px #000;">30</span>
          </div>
        </div>
        
        <!-- Bottom Left: Health Bar -->
        <div class="absolute bottom-4 left-4 flex items-center gap-3">
          <div class="text-red-500 text-2xl" style="text-shadow: 2px 2px 0px #000;">❤</div>
          <div class="game-pixel-container-slot-gray-800 p-1 relative" style="width: 180px;">
            <div id="fall-health-fill" class="game-pixel-container-progress-fill-green-500 h-5 transition-all duration-300" style="width: 100%;">
            </div>
          </div>
        </div>
        
        <!-- Center Warning Text -->
        <div id="fall-warning" class="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-red-500 text-xl opacity-0" style="text-shadow: 2px 2px 0px #000; animation: pulse 0.5s ease-in-out infinite;">
          DODGE!
        </div>
        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
            50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  update(): void {
    if (!this.fallingSceneKey) return;
    
    const fallingScene = this.scene.get(this.fallingSceneKey) as any;
    if (!fallingScene || !fallingScene.player) return;
    
    // Update timer
    const timerElement = document.getElementById("fall-timer");
    if (timerElement && fallingScene.getRemainingTime) {
      const remaining = Math.ceil(fallingScene.getRemainingTime());
      timerElement.textContent = remaining.toString();
      
      // Change color when low
      if (remaining <= 5) {
        timerElement.classList.remove("text-white");
        timerElement.classList.add("text-green-400");
      } else if (remaining <= 10) {
        timerElement.classList.remove("text-white");
        timerElement.classList.add("text-yellow-400");
      }
    }
    
    // Update health bar
    const healthFill = document.getElementById("fall-health-fill");
    if (healthFill && fallingScene.player) {
      const healthPercent = fallingScene.player.getHealthPercentage();
      healthFill.style.width = `${healthPercent}%`;
      
      // Change color based on health
      healthFill.classList.remove(
        "game-pixel-container-progress-fill-green-500",
        "game-pixel-container-progress-fill-yellow-500",
        "game-pixel-container-progress-fill-red-500"
      );
      
      if (healthPercent > 60) {
        healthFill.classList.add("game-pixel-container-progress-fill-green-500");
      } else if (healthPercent > 30) {
        healthFill.classList.add("game-pixel-container-progress-fill-yellow-500");
      } else {
        healthFill.classList.add("game-pixel-container-progress-fill-red-500");
      }
    }
  }
}
