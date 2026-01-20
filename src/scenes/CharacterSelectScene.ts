import Phaser from 'phaser';
import { LevelManager } from '../LevelManager';
import { scoreManager } from '../wallet/ScoreManager';
import * as utils from '../utils';

// Character data interface
interface CharacterData {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  color: string;
}

// Available characters - 11 bots total
const CHARACTERS: CharacterData[] = [
  {
    id: 'arcade_bot',
    name: 'CLASSIC',
    description: 'The original Arcade Bot. Balanced stats and reliable performance.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/6d289273-ddb4-42a0-b069-3bbe09b4828a/animations/arcade_bot_idle_R/frame_1.png',
    color: '#00FFFF'
  },
  {
    id: 'fire_arcade_bot',
    name: 'FIRE',
    description: 'Burning with passion! This fiery bot brings the heat to battle.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/31388c66-d940-44ad-a53c-2ac41ef33872/animations/fire_arcade_bot_idle_R/frame_1.png',
    color: '#FF6B35'
  },
  {
    id: 'ice_arcade_bot',
    name: 'ICE',
    description: 'Cool and collected. Frost patterns make this bot stand out.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/24d07cfd-85f3-4c63-aa13-5c3d5943addf/animations/ice_arcade_bot_idle_R/frame_1.png',
    color: '#87CEEB'
  },
  {
    id: 'shadow_arcade_bot',
    name: 'SHADOW',
    description: 'Mysterious and stealthy. Harness the power of darkness.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/33a78699-2d61-4857-afae-14a561d74bad/animations/shadow_arcade_bot_idle_R/frame_1.png',
    color: '#9B59B6'
  },
  {
    id: 'lightning_arcade_bot',
    name: 'LIGHTNING',
    description: 'Fast as a bolt! Crackling energy powers this electrifying bot.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/97103d8f-d72f-47ba-af74-349fc4609d2b/animations/lightning_arcade_bot_idle_R/frame_1.png',
    color: '#FFD700'
  },
  {
    id: 'nature_arcade_bot',
    name: 'NATURE',
    description: 'One with the earth. Vines and leaves adorn this peaceful warrior.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/58db14c2-6147-4eae-8845-2ab20bfef92b/animations/nature_arcade_bot_idle_R/frame_1.png',
    color: '#32CD32'
  },
  {
    id: 'cosmic_arcade_bot',
    name: 'COSMIC',
    description: 'A celestial explorer from beyond the stars. Galaxy swirls within.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/33ee6eb9-4911-449f-9b19-85cc19cc7ba7/animations/cosmic_arcade_bot_idle_R/frame_1.png',
    color: '#DA70D6'
  },
  {
    id: 'goku_arcade_bot',
    name: 'GOKU',
    description: 'Over 9000! This Super Saiyan bot unleashes legendary power.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/f67e2be2-7fbf-4972-8159-c99b02efdb8a/animations/goku_arcade_bot_idle_R/frame_1.png',
    color: '#FFB800'
  },
  {
    id: 'grim_reaper_arcade_bot',
    name: 'REAPER',
    description: 'Death comes for all. This hooded bot wields a spectral scythe.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/8dafc803-7251-4135-8f88-3ca51de63a19/animations/grim_reaper_arcade_bot_idle_R/frame_1.png',
    color: '#8B0000'
  },
  {
    id: 'angel_arcade_bot',
    name: 'ANGEL',
    description: 'Divine grace descends. Wings and halo bring heavenly justice.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/a86235cc-2a3f-44cb-ba46-7ce3f56ceee7/animations/angel_arcade_bot_idle_R/frame_1.png',
    color: '#FFFACD'
  },
  {
    id: 'devil_arcade_bot',
    name: 'DEVIL',
    description: 'Mischief incarnate! Horns and tail mark this demonic trickster.',
    previewUrl: 'https://cdn-game-mcp.gambo.ai/a6522607-c925-4b14-9ceb-0b56b7eb2bdd/animations/devil_arcade_bot_idle_R/frame_1.png',
    color: '#DC143C'
  }
];

export class CharacterSelectScene extends Phaser.Scene {
  public uiContainer!: Phaser.GameObjects.DOMElement;
  public selectedIndex: number = 0;
  public keydownHandler?: (event: KeyboardEvent) => void;
  public backgroundMusic?: Phaser.Sound.BaseSound;
  public isStarting: boolean = false;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  init(): void {
    this.selectedIndex = 0;
    this.isStarting = false;
  }

