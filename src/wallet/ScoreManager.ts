// ScoreManager.ts - Handles score tracking linked to wallet addresses

import { walletManager } from './WalletManager';

// Score event types
export type ScoreEventType =
    | 'enemy_killed'
    | 'boss_killed'
    | 'pickup_collected'
    | 'level_completed'
    | 'game_completed'
    | 'damage_dealt'
    | 'falling_survival';

// Score values for different events
const SCORE_VALUES: Record<ScoreEventType, number> = {
    enemy_killed: 100,
    boss_killed: 1000,
    pickup_collected: 25,
    level_completed: 1000,
    game_completed: 2500,
    damage_dealt: 1, // Per point of damage
    falling_survival: 500, // Surviving the fall
};

// Enemy-specific score bonuses
const ENEMY_SCORES: Record<string, number> = {
    BugEnemy: 100,
    SlimeCrawler: 150,
    FlyingBat: 200,
    CorruptedBoss: 1000,
};

export interface GameStats {
    score: number;           // Current session score
    totalScore: number;      // Cumulative lifetime score (stacks across sessions)
    highScore: number;       // Best single session score
    enemiesKilled: number;
    pickupsCollected: number;
    levelsCompleted: string[];
    bossesDefeated: number;
    totalDamageDealt: number;
    gamesPlayed: number;
    bestTime: number | null; // Fastest completion in ms
}

export interface PlayerProgress {
    wallet: string;
    stats: GameStats;
    lastPlayed: number;
    completed: boolean; // For Somnia quest verification
}

class ScoreManager {
    private static instance: ScoreManager;
    private currentScore: number = 0;
    private sessionStats: GameStats;
    private listeners: ((score: number, stats: GameStats) => void)[] = [];

    private constructor() {
        this.sessionStats = this.createEmptyStats();
    }

    public static getInstance(): ScoreManager {
        if (!ScoreManager.instance) {
            ScoreManager.instance = new ScoreManager();
        }
        return ScoreManager.instance;
    }

    private createEmptyStats(): GameStats {
        return {
            score: 0,
            totalScore: 0,
            highScore: 0,
            enemiesKilled: 0,
            pickupsCollected: 0,
            levelsCompleted: [],
            bossesDefeated: 0,
            totalDamageDealt: 0,
            gamesPlayed: 0,
            bestTime: null,
        };
    }

    // Get current session score
    public getScore(): number {
        return this.currentScore;
    }

    // Get total cumulative score
    public getTotalScore(): number {
        return this.sessionStats.totalScore;
    }

    // Get current session stats
    public getStats(): GameStats {
        return { ...this.sessionStats };
    }

