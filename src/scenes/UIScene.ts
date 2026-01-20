import Phaser from "phaser";
import * as utils from "../utils";
import { scoreManager, type GameStats } from "../wallet/ScoreManager";

export class UIScene extends Phaser.Scene {
  public currentGameSceneKey: string | null;
  public uiContainer: Phaser.GameObjects.DOMElement | null;
  private unsubscribeScore?: () => void;

  constructor() {
    super({ key: "UIScene" });
    this.currentGameSceneKey = null;
    this.uiContainer = null;
  }

  init(data: { gameSceneKey?: string }): void {
    this.currentGameSceneKey = data.gameSceneKey || null;
  }

  create(): void {
    this.createDOMUI();
    this.setupScoreListener();
  }

  setupScoreListener(): void {
    this.unsubscribeScore = scoreManager.subscribe((score: number, stats: GameStats) => {
      this.updateScoreDisplay(score, stats);
    });
  }

  updateScoreDisplay(score: number, stats: GameStats): void {
    const scoreText = document.getElementById('score-value');
    const highScoreText = document.getElementById('high-score-value');

    if (scoreText) {
      // Show total cumulative score (stacks across sessions)
      scoreText.textContent = scoreManager.formatScore(stats.totalScore);
    }

    if (highScoreText) {
      // Show best single session high score
      highScoreText.textContent = scoreManager.formatScore(stats.highScore);
    }
  }

  // Show floating score popup (call this from game scenes when scoring)
  public showScorePopup(x: number, y: number, points: number): void {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      color: #ffd700;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      pointer-events: none;
      z-index: 2000;
      animation: scoreFloat 1s ease-out forwards;
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 1000);
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="game-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro p-4">
        <!-- Top Bar -->
        <div class="flex justify-between items-start">
          <!-- Left Side: Health Bar -->
          <div class="flex items-center gap-3">
            <!-- Health Icon -->
            <div class="text-red-500 text-2xl" style="text-shadow: 2px 2px 0px #000;">❤</div>
            
            <!-- Health Bar Background -->
            <div class="game-pixel-container-slot-gray-800 p-1 relative" style="width: 200px;">
              <!-- Health Fill -->
              <div id="health-fill" class="game-pixel-container-progress-fill-green-500 h-5 transition-all duration-300" style="width: 100%;">
              </div>
            </div>
            
            <!-- Health Text -->
            <div id="health-text" class="text-white text-lg" style="text-shadow: 2px 2px 0px #000;">100%</div>
          </div>
          
          <!-- Center: Score Display -->
          <div class="flex flex-col items-center">
            <div class="text-gray-400 text-xs" style="text-shadow: 1px 1px 0px #000;">TOTAL</div>
            <div class="flex items-center gap-2">
              <div class="text-yellow-400 text-xl" style="text-shadow: 2px 2px 0px #000;">⭐</div>
              <div id="score-value" class="text-white text-2xl font-bold" style="text-shadow: 2px 2px 0px #000; min-width: 100px; text-align: center;">0</div>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <div class="text-gray-400 text-xs" style="text-shadow: 1px 1px 0px #000;">BEST:</div>
              <div id="high-score-value" class="text-yellow-300 text-sm" style="text-shadow: 1px 1px 0px #000;">0</div>
            </div>
          </div>
          
          <!-- Right Side: Weapon Indicator -->
          <div id="weapon-container" class="flex items-center gap-2">
            <div class="text-cyan-400 text-sm" style="text-shadow: 2px 2px 0px #000;">WEAPON:</div>
            <div id="weapon-indicator" class="game-pixel-container-slot-gray-800 px-3 py-1">
              <span id="weapon-text" class="text-yellow-300 text-sm" style="text-shadow: 1px 1px 0px #000;">SWORD</span>
            </div>
          </div>
        </div>
        
        <!-- Controls hint at bottom -->
        <div class="absolute bottom-4 left-4 text-gray-400 text-xs" style="text-shadow: 1px 1px 0px #000;">
          <div>SPACE - Attack (Sword)</div>
          <div id="gun-hint" class="hidden">X - Shoot (Gun)</div>
        </div>
        
        <!-- Score popup animation style -->
        <style>
          @keyframes scoreFloat {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-50px) scale(1.2);
            }
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  update(): void {
    if (!this.currentGameSceneKey) return;

    const gameScene = this.scene.get(this.currentGameSceneKey) as any;
    if (!gameScene || !gameScene.player) return;

    const healthPercent = gameScene.player.getHealthPercentage();

    // Update health bar fill width
    const healthFill = document.getElementById("health-fill");
    if (healthFill) {
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

    // Update health text
    const healthText = document.getElementById("health-text");
    if (healthText) {
      healthText.textContent = `${Math.round(healthPercent)}%`;
    }

    // Update weapon indicator
    const weaponText = document.getElementById("weapon-text");
    const gunHint = document.getElementById("gun-hint");

    if (weaponText && gunHint) {
      if (gameScene.player.hasGun) {
        weaponText.textContent = "SWORD + GUN";
        weaponText.classList.remove("text-yellow-300");
        weaponText.classList.add("text-cyan-300");
        gunHint.classList.remove("hidden");
      } else {
        weaponText.textContent = "SWORD";
        weaponText.classList.remove("text-cyan-300");
        weaponText.classList.add("text-yellow-300");
        gunHint.classList.add("hidden");
      }
    }
  }

  shutdown(): void {
    if (this.unsubscribeScore) {
      this.unsubscribeScore();
    }
  }
}

export default UIScene;