  create(): void {
    this.createDOMUI();
    this.setupInputs();
    this.updateSelection();

    // Play background music if not already playing
    if (!this.sound.get('cave_exploration_theme')?.isPlaying) {
      this.backgroundMusic = this.sound.add('cave_exploration_theme', {
        volume: 0.4,
        loop: true
      });
      this.backgroundMusic.play();
    }

    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  createDOMUI(): void {
    const charactersHTML = CHARACTERS.map((char, index) => `
      <div id="char-${index}" class="character-card flex flex-col items-center cursor-pointer transition-all duration-200 p-2 rounded-lg" data-index="${index}">
        <div class="character-frame w-20 h-20 flex items-center justify-center rounded-lg mb-1 transition-all duration-200" style="background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);">
          <img src="${char.previewUrl}" id="char-img-${index}" class="max-w-full max-h-full object-contain" style="filter: drop-shadow(0 0 8px ${char.color});" />
        </div>
        <div class="text-sm font-bold" style="color: ${char.color}; text-shadow: 2px 2px 0 #000;">${char.name}</div>
      </div>
    `).join('');

    const uiHTML = `
      <div id="character-select-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-supercell flex flex-col items-center justify-between" style="image-rendering: auto; background-image: url('https://cdn-game-mcp.gambo.ai/85b616cb-0f03-4cd0-9068-67934773169d/images/hollow_cave_background.png'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <!-- Dark overlay -->
        <div class="absolute inset-0 bg-black bg-opacity-50"></div>
        
        <!-- Content -->
        <div class="relative flex flex-col items-center w-full h-full pointer-events-auto py-4">
          
          <!-- Title -->
          <div class="text-2xl font-bold text-cyan-400 mb-2" style="text-shadow: 3px 3px 0 #000, 0 0 20px rgba(0,255,255,0.5);">
            SELECT YOUR BOT
          </div>
          
          <!-- Character Grid - Three rows layout -->
          <div id="character-grid" class="flex flex-col gap-1 justify-center items-center mb-2 overflow-visible">
            <!-- First row - 4 bots -->
            <div class="flex flex-row gap-1 justify-center items-center">
              ${CHARACTERS.slice(0, 4).map((char, index) => `
                <div id="char-${index}" class="character-card flex flex-col items-center cursor-pointer transition-all duration-200 p-1 rounded-lg" data-index="${index}">
                  <div class="character-frame w-14 h-14 flex items-center justify-center rounded-lg mb-1 transition-all duration-200" style="background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);">
                    <img src="${char.previewUrl}" id="char-img-${index}" class="max-w-full max-h-full object-contain" style="filter: drop-shadow(0 0 8px ${char.color});" />
                  </div>
                  <div class="text-xs font-bold" style="color: ${char.color}; text-shadow: 2px 2px 0 #000;">${char.name}</div>
                </div>
              `).join('')}
            </div>
            <!-- Second row - 4 bots -->
            <div class="flex flex-row gap-1 justify-center items-center">
              ${CHARACTERS.slice(4, 8).map((char, index) => `
                <div id="char-${index + 4}" class="character-card flex flex-col items-center cursor-pointer transition-all duration-200 p-1 rounded-lg" data-index="${index + 4}">
                  <div class="character-frame w-14 h-14 flex items-center justify-center rounded-lg mb-1 transition-all duration-200" style="background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);">
                    <img src="${char.previewUrl}" id="char-img-${index + 4}" class="max-w-full max-h-full object-contain" style="filter: drop-shadow(0 0 8px ${char.color});" />
                  </div>
                  <div class="text-xs font-bold" style="color: ${char.color}; text-shadow: 2px 2px 0 #000;">${char.name}</div>
                </div>
              `).join('')}
            </div>
            <!-- Third row - 3 bots (Reaper, Angel, Devil) -->
            <div class="flex flex-row gap-1 justify-center items-center">
              ${CHARACTERS.slice(8).map((char, index) => `
                <div id="char-${index + 8}" class="character-card flex flex-col items-center cursor-pointer transition-all duration-200 p-1 rounded-lg" data-index="${index + 8}">
                  <div class="character-frame w-14 h-14 flex items-center justify-center rounded-lg mb-1 transition-all duration-200" style="background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);">
                    <img src="${char.previewUrl}" id="char-img-${index + 8}" class="max-w-full max-h-full object-contain" style="filter: drop-shadow(0 0 8px ${char.color});" />
                  </div>
                  <div class="text-xs font-bold" style="color: ${char.color}; text-shadow: 2px 2px 0 #000;">${char.name}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Character Description -->
          <div id="char-description" class="game-3d-container-slot-gray-800 p-3 mx-8 text-center max-w-lg" style="min-height: 60px;">
            <p id="description-text" class="text-gray-200 text-sm" style="text-shadow: 1px 1px 2px #000;">
              ${CHARACTERS[0].description}
            </p>
          </div>
          
          <!-- Spacer -->
          <div class="flex-grow"></div>
          
          <!-- Controls Hint -->
          <div class="flex flex-col items-center gap-1 mb-3">
            <div class="text-cyan-400 text-lg font-bold" style="text-shadow: 2px 2px 0 #000; animation: titleBlink 1s ease-in-out infinite alternate;">
              PRESS ENTER TO START
            </div>
            <div class="text-gray-400 text-xs" style="text-shadow: 1px 1px 0 #000;">
              ← → ↑ ↓ or Click to Select
            </div>
          </div>
          
        </div>
        
        <!-- Styles -->
        <style>
          @keyframes titleBlink {
            from { opacity: 0.4; }
            to { opacity: 1; }
          }
          .character-card.selected .character-frame {
            border-color: #00FFFF !important;
            box-shadow: 0 0 20px rgba(0,255,255,0.5), inset 0 0 20px rgba(0,255,255,0.1);
            transform: scale(1.1);
          }
          .character-card:hover .character-frame {
            border-color: rgba(255,255,255,0.5) !important;
          }
          .character-card.selected:hover .character-frame {
            border-color: #00FFFF !important;
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);

    // Add click handlers to character cards after a short delay
    this.time.delayedCall(50, () => {
      CHARACTERS.forEach((_, index) => {
        const card = document.getElementById(`char-${index}`);
        if (card) {
          card.addEventListener('click', () => {
            this.sound.play('ui_click', { volume: 0.5 });
            this.selectedIndex = index;
            this.updateSelection();
          });
        }
      });
    });
  }

  updateSelection(): void {
    // Update visual selection
    CHARACTERS.forEach((_, index) => {
      const card = document.getElementById(`char-${index}`);
      if (card) {
        if (index === this.selectedIndex) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });

    // Update description
    const descText = document.getElementById('description-text');
    if (descText) {
      descText.textContent = CHARACTERS[this.selectedIndex].description;
    }
  }

  setupInputs(): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (this.isStarting) return;

      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          this.sound.play('ui_click', { volume: 0.3 });
          this.selectedIndex = (this.selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
          this.updateSelection();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.sound.play('ui_click', { volume: 0.3 });
          this.selectedIndex = (this.selectedIndex + 1) % CHARACTERS.length;
          this.updateSelection();
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.sound.play('ui_click', { volume: 0.3 });
          // Move up a row (4 items per row, 3 rows: 0-3, 4-7, 8-10)
          if (this.selectedIndex >= 8) {
            // Third row to second row
            this.selectedIndex = Math.min(this.selectedIndex - 4, 7);
          } else if (this.selectedIndex >= 4) {
            // Second row to first row
            this.selectedIndex = this.selectedIndex - 4;
          }
          this.updateSelection();
          break;
        case 'ArrowDown':
          event.preventDefault();
          this.sound.play('ui_click', { volume: 0.3 });
          // Move down a row (4 items per row, 3 rows: 0-3, 4-7, 8-10)
          if (this.selectedIndex < 4) {
            // First row to second row
            this.selectedIndex = this.selectedIndex + 4;
          } else if (this.selectedIndex < 8) {
            // Second row to third row
            this.selectedIndex = Math.min(this.selectedIndex + 4, CHARACTERS.length - 1);
          }
          this.updateSelection();
          break;
        case 'Enter':
        case 'Space':
          event.preventDefault();
          this.startGame();
          break;
        case 'Escape':
          event.preventDefault();
          this.goBack();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.keydownHandler = handleKeyDown;
  }

  startGame(): void {
    if (this.isStarting) return;
    this.isStarting = true;

    // Play click sound
    this.sound.play('ui_click', { volume: 0.5 });

    // Store selected character in registry for access by game scenes
    this.registry.set('selectedCharacter', CHARACTERS[this.selectedIndex].id);

    // Reset score for new game session and load any saved high scores
    scoreManager.loadProgress();
    scoreManager.resetSession();

    this.cleanupEventListeners();

    // Stop background music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }

    // Fade out and start game
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.time.delayedCall(500, () => {
      const firstLevelScene = LevelManager.getFirstLevelScene();
      if (firstLevelScene) {
        this.scene.start(firstLevelScene);
      }
    });
  }

  goBack(): void {
    this.cleanupEventListeners();
    this.scene.start('TitleScreen');
  }

  cleanupEventListeners(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
  }

  update(): void {
    // No update logic needed
  }
}

// Export character IDs for use in other files
export const CHARACTER_IDS = CHARACTERS.map(c => c.id);
