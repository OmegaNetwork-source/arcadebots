import Phaser from 'phaser';
import { LevelManager } from '../LevelManager.js';
import * as utils from '../utils';
import { walletManager, type WalletState } from '../wallet/WalletManager';

export class TitleScreen extends Phaser.Scene {
  public uiContainer!: Phaser.GameObjects.DOMElement;
  public keydownHandler?: (event: KeyboardEvent) => void;
  public clickHandler?: (event: Event) => void;
  public walletButtonHandler?: (event: Event) => void;
  public backgroundMusic!: Phaser.Sound.BaseSound;
  public isStarting: boolean = false;
  private unsubscribeWallet?: () => void;

  constructor() {
    super({ key: "TitleScreen" });
    this.isStarting = false;
  }

  init(): void {
    this.isStarting = false;
  }

  create(): void {
    this.initializeSounds();
    this.createDOMUI();
    this.setupInputs();
    this.setupWalletConnection();
    this.playBackgroundMusic();

    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  setupWalletConnection(): void {
    // Subscribe to wallet state changes
    this.unsubscribeWallet = walletManager.subscribe((state: WalletState) => {
      this.updateWalletUI(state);
    });
  }

  updateWalletUI(state: WalletState): void {
    const walletButton = document.getElementById('wallet-connect-btn');
    const walletStatus = document.getElementById('wallet-status');

    if (walletButton && walletStatus) {
      if (state.isConnected && state.address) {
        const shortAddress = walletManager.getShortAddress(state.address);
        walletButton.innerHTML = `
          <span class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${state.isCorrectNetwork ? 'bg-green-400' : 'bg-yellow-400'}"></span>
            ${shortAddress}
          </span>
        `;
        walletButton.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-cyan-500');
        walletButton.classList.add('bg-gray-800', 'border', 'border-cyan-400');

        walletStatus.textContent = state.isCorrectNetwork ? 'Somnia Network' : 'Wrong Network - Click to Switch';
        walletStatus.className = state.isCorrectNetwork
          ? 'text-xs text-green-400 mt-1'
          : 'text-xs text-yellow-400 mt-1 cursor-pointer';
      } else {
        walletButton.innerHTML = `
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/>
              <polyline points="15 11 19 11 19 7"/>
              <path d="M9 7v10"/>
            </svg>
            Connect Wallet
          </span>
        `;
        walletButton.classList.add('bg-gradient-to-r', 'from-purple-600', 'to-cyan-500');
        walletButton.classList.remove('bg-gray-800', 'border', 'border-cyan-400');
        walletStatus.textContent = '';
      }
    }
  }

  async handleWalletConnect(): Promise<void> {
    try {
      const state = walletManager.getState();

      if (state.isConnected && !state.isCorrectNetwork) {
        // Already connected but wrong network - switch network
        await walletManager.switchToSomnia();
      } else if (!state.isConnected) {
        // Not connected - connect wallet
        await walletManager.connect();
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      if (error.message === 'MetaMask is not installed') {
        // Will open MetaMask download page
      }
    }
  }

  createDOMUI(): void {
    const uiHTML = `
      <div id="title-screen-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-between items-center" style="image-rendering: auto; background-image: url('https://cdn-game-mcp.gambo.ai/85b616cb-0f03-4cd0-9068-67934773169d/images/hollow_cave_background.png'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <!-- Dark overlay -->
        <div class="absolute inset-0 bg-black bg-opacity-40"></div>
        
        <!-- Wallet Connect Button (Top Right) -->
        <div class="absolute top-4 right-4 z-50 pointer-events-auto flex flex-col items-end">
          <button id="wallet-connect-btn" class="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-sm hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-cyan-500/30" style="font-family: 'Inter', sans-serif;">
            <span class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Connect Wallet
            </span>
          </button>
          <div id="wallet-status" class="text-xs text-green-400 mt-1" style="font-family: 'Inter', sans-serif;"></div>
        </div>
        
        <!-- Main Content Container -->
        <div class="relative flex flex-col items-center space-y-10 justify-between pt-12 pb-20 w-full text-center pointer-events-auto h-full">
          
          <!-- Game Title Image Container -->
          <div id="game-title-container" class="flex-shrink-0 flex items-center justify-center">
            <img id="game-title-image" 
                 src="https://cdn-game-mcp.gambo.ai/fb0bc11b-62ec-45cf-8642-a67543ae46b4/images/arcade_bot_game_title.png" 
                 alt="Arcade Bot" 
                 class="max-h-[280px] mx-20 object-contain pointer-events-none"
                 style="filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.8));" />
          </div>

          <!-- Spacer -->
          <div class="flex-grow"></div>

          <!-- Press Enter Text -->
          <div id="press-enter-text" class="text-cyan-400 font-bold pointer-events-none flex-shrink-0" style="
            font-size: 36px;
            text-shadow: 3px 3px 0px #000000, 0 0 20px rgba(0,255,255,0.5);
            animation: titleBlink 1s ease-in-out infinite alternate;
          ">PRESS ENTER TO START</div>

        </div>

        <!-- Custom Animations and Styles -->
        <style>
          @keyframes titleBlink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupInputs(): void {
    const handleStart = (event: Event) => {
      // Don't start game if clicking wallet button
      const target = event.target as HTMLElement;
      if (target.closest('#wallet-connect-btn') || target.closest('#wallet-status')) {
        return;
      }
      event.preventDefault();
      this.startGame();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.startGame();
      }
    };

    const handleWalletClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleWalletConnect();
    };

    document.addEventListener('keydown', handleKeyDown);

    if (this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.addEventListener('click', handleStart);

      // Add wallet button listener
      const walletBtn = this.uiContainer.node.querySelector('#wallet-connect-btn');
      if (walletBtn) {
        walletBtn.addEventListener('click', handleWalletClick);
      }

      // Add wallet status text listener (for "Wrong Network - Click to Switch")
      const walletStatus = this.uiContainer.node.querySelector('#wallet-status');
      if (walletStatus) {
        walletStatus.addEventListener('click', handleWalletClick);
      }
    }

    this.keydownHandler = handleKeyDown;
    this.clickHandler = handleStart;
    this.walletButtonHandler = handleWalletClick;
  }

  initializeSounds(): void {
    this.backgroundMusic = this.sound.add("cave_exploration_theme", {
      volume: 0.4,
      loop: true
    });
  }

  playBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.play();
    }
  }

  startGame(): void {
    if (this.isStarting) return;
    this.isStarting = true;

    // Play click sound
    this.sound.play("ui_click", { volume: 0.5 });

    this.cleanupEventListeners();

    // Don't stop background music - it continues into character select

    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.time.delayedCall(300, () => {
      // Go to character selection screen
      this.scene.start('CharacterSelectScene');
    });
  }

  cleanupEventListeners(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }

    if (this.clickHandler && this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.removeEventListener('click', this.clickHandler);
    }

    if (this.walletButtonHandler && this.uiContainer && this.uiContainer.node) {
      const walletBtn = this.uiContainer.node.querySelector('#wallet-connect-btn');
      if (walletBtn) {
        walletBtn.removeEventListener('click', this.walletButtonHandler);
      }
    }

    if (this.unsubscribeWallet) {
      this.unsubscribeWallet();
    }
  }

  update(): void {
    // Title screen doesn't need special update logic
  }
}
