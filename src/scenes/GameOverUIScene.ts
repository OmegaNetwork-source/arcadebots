import Phaser from 'phaser';
import * as utils from '../utils';
import { scoreManager } from '../wallet/ScoreManager';
import { walletManager } from '../wallet/WalletManager';
import { contractManager } from '../wallet/ContractManager';

export class GameOverUIScene extends Phaser.Scene {
  private currentLevelKey: string | null;
  private isRestarting: boolean;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private isSubmitting: boolean = false;

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
    this.isSubmitting = false;
  }

  create(): void {
    // Play game over sound
    this.sound.play("game_over_sound", { volume: 0.5 });
    // Create DOM UI
    this.createDOMUI();
    // Setup input controls
    this.setupInputs();

    // Auto-save progress
    scoreManager.saveProgress();
  }

  createDOMUI(): void {
    const score = scoreManager.getScore();
    const walletState = walletManager.getState();
    const contractAddress = contractManager.getContractAddress();
    const needsAddress = contractAddress === "0x0000000000000000000000000000000000000000" || contractAddress === "";

    const uiHTML = `
      <div id="game-over-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-center items-center bg-red-950/80 backdrop-blur-sm">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center justify-center gap-8 p-8 text-center pointer-events-auto max-w-2xl w-full bg-black/60 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/20">
          
          <!-- Game Over Title -->
          <div id="game-over-title" class="text-red-500 font-bold" style="
            font-size: clamp(48px, 6rem, 72px);
            text-shadow: 4px 4px 0px #000000;
          ">GAME OVER</div>

          <!-- Score Display -->
          <div class="flex flex-col items-center gap-1">
            <div class="text-gray-400 text-sm font-bold uppercase tracking-widest" style="font-family: 'Inter', sans-serif;">Score This Run</div>
            <div class="text-white text-5xl font-black" style="font-family: 'Inter', sans-serif;">${scoreManager.formatScore(score)}</div>
          </div>

          <!-- Somnia On-Chain Submission Section -->
          <div class="p-5 bg-gradient-to-b from-red-900/20 to-black/40 rounded-2xl border border-red-500/20 w-full flex flex-col items-center gap-4">
            <div class="text-xs text-red-300 font-bold tracking-widest uppercase opacity-70">Somnia Network Leaderboard</div>

            ${!walletState.isConnected ? `
                <button id="connect-submit-btn" class="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-lg">
                    Connect Wallet
                </button>
            ` : `
                <div class="flex flex-col items-center gap-3 w-full">
                    ${needsAddress ? `
                        <div class="flex flex-col gap-2 w-full max-w-xs">
                            <input id="contract-address-input" type="text" placeholder="Contract Address (0x...)" class="px-4 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white text-xs focus:outline-none focus:border-red-400" style="font-family: 'Inter', sans-serif;">
                            <button id="save-contract-btn" class="w-full py-2 bg-gray-800 hover:bg-gray-700 text-red-300 text-[10px] font-bold rounded-lg transition-all">Set Contract Address</button>
                        </div>
                    ` : `
                        <button id="submit-onchain-btn" class="px-8 py-3 rounded-xl bg-gradient-to-r from-red-800 to-purple-800 text-white font-bold transition-all shadow-lg transform hover:scale-105">
                            Submit Score On-Chain
                        </button>
                        <div class="text-[10px] text-red-400 opacity-50">Contract: ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}</div>
                    `}
                </div>
            `}
            <div id="submission-status" class="text-xs font-medium h-4"></div>
          </div>

          <!-- Press Enter Text -->
          <button id="restart-btn" class="text-yellow-400 font-bold hover:text-yellow-300 transition-colors uppercase tracking-widest text-sm" style="
            text-shadow: 2px 2px 0px #000000;
          ">Click or Press Enter to Restart</button>

        </div>

        <style>
          @keyframes dangerBlink {
            from { opacity: 0.7; filter: brightness(1); transform: scale(1); }
            to { opacity: 1; filter: brightness(1.3); transform: scale(1.05); }
          }
          
          #game-over-title {
            animation: dangerBlink 0.6s ease-in-out infinite alternate;
          }

          @keyframes blink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
          
          #restart-btn {
            animation: blink 0.8s ease-in-out infinite alternate;
          }
        </style>
      </div>
    `;

    this.uiContainer = utils.initUIDom(this, uiHTML);
    this.attachDomListeners();
  }

  attachDomListeners(): void {
    if (!this.uiContainer || !this.uiContainer.node) return;

    const node = this.uiContainer.node;

    // Restart button
    const restartBtn = node.querySelector('#restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGameWithSound());
    }

    // Wallet connect/submit button
    const connectBtn = node.querySelector('#connect-submit-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        try {
          await walletManager.connect();
          this.createDOMUI(); // Re-render UI
        } catch (err: any) {
          this.updateStatus(err.message, 'text-red-400');
        }
      });
    }

    // Set contract address logic
    const saveContractBtn = node.querySelector('#save-contract-btn');
    const contractInput = node.querySelector('#contract-address-input') as HTMLInputElement;
    if (saveContractBtn && contractInput) {
      saveContractBtn.addEventListener('click', () => {
        const address = contractInput.value.trim();
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
          contractManager.setContractAddress(address);
          this.createDOMUI(); // Re-render UI
        } else {
          this.updateStatus('Invalid address format', 'text-red-400');
        }
      });
    }

    // Submit on-chain logic
    const submitBtn = node.querySelector('#submit-onchain-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (this.isSubmitting) return;
        this.isSubmitting = true;
        this.updateStatus('Submitting...', 'text-cyan-400');

        try {
          const score = scoreManager.getScore();
          await contractManager.submitScoreOnChain(score);
          this.updateStatus('Score submitted! 🚀', 'text-green-400');

          // Disable button after success
          (submitBtn as HTMLButtonElement).disabled = true;
          (submitBtn as HTMLButtonElement).classList.add('opacity-50', 'grayscale');
        } catch (err: any) {
          console.error(err);
          this.updateStatus(err.message || 'Error', 'text-red-400');
        } finally {
          this.isSubmitting = false;
        }
      });
    }
  }

  updateStatus(text: string, className: string): void {
    const statusEl = document.getElementById('submission-status');
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = `text-xs font-medium h-4 mt-1 ${className}`;
    }
  }

  setupInputs(): void {
    // Clear previous event listeners
    this.input.off('pointerdown');

    // Create keyboard input
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Listen for key events
    this.enterKey.on('down', () => {
      if (!this.isSubmitting) this.restartGameWithSound();
    });
    this.spaceKey.on('down', () => {
      if (!this.isSubmitting) this.restartGameWithSound();
    });
  }

  restartGameWithSound(): void {
    if (this.isSubmitting) return;
    this.sound.play("ui_click", { volume: 0.5 });
    this.restartGame();
  }

  restartGame(): void {
    // Prevent multiple triggers
    if (this.isRestarting) return;
    this.isRestarting = true;

    // Stop current level's background music
    const currentScene = this.scene.get(this.currentLevelKey!) as any;
    if (currentScene && currentScene.backgroundMusic) {
      currentScene.backgroundMusic.stop();
    }

    // Clear event listeners
    this.input.off('pointerdown');
    if (this.enterKey) this.enterKey.off('down');
    if (this.spaceKey) this.spaceKey.off('down');

    // Stop all game-related scenes
    this.scene.stop("UIScene");
    this.scene.stop("FallingUIScene");
    this.scene.stop("BossUIScene");
    this.scene.stop("FallingSequenceScene");
    this.scene.stop("BossArenaScene");
    this.scene.stop(this.currentLevelKey!);

    if (this.currentLevelKey === "BossArenaScene" || this.currentLevelKey === "FallingSequenceScene") {
      this.scene.start("BossArenaScene");
    } else {
      this.scene.start(this.currentLevelKey!);
    }
  }
}