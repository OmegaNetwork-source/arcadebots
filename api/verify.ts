// Vercel Serverless API - Verify player score for Somnia Quest
// Endpoint: GET /api/verify?wallet=0x...

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Quest threshold - score needed to complete quest
const QUEST_SCORE_THRESHOLD = 5000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const wallet = (req.query.wallet as string)?.toLowerCase();

        if (!wallet) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        // Query Supabase for player progress
        const { data, error } = await supabase
            .from('player_scores')
            .select('wallet, total_score, high_score, bosses_defeated, games_played, updated_at')
            .eq('wallet', wallet)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows found (not an error for us)
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        // If no data found, return default response
        if (!data) {
            return res.status(200).json({
                wallet: wallet,
                score: 0,
                completed: false
            });
        }

        // Check if player has completed the quest (score >= 5000)
        const completed = data.total_score >= QUEST_SCORE_THRESHOLD;

        // Return response in Somnia-expected format
        return res.status(200).json({
            wallet: data.wallet,
            score: data.total_score,
            completed: completed
        });

    } catch (error) {
        console.error('Error in verify endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
