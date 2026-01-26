import { ethers } from 'ethers';
import { walletManager } from './WalletManager';

// ArcadeBotLeaderboard contract address on Somnia Mainnet
export const ARCADE_BOT_CONTRACT_ADDRESS = '0xf30959f6323c2a38da93c617b08493f39922c1ec';

// ABI for the ArcadeBotLeaderboard contract
export const ARCADE_BOT_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "score",
                "type": "uint256"
            }
        ],
        "name": "submitScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "player",
                "type": "address"
            }
        ],
        "name": "bestScore",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "player",
                "type": "address"
            }
        ],
        "name": "totalScore",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "limit",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "offset",
                "type": "uint256"
            }
        ],
        "name": "getLeaderboard",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            },
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

class ContractManager {
    private static instance: ContractManager;
    private provider: ethers.providers.Web3Provider | null = null;
    private contract: ethers.Contract | null = null;

    private constructor() { }

    public static getInstance(): ContractManager {
        if (!ContractManager.instance) {
            ContractManager.instance = new ContractManager();
        }
        return ContractManager.instance;
    }

    private async ensureConnection() {
        if (typeof window === 'undefined' || !window.ethereum) {
            throw new Error('MetaMask not installed');
        }

        if (!this.provider) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
        }

        const walletState = walletManager.getState();
        if (!walletState.isConnected) {
            await walletManager.connect();
        }

        if (!walletState.isCorrectNetwork) {
            await walletManager.switchToSomnia();
        }

        if (!this.contract) {
            const signer = this.provider.getSigner();
            this.contract = new ethers.Contract(ARCADE_BOT_CONTRACT_ADDRESS, ARCADE_BOT_ABI, signer);
        }

        return this.contract;
    }

    public async submitScoreOnChain(score: number): Promise<string | null> {
        try {
            const contract = await this.ensureConnection();
            const tx = await contract.submitScore(score);
            console.log('Submitting score to blockchain...', tx.hash);
            const receipt = await tx.wait();
            console.log('Score submitted successfully!', receipt.transactionHash);
            return receipt.transactionHash;
        } catch (error) {
            console.error('Failed to submit score to blockchain:', error);
            return null;
        }
    }

    public async getBestScore(address: string): Promise<number> {
        try {
            const contract = await this.ensureConnection();
            const score = await contract.bestScore(address);
            return score.toNumber();
        } catch (error) {
            console.error('Failed to get best score from blockchain:', error);
            return 0;
        }
    }
}

export const contractManager = ContractManager.getInstance();
