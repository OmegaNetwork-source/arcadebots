// Vercel Serverless API - Verify player score for Somnia Quest
// Endpoint: GET /api/verify?wallet=0x...
// Returns AGGREGATED score across ALL Somnia Arcade games

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Quest threshold - combined score needed across ALL games
const QUEST_SCORE_THRESHOLD = 5000;

// Valid game names
const VALID_GAMES = ['arcade_bot', 'space_pilot', 'snake_arena', 'bushido'];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get wallet address from query parameter (case-insensitive)
        const wallet = req.query.wallet?.toLowerCase();

        if (!wallet) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        // If Supabase is not configured, return mock data for testing
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({
                wallet: wallet,
                totalScore: 0,
                completed: false,
                games: {},
                note: 'Supabase not configured'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Query ALL game scores for this wallet
        const { data, error } = await supabase
            .from('player_scores')
            .select('game, score, high_score, games_played, updated_at')
            .eq('wallet', wallet);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        // If no data found, return default response
        if (!data || data.length === 0) {
            return res.status(200).json({
                wallet: wallet,
                totalScore: 0,
                completed: false,
                games: {}
            });
        }

        // Aggregate scores across all games
        let totalScore = 0;
        const gameBreakdown = {};

        for (const entry of data) {
            totalScore += entry.score || 0;
            gameBreakdown[entry.game] = {
                score: entry.score || 0,
                highScore: entry.high_score || 0,
                gamesPlayed: entry.games_played || 0,
                lastPlayed: entry.updated_at
            };
        }

        // Check if player has completed the quest (combined score >= 5000)
        const completed = totalScore >= QUEST_SCORE_THRESHOLD;

        // Return response with breakdown by game
        return res.status(200).json({
            wallet: wallet,
            totalScore: totalScore,
            completed: completed,
            threshold: QUEST_SCORE_THRESHOLD,
            games: gameBreakdown
        });

    } catch (error) {
        console.error('Error in verify endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
