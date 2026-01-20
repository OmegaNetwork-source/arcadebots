// WalletManager.ts - Handles MetaMask wallet connection for Somnia Network

// Somnia Mainnet Configuration
export const SOMNIA_NETWORK = {
  chainId: '0x13A7', // 5031 in hex
  chainName: 'Somnia Mainnet',
  nativeCurrency: {
    name: 'SOMI',
    symbol: 'SOMI',
    decimals: 18
  },
  rpcUrls: ['https://api.infra.mainnet.somnia.network/'],
  blockExplorerUrls: ['https://explorer.somnia.network']
};

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  isCorrectNetwork: boolean;
}

class WalletManager {
  private static instance: WalletManager;
  private state: WalletState = {
    isConnected: false,
    address: null,
    isCorrectNetwork: false
  };
  private listeners: ((state: WalletState) => void)[] = [];

  private constructor() {
    this.initializeListeners();
  }

  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  private initializeListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.updateState({ isConnected: false, address: null });
        } else {
          this.updateState({ isConnected: true, address: accounts[0].toLowerCase() });
        }
      });

      window.ethereum.on('chainChanged', () => {
        this.checkNetwork();
      });

      // Check if already connected
      this.checkExistingConnection();
    }
  }

  private async checkExistingConnection(): Promise<void> {
    if (!window.ethereum) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        this.updateState({ 
          isConnected: true, 
          address: accounts[0].toLowerCase() 
        });
        await this.checkNetwork();
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
    }
  }

  private updateState(partial: Partial<WalletState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.state);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getState(): WalletState {
    return { ...this.state };
  }

  public isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
  }

  public async connect(): Promise<WalletState> {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      throw new Error('MetaMask is not installed');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        this.updateState({
          isConnected: true,
          address: accounts[0].toLowerCase()
        });

        // Switch to Somnia network
        await this.switchToSomnia();
      }

      return this.state;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  public async switchToSomnia(): Promise<boolean> {
    if (!window.ethereum) return false;

    try {
      // Try to switch to Somnia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_NETWORK.chainId }]
      });
      this.updateState({ isCorrectNetwork: true });
      return true;
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SOMNIA_NETWORK]
          });
          this.updateState({ isCorrectNetwork: true });
          return true;
        } catch (addError) {
          console.error('Error adding Somnia network:', addError);
          return false;
        }
      }
      console.error('Error switching to Somnia network:', switchError);
      return false;
    }
  }

  private async checkNetwork(): Promise<void> {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrect = chainId === SOMNIA_NETWORK.chainId;
      this.updateState({ isCorrectNetwork: isCorrect });
    } catch (error) {
      console.error('Error checking network:', error);
    }
  }

  public disconnect(): void {
    this.updateState({
      isConnected: false,
      address: null,
      isCorrectNetwork: false
    });
  }

  public getShortAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export const walletManager = WalletManager.getInstance();
export default WalletManager;
