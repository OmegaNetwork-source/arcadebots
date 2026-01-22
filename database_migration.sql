-- =====================================================
-- SOMNIA ARCADE - Multi-Game Score Database Migration
-- =====================================================
-- Run this in your Supabase SQL Editor to update the schema
-- This supports tracking scores across multiple games

-- Step 1: Drop the old table (if you want a fresh start)
-- WARNING: This will delete all existing data!
DROP TABLE IF EXISTS player_scores;

-- Step 2: Create new table with game tracking
CREATE TABLE player_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet TEXT NOT NULL,
    game TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    high_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Each wallet can only have one entry per game
    UNIQUE(wallet, game)
);

-- Step 3: Create indexes for fast lookups
CREATE INDEX idx_player_scores_wallet ON player_scores(wallet);
CREATE INDEX idx_player_scores_game ON player_scores(game);
CREATE INDEX idx_player_scores_wallet_game ON player_scores(wallet, game);

-- Step 4: Enable Row Level Security
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy to allow all operations (for serverless API)
CREATE POLICY "Allow all operations" ON player_scores
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- VALID GAME NAMES:
-- - 'arcade_bot'
-- - 'space_pilot'
-- - 'snake_arena'
-- - 'bushido'
-- =====================================================
