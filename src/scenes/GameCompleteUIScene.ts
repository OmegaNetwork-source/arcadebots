import Phaser from 'phaser';
import * as utils from '../utils';
import { scoreManager } from '../wallet/ScoreManager';
import { walletManager } from '../wallet/WalletManager';
import { contractManager } from '../wallet/ContractManager';

export class GameCompleteUIScene extends Phaser.Scene {
  private currentLevelKey: string | null;
  private isTransitioning: boolean;
  private uiContainer: Phaser.GameObjects.DOMElement | null;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private isSubmitting: boolean = false;

  constructor() {
    super({
      key: "GameCompleteUIScene",
    });
    this.currentLevelKey = null;
    this.isTransitioning = false;
    this.uiContainer = null;
  }

  init(data: { currentLevelKey?: string }) {
    // Receive data from level scene
    this.currentLevelKey = data.currentLevelKey || "Level2Scene";
    // Reset transition flag
    this.isTransitioning = false;
    this.isSubmitting = false;
  }

  create(): void {
    // Create DOM UI
    this.createDOMUI();
    // Setup input controls
    this.setupInputs();

    // Auto-save progress on game complete
    scoreManager.saveProgress();
  }

  createDOMUI(): void {
    const score = scoreManager.getScore();
    const walletState = walletManager.getState();
    const contractAddress = contractManager.getContractAddress();
    const needsAddress = contractAddress === "0x0000000000000000000000000000000000000000" || contractAddress === "";

    const uiHTML = `
      <div id="game-complete-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-center items-center bg-black bg-opacity-80 backdrop-blur-sm">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center justify-center gap-8 p-8 text-center pointer-events-auto max-w-2xl w-full bg-gray-900 bg-opacity-60 rounded-3xl border border-yellow-500/30 shadow-2xl shadow-yellow-500/10">
          
          <!-- Game Complete Title -->
          <div id="game-complete-title" class="text-yellow-400 font-bold" style="
            font-size: clamp(40px, 5rem, 64px);
            text-shadow: 4px 4px 0px #000000;
            filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.5));
          ">Victory!</div>

          <!-- Score Display -->
          <div class="flex flex-col items-center gap-2">
            <div class="text-cyan-400 text-xl font-bold uppercase tracking-widest" style="font-family: 'Inter', sans-serif;">Final Score</div>
            <div class="text-white text-6xl font-black" style="font-family: 'Inter', sans-serif; text-shadow: 0 0 20px rgba(255,255,255,0.3);">${scoreManager.formatScore(score)}</div>
          </div>

          <!-- Somnia On-Chain Submission Section -->
          <div class="mt-4 p-6 bg-gradient-to-b from-purple-900/40 to-black/40 rounded-2xl border border-purple-500/30 w-full flex flex-col items-center gap-4">
            <div class="flex items-center gap-2 text-purple-300 font-bold">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                SOMNIA NETWORK INTEGRATION
            </div>

            ${!walletState.isConnected ? `
                <button id="connect-submit-btn" class="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/40">
                    Connect Wallet to Submit
                </button>
            ` : `
                <div class="flex flex-col items-center gap-3 w-full">
                    ${needsAddress ? `
                        <div class="flex flex-col gap-2 w-full max-w-xs">
                            <input id="contract-address-input" type="text" placeholder="Enter Contract Address" class="px-4 py-2 bg-black/50 border border-purple-500/50 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400" style="font-family: 'Inter', sans-serif;">
                            <button id="save-contract-btn" class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-purple-300 text-xs font-bold rounded-lg transition-all">Set Contract Address</button>
                        </div>
                    ` : `
                        <button id="submit-onchain-btn" class="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold transition-all shadow-lg hover:shadow-cyan-500/40 transform hover:scale-105">
                            Submit Score On-Chain
                        </button>
                        <div class="text-[10px] text-purple-400 opacity-60">Contract: ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}</div>
                    `}
                </div>
            `}
            <div id="submission-status" class="text-sm font-medium h-6"></div>
          </div>

          <!-- Coming Soon Text -->
          <div id="congratulations-text" class="text-white/80 font-medium italic" style="
            font-size: 18px;
            font-family: 'Inter', sans-serif;
          ">
            Full Story Mode Coming Soon
          </div>

          <!-- Click to return -->
          <button id="return-menu-btn" class="text-green-400 font-bold hover:text-green-300 transition-colors uppercase tracking-widest text-sm" style="
            text-shadow: 2px 2px 0px #000000;
          ">Click to Return to Menu</button>

        </div>

        <style>
          @keyframes glow {
            from { transform: scale(1); filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.5)); }
            to { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(234, 179, 8, 0.8)); }
          }
          
          #game-complete-title {
            animation: glow 1.5s ease-in-out infinite alternate;
          }

          @keyframes pulse-text {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          
          #return-menu-btn {
            animation: pulse-text 2s ease-in-out infinite;
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

    // Return to menu button
    const returnBtn = node.querySelector('#return-menu-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => this.returnToMenuWithSound());
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
        this.updateStatus('Preparing transaction...', 'text-cyan-400');

        try {
          const score = scoreManager.getScore();
          const txHash = await contractManager.submitScoreOnChain(score);
          this.updateStatus('Score submitted successfully! 🎉', 'text-green-400');

          // Disable button after success
          (submitBtn as HTMLButtonElement).disabled = true;
          (submitBtn as HTMLButtonElement).classList.add('opacity-50', 'grayscale');
        } catch (err: any) {
          console.error(err);
          this.updateStatus(err.message || 'Submission failed', 'text-red-400');
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
      statusEl.className = `text-sm font-medium h-6 mt-2 ${className}`;
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
      if (!this.isSubmitting) this.returnToMenuWithSound();
    });
    this.spaceKey.on('down', () => {
      if (!this.isSubmitting) this.returnToMenuWithSound();
    });
  }

  returnToMenuWithSound(): void {
    if (this.isSubmitting) return;
    this.sound.play("ui_click", { volume: 0.5 });
    this.returnToMenu();
  }

  returnToMenu(): void {
    // Prevent multiple triggers
    if (this.isTransitioning) return;
    this.isTransitioning = true;

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
    this.scene.stop(this.currentLevelKey!);

    // Start title screen
    this.scene.start("TitleScreen");
  }
}