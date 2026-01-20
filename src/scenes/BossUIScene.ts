import Phaser from "phaser";
import * as utils from "../utils";

/**
 * Boss UI Scene - Shows boss health bar and player health during boss fight
 */
export class BossUIScene extends Phaser.Scene {
  public bossSceneKey: string | null = null;
  public uiContainer: Phaser.GameObjects.DOMElement | null = null;

  constructor() {
    super({ key: "BossUIScene" });
  }

  public hideInitially: boolean = false;

  init(data: { bossSceneKey?: string; hideInitially?: boolean }): void {
    this.bossSceneKey = data.bossSceneKey || null;
    this.hideInitially = data.hideInitially || false;
  }

  create(): void {
    this.createDOMUI();
    
    // Hide boss health bar initially if requested
    if (this.hideInitially) {
      this.hideBossHealthBar();
    }
    
    // Listen for boss events
    if (this.bossSceneKey) {
      const bossScene = this.scene.get(this.bossSceneKey);
      
      bossScene.events.on("bossVulnerable", (isVulnerable: boolean) => {
        this.updateVulnerableIndicator(isVulnerable);
      });
      
      // Listen for showBossUI event to show the boss health bar
      bossScene.events.on("showBossUI", () => {
        this.showBossHealthBar();
      });
    }
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="boss-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro p-4 flex flex-col justify-between">
        <!-- Top: Boss Health Bar -->
        <div class="flex flex-col items-center">
          <!-- Boss Name -->
          <div class="text-purple-400 text-lg mb-2" style="text-shadow: 2px 2px 0px #000;">
            CORRUPTED CORE
          </div>
          
          <!-- Boss Health Bar Background -->
          <div class="game-pixel-container-slot-gray-900 p-1 relative" style="width: 500px;">
            <!-- Boss Health Fill -->
            <div id="boss-health-fill" class="game-pixel-container-progress-fill-purple-600 h-6 transition-all duration-300" style="width: 100%;">
            </div>
          </div>
          
          <!-- Vulnerable Indicator -->
          <div id="vulnerable-indicator" class="hidden mt-2 text-yellow-300 text-sm animate-pulse" style="text-shadow: 2px 2px 0px #000;">
            ⚡ VULNERABLE - ATTACK NOW! ⚡
          </div>
        </div>
        
        <!-- Bottom: Player Health, Jetpack & Tips -->
        <div class="flex justify-between items-end">
          <!-- Player Health & Jetpack -->
          <div class="flex flex-col gap-2">
            <!-- Health Bar -->
            <div class="flex items-center gap-3">
              <div class="text-red-500 text-2xl" style="text-shadow: 2px 2px 0px #000;">❤</div>
              <div class="game-pixel-container-slot-gray-800 p-1 relative" style="width: 180px;">
                <div id="player-health-fill" class="game-pixel-container-progress-fill-green-500 h-5 transition-all duration-300" style="width: 100%;">
                </div>
              </div>
            </div>
            
            <!-- Jetpack Fuel Bar -->
            <div id="jetpack-bar-container" class="hidden flex items-center gap-3">
              <div class="text-cyan-400 text-2xl" style="text-shadow: 2px 2px 0px #000;">🚀</div>
              <div class="game-pixel-container-slot-gray-800 p-1 relative" style="width: 180px;">
                <div id="jetpack-fuel-fill" class="game-pixel-container-progress-fill-cyan-500 h-4 transition-all duration-100" style="width: 100%;">
                </div>
              </div>
            </div>
          </div>
          
          <!-- Combat Tips -->
          <div class="text-gray-300 text-xs text-right" style="text-shadow: 1px 1px 0px #000;">
            <div class="text-yellow-300">⬇ DUCK to dodge HIGH lasers!</div>
            <div class="text-cyan-300">⬆ JUMP to dodge LOW lasers!</div>
            <div class="text-purple-300 mt-1">🚀 Hold UP to use jetpack!</div>
            <div class="text-pink-300">Attack when boss is VULNERABLE!</div>
          </div>
        </div>
        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
          .animate-pulse {
            animation: pulse 0.5s ease-in-out infinite;
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  update(): void {
    if (!this.bossSceneKey) return;
    
    const bossScene = this.scene.get(this.bossSceneKey) as any;
    if (!bossScene) return;
    
    // Update boss health bar
    if (bossScene.boss) {
      const bossHealthPercent = bossScene.boss.getHealthPercentage();
      const bossHealthFill = document.getElementById("boss-health-fill");
      
      if (bossHealthFill) {
        bossHealthFill.style.width = `${bossHealthPercent}%`;
        
        // Change color at low health
        bossHealthFill.classList.remove(
          "game-pixel-container-progress-fill-purple-600",
          "game-pixel-container-progress-fill-red-600"
        );
        
        if (bossHealthPercent <= 30) {
          bossHealthFill.classList.add("game-pixel-container-progress-fill-red-600");
        } else {
          bossHealthFill.classList.add("game-pixel-container-progress-fill-purple-600");
        }
      }
    }
    
    // Update player health bar
    if (bossScene.player) {
      const playerHealthPercent = bossScene.player.getHealthPercentage();
      const playerHealthFill = document.getElementById("player-health-fill");
      
      if (playerHealthFill) {
        playerHealthFill.style.width = `${playerHealthPercent}%`;
        
        // Change color based on health
        playerHealthFill.classList.remove(
          "game-pixel-container-progress-fill-green-500",
          "game-pixel-container-progress-fill-yellow-500",
          "game-pixel-container-progress-fill-red-500"
        );
        
        if (playerHealthPercent > 60) {
          playerHealthFill.classList.add("game-pixel-container-progress-fill-green-500");
        } else if (playerHealthPercent > 30) {
          playerHealthFill.classList.add("game-pixel-container-progress-fill-yellow-500");
        } else {
          playerHealthFill.classList.add("game-pixel-container-progress-fill-red-500");
        }
      }
      
      // Update jetpack fuel bar if player has jetpack
      if (bossScene.player.hasJetpack) {
        const jetpackContainer = document.getElementById("jetpack-bar-container");
        const jetpackFuelFill = document.getElementById("jetpack-fuel-fill");
        
        if (jetpackContainer) {
          jetpackContainer.classList.remove("hidden");
          jetpackContainer.classList.add("flex");
        }
        
        if (jetpackFuelFill) {
          const fuelPercent = bossScene.player.getJetpackFuelPercentage();
          jetpackFuelFill.style.width = `${fuelPercent}%`;
        }
      }
    }
  }

  updateVulnerableIndicator(isVulnerable: boolean): void {
    const indicator = document.getElementById("vulnerable-indicator");
    if (indicator) {
      if (isVulnerable) {
        indicator.classList.remove("hidden");
      } else {
        indicator.classList.add("hidden");
      }
    }
  }
  
  hideBossHealthBar(): void {
    const bossHealthContainer = document.querySelector('#boss-ui-container > div:first-child') as HTMLElement;
    if (bossHealthContainer) {
      bossHealthContainer.style.display = 'none';
    }
  }
  
  showBossHealthBar(): void {
    const bossHealthContainer = document.querySelector('#boss-ui-container > div:first-child') as HTMLElement;
    if (bossHealthContainer) {
      bossHealthContainer.style.display = 'flex';
      bossHealthContainer.style.opacity = '0';
      
      // Fade in the boss health bar
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.1;
        bossHealthContainer.style.opacity = String(opacity);
        if (opacity >= 1) {
          clearInterval(fadeIn);
        }
      }, 50);
    }
  }
}
