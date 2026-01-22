// Vercel Serverless API - Submit/Update player score
// Endpoint: POST /api/submit-score
// Supports multiple games: arcade_bot, space_pilot, snake_arena, bushido

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Valid game identifiers
const VALID_GAMES = ['arcade_bot', 'space_pilot', 'snake_arena', 'bushido'];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;

        // Validate required fields
        if (!body.wallet) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        if (!body.game) {
            return res.status(400).json({ error: 'Game identifier required' });
        }

        // Normalize wallet address to lowercase
        const wallet = body.wallet.toLowerCase();
        const game = body.game.toLowerCase();

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        // Validate game identifier
        if (!VALID_GAMES.includes(game)) {
            return res.status(400).json({
                error: 'Invalid game identifier',
                validGames: VALID_GAMES
            });
        }

        // If Supabase is not configured, return success for testing
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({
                success: true,
                wallet: wallet,
                game: game,
                message: 'Supabase not configured - score not saved'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Validate score values
        const score = Math.max(0, Math.floor(body.score || 0));
        const highScore = Math.max(0, Math.floor(body.highScore || score));
        const gamesPlayed = Math.max(0, Math.floor(body.gamesPlayed || 1));

        // Check if player already has a record for this game
        const { data: existing } = await supabase
            .from('player_scores')
            .select('score, high_score, games_played')
            .eq('wallet', wallet)
            .eq('game', game)
            .single();

        if (existing) {
            // Update existing record - add to cumulative score, keep best high score
            const newScore = existing.score + score;
            const newHighScore = Math.max(existing.high_score, highScore);
            const newGamesPlayed = existing.games_played + 1;

            const { error: updateError } = await supabase
                .from('player_scores')
                .update({
                    score: newScore,
                    high_score: newHighScore,
                    games_played: newGamesPlayed,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet', wallet)
                .eq('game', game);

            if (updateError) {
                console.error('Supabase update error:', updateError);
                return res.status(500).json({ error: 'Failed to update score' });
            }

            return res.status(200).json({
                success: true,
                wallet: wallet,
                game: game,
                score: newScore,
                highScore: newHighScore,
                gamesPlayed: newGamesPlayed,
                message: 'Score updated'
            });
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('player_scores')
                .insert({
                    wallet: wallet,
                    game: game,
                    score: score,
                    high_score: highScore,
                    games_played: gamesPlayed,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Supabase insert error:', insertError);
                return res.status(500).json({ error: 'Failed to save score' });
            }

            return res.status(201).json({
                success: true,
                wallet: wallet,
                game: game,
                score: score,
                highScore: highScore,
                gamesPlayed: gamesPlayed,
                message: 'Score saved'
            });
        }

    } catch (error) {
        console.error('Error in submit-score endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