    // Subscribe to score changes
    public subscribe(listener: (score: number, stats: GameStats) => void): () => void {
        this.listeners.push(listener);
        // Immediately call with current state
        listener(this.currentScore, this.sessionStats);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.currentScore, this.sessionStats));
    }

    // Add score for an event
    public addScore(eventType: ScoreEventType, multiplier: number = 1): number {
        const baseScore = SCORE_VALUES[eventType];
        const points = Math.floor(baseScore * multiplier);
        this.currentScore += points;
        this.sessionStats.score = this.currentScore;
        this.sessionStats.totalScore += points; // Add to cumulative total

        // Update high score (best single session)
        if (this.currentScore > this.sessionStats.highScore) {
            this.sessionStats.highScore = this.currentScore;
        }

        this.notifyListeners();
        this.autoSave(); // Auto-save after each score change
        return points;
    }

    // Add score for killing an enemy (with enemy type bonus)
    public addEnemyKillScore(enemyType: string): number {
        const baseScore = ENEMY_SCORES[enemyType] || SCORE_VALUES.enemy_killed;
        this.currentScore += baseScore;
        this.sessionStats.score = this.currentScore;
        this.sessionStats.totalScore += baseScore; // Add to cumulative total
        this.sessionStats.enemiesKilled++;

        if (enemyType === 'CorruptedBoss') {
            this.sessionStats.bossesDefeated++;
        }

        // Update high score
        if (this.currentScore > this.sessionStats.highScore) {
            this.sessionStats.highScore = this.currentScore;
        }

        this.notifyListeners();
        this.autoSave();
        return baseScore;
    }

    // Add score for collecting a pickup
    public addPickupScore(pickupType: string): number {
        const points = SCORE_VALUES.pickup_collected;
        this.currentScore += points;
        this.sessionStats.score = this.currentScore;
        this.sessionStats.totalScore += points;
        this.sessionStats.pickupsCollected++;

        this.notifyListeners();
        this.autoSave();
        return points;
    }

    // Add score for dealing damage
    public addDamageScore(damage: number): number {
        const points = Math.floor(damage * SCORE_VALUES.damage_dealt);
        this.currentScore += points;
        this.sessionStats.score = this.currentScore;
        this.sessionStats.totalScore += points;
        this.sessionStats.totalDamageDealt += damage;

        this.notifyListeners();
        return points; // Don't auto-save on every damage tick for performance
    }

    // Add score for surviving the fall
    public addFallingSurvivalScore(): number {
        return this.addScore('falling_survival');
    }

    // Add score for defeating the boss
    public addBossKillScore(): number {
        return this.addScore('boss_killed');
    }

    // Mark level as completed
    public completeLevel(levelKey: string): number {
        if (!this.sessionStats.levelsCompleted.includes(levelKey)) {
            this.sessionStats.levelsCompleted.push(levelKey);
        }
        return this.addScore('level_completed');
    }

    // Mark game as completed
    public completeGame(): number {
        this.sessionStats.gamesPlayed++;
        return this.addScore('game_completed');
    }

    // Reset session score but keep cumulative totals
    public resetSession(): void {
        this.currentScore = 0;
        // Keep the cumulative stats, just reset session score
        this.sessionStats.score = 0;
        this.notifyListeners();
    }

    // Auto-save progress (debounced internally)
    private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
    private autoSave(): void {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.autoSaveTimeout = setTimeout(() => {
            this.saveProgress();
        }, 1000); // Save 1 second after last score change
    }

    // Save progress to localStorage (linked to wallet) and sync to backend
    public saveProgress(): void {
        const walletState = walletManager.getState();
        const walletAddress = walletState.address?.toLowerCase() || 'anonymous';

        const progress: PlayerProgress = {
            wallet: walletAddress,
            stats: { ...this.sessionStats },
            lastPlayed: Date.now(),
            completed: this.sessionStats.levelsCompleted.length > 0 || this.sessionStats.bossesDefeated > 0,
        };

        // Get existing progress for all wallets
        const allProgress = this.getAllProgress();
        allProgress[walletAddress] = progress;

        localStorage.setItem('arcadebot_progress', JSON.stringify(allProgress));

        // Sync to backend API if wallet is connected (for Somnia Quest verification)
        if (walletAddress !== 'anonymous') {
            this.syncToBackend(walletAddress, this.sessionStats);
        }
    }

    // Sync scores to backend API for Somnia Quest verification
    private async syncToBackend(wallet: string, stats: GameStats): Promise<void> {
        try {
            // Get API URL from environment or window config
            // @ts-ignore - Vite injects this at build time
            const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
                (window as any).__ARCADE_BOT_API_URL__ || '';

            if (!apiUrl) {
                // No API URL configured, skip sync (local development)
                console.log('No API URL configured, skipping backend sync');
                return;
            }

            const response = await fetch(`${apiUrl}/api/submit-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet: wallet,
                    totalScore: stats.totalScore,
                    highScore: stats.highScore,
                    bossesDefeated: stats.bossesDefeated,
                    gamesPlayed: stats.gamesPlayed,
                }),
            });

            if (response.ok) {
                console.log('Score synced to backend successfully');
            } else {
                console.warn('Failed to sync score to backend:', response.status);
            }
        } catch (error) {
            // Silently fail - don't break the game if backend sync fails
            console.warn('Backend sync error:', error);
        }
    }

    // Load progress from localStorage
    public loadProgress(): PlayerProgress | null {
        const walletState = walletManager.getState();
        const walletAddress = walletState.address?.toLowerCase() || 'anonymous';

        const allProgress = this.getAllProgress();
        const progress = allProgress[walletAddress];

        if (progress) {
            // Restore cumulative stats from saved progress
            this.sessionStats = { ...progress.stats };
            this.currentScore = 0; // Start new session at 0, but totalScore persists
            this.sessionStats.score = 0;
            this.notifyListeners();
            return progress;
        }

        return null;
    }

    // Get all stored progress (for leaderboard)
    private getAllProgress(): Record<string, PlayerProgress> {
        try {
            const stored = localStorage.getItem('arcadebot_progress');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }

    // Get progress for a specific wallet (for Somnia API)
    public getProgressForWallet(walletAddress: string): PlayerProgress | null {
        const normalizedAddress = walletAddress.toLowerCase();
        const allProgress = this.getAllProgress();
        return allProgress[normalizedAddress] || null;
    }

    // Format score with commas
    public formatScore(score?: number): string {
        const s = score ?? this.currentScore;
        return s.toLocaleString();
    }

    // Get formatted high score
    public getHighScore(): number {
        return this.sessionStats.highScore;
    }
}

export const scoreManager = ScoreManager.getInstance();
export default ScoreManager;

