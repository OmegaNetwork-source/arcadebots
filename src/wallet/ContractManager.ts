import { ethers } from 'ethers';
import { walletManager } from './WalletManager';

// Leaderboard Contract ABI
const LEADERBOARD_ABI = [
    "function submitScore(uint256 _score) public",
    "function getPlayerCount() public view returns (uint256)",
    "function getPlayerScore(address _player) public view returns (uint256, uint256)",
    "function playerHighScores(address) public view returns (uint256 score, uint256 timestamp, bool exists)",
    "function players(uint256) public view returns (address)"
];

// Actual deployed contract address on Somnia Network
const DEFAULT_CONTRACT_ADDRESS = "0xbe9C31d707810A9bB926fB6F86918EC9F803DC94";
const UNCONFIGURED_ADDRESS = "0x0000000000000000000000000000000000000000";

class ContractManager {
    private static instance: ContractManager;
    private contractAddress: string;

    private constructor() {
        this.contractAddress = localStorage.getItem('somnia_leaderboard_address') || DEFAULT_CONTRACT_ADDRESS;
    }

    public static getInstance(): ContractManager {
        if (!ContractManager.instance) {
            ContractManager.instance = new ContractManager();
        }
        return ContractManager.instance;
    }

    public setContractAddress(address: string): void {
        this.contractAddress = address;
        localStorage.setItem('somnia_leaderboard_address', address);
    }

    public getContractAddress(): string {
        return this.contractAddress;
    }

    private async getContract(withSigner: boolean = false) {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask is not installed');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);

        if (withSigner) {
            const signer = await provider.getSigner();
            return new ethers.Contract(this.contractAddress, LEADERBOARD_ABI, signer);
        }

        return new ethers.Contract(this.contractAddress, LEADERBOARD_ABI, provider);
    }

    /**
     * Submit score on-chain to the Somnia Network
     */
    public async submitScoreOnChain(score: number): Promise<string> {
        const state = walletManager.getState();
        if (!state.isConnected) {
            throw new Error('Wallet not connected');
        }

        if (!state.isCorrectNetwork) {
            await walletManager.switchToSomnia();
        }

        if (this.contractAddress === UNCONFIGURED_ADDRESS) {
            throw new Error('Leaderboard contract address not configured. Please deploy and set the address.');
        }

        try {
            const contract = await this.getContract(true);
            const tx = await contract.submitScore(score);
            console.log('Transaction sent:', tx.hash);

            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt.hash);
            return receipt.hash;
        } catch (error: any) {
            console.error('Error submitting score on-chain:', error);
            throw error;
        }
    }

    /**
     * Get player's high score from the contract
     */
    public async getOnChainHighScore(address: string): Promise<number> {
        if (this.contractAddress === DEFAULT_CONTRACT_ADDRESS) return 0;

        try {
            const contract = await this.getContract();
            const [score] = await contract.getPlayerScore(address);
            return Number(score);
        } catch (error) {
            console.error('Error fetching on-chain score:', error);
            return 0;
        }
    }
}

export const contractManager = ContractManager.getInstance();
export default contractManager;
