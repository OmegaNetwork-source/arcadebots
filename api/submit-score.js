// Vercel Serverless API - Submit/Update player score
// Endpoint: POST /api/submit-score

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

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

        // Normalize wallet address to lowercase
        const wallet = body.wallet.toLowerCase();

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        // If Supabase is not configured, return success for testing
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({
                success: true,
                wallet: wallet,
                message: 'Supabase not configured - score not saved'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Validate score values
        const totalScore = Math.max(0, Math.floor(body.totalScore || 0));
        const highScore = Math.max(0, Math.floor(body.highScore || 0));
        const bossesDefeated = Math.max(0, Math.floor(body.bossesDefeated || 0));
        const gamesPlayed = Math.max(0, Math.floor(body.gamesPlayed || 0));

        // Check if player already exists
        const { data: existing } = await supabase
            .from('player_scores')
            .select('total_score, high_score')
            .eq('wallet', wallet)
            .single();

        if (existing) {
            // Update existing record - only if new score is higher
            const newTotalScore = Math.max(existing.total_score, totalScore);
            const newHighScore = Math.max(existing.high_score, highScore);

            const { error: updateError } = await supabase
                .from('player_scores')
                .update({
                    total_score: newTotalScore,
                    high_score: newHighScore,
                    bosses_defeated: bossesDefeated,
                    games_played: gamesPlayed,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet', wallet);

            if (updateError) {
                console.error('Supabase update error:', updateError);
                return res.status(500).json({ error: 'Failed to update score' });
            }

            return res.status(200).json({
                success: true,
                wallet: wallet,
                totalScore: newTotalScore,
                highScore: newHighScore,
                message: 'Score updated'
            });
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('player_scores')
                .insert({
                    wallet: wallet,
                    total_score: totalScore,
                    high_score: highScore,
                    bosses_defeated: bossesDefeated,
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
                totalScore: totalScore,
                highScore: highScore,
                message: 'Score saved'
            });
        }

    } catch (error) {
        console.error('Error in submit-score endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
