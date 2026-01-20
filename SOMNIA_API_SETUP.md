# Somnia Quest API Setup Guide

This guide explains how to deploy the Arcade Bot verification API for Somnia Quest integration.

## Overview

The API provides two endpoints:
- `GET /api/verify?wallet=0x...` - Verify player score for Somnia Quest
- `POST /api/submit-score` - Submit player scores from the game

**Quest Requirement**: Score >= 5,000 points to complete the quest.

---

## Step 1: Create a Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Name it `arcade-bot-scores` (or whatever you prefer)
4. Choose a strong database password (save this!)
5. Select a region closest to your players
6. Click "Create new project" and wait for it to provision

---

## Step 2: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Run this SQL to create the scores table:

```sql
-- Create player_scores table for Somnia Quest verification
CREATE TABLE player_scores (
  id SERIAL PRIMARY KEY,
  wallet VARCHAR(42) UNIQUE NOT NULL,
  total_score INTEGER DEFAULT 0,
  high_score INTEGER DEFAULT 0,
  bosses_defeated INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast wallet lookups
CREATE INDEX idx_player_scores_wallet ON player_scores(wallet);

-- Enable Row Level Security (but allow all operations for now)
ALTER TABLE player_scores ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for leaderboards)
CREATE POLICY "Allow public read" ON player_scores FOR SELECT USING (true);

-- Allow public insert/update (scores come from game client)
CREATE POLICY "Allow public insert" ON player_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON player_scores FOR UPDATE USING (true);
```

---

## Step 3: Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

---

## Step 4: Deploy to Vercel

### Option A: Connect GitHub Repo

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_ANON_KEY` = your anon public key
4. Deploy!

### Option B: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts)
vercel

# Add secrets
vercel secrets add supabase-url "https://xxxxx.supabase.co"
vercel secrets add supabase-anon-key "eyJ..."

# Redeploy with secrets
vercel --prod
```

---

## Step 5: Update Game to Use API

After deployment, get your Vercel URL (e.g., `https://arcade-bot.vercel.app`)

1. Create a `.env` file in your project:
```
VITE_API_URL=https://arcade-bot.vercel.app
```

2. Or set it in Vercel environment variables for the frontend too.

---

## Step 6: Test the API

### Test Verify Endpoint
```bash
curl "https://YOUR-VERCEL-URL/api/verify?wallet=0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41"
```

Expected response:
```json
{
  "wallet": "0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41",
  "score": 5500,
  "completed": true
}
```

### Test Submit Score
```bash
curl -X POST "https://YOUR-VERCEL-URL/api/submit-score" \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x2bbb78236329eb7fe5b7ec9c239f44411d9a7b41","totalScore":5500,"highScore":3000,"bossesDefeated":1,"gamesPlayed":3}'
```

---

## Step 7: Provide API to Somnia

Send Somnia team this info:

**Verification API Endpoint:**
```
GET https://YOUR-VERCEL-URL/api/verify?wallet=0xADDRESS
```

**Quest Criteria:**
- Task: "Reach 5,000 points in Arcade Bot"
- Completion: `completed: true` when `score >= 5000`

**Response Format:**
```json
{
  "wallet": "0x...",
  "score": 5000,
  "completed": true
}
```

---

## Troubleshooting

### API returns 500 error
- Check Vercel logs for details
- Verify Supabase credentials are correct
- Make sure the `player_scores` table exists

### Scores not syncing
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Make sure wallet is connected (not anonymous)

### CORS errors
- The API already has CORS enabled for all origins
- If you still have issues, check browser network tab

---

## Files Reference

| File | Purpose |
|------|---------|
| `api/verify.ts` | Somnia verification endpoint |
| `api/submit-score.ts` | Score submission endpoint |
| `vercel.json` | Vercel deployment config |
| `src/wallet/ScoreManager.ts` | Game score tracking |

---

## Support

For issues with:
- **This API**: Check the Vercel and Supabase docs
- **Somnia Quest**: Contact Somnia team
- **Game bugs**: Submit an issue on GitHub
