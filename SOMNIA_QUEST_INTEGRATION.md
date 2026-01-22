# Somnia Arcade - Quest Integration

## 🎮 Platform Overview

**Somnia Arcade** is a collection of on-chain games integrated with the Somnia Network. The Quest Integration aggregates player activity across all supported games into a unified scoring system.

## 🔗 Games Included
1. **Arcade Bot:** Retro action platformer (https://arcadebots.solarstudios.co)
2. **Space Pilot:** Endless runner/shooter (https://spacepilot.solarstudios.co)
3. **Snake Arena:** Multiplayer snake battle (https://snake.solarstudios.co)
4. **Bushido Battle:** PVP duel & platformer (https://bushidogame.solarstudios.co)

---

## 🎯 Quest Details

### Quest Name
**Somnia Arcade Champion**

### Quest Description
Play any games in the Somnia Arcade ecosystem to earn points. Accumulate 5,000 points across all games to complete the quest.

### Quest Requirements
- **Connect Wallet:** Users must connect their MetaMask wallet (Somnia network)
- **Earn Points:** Accumulate a total of **5,000 points** across all supported games
- **Score Aggregation:** Scores are combined from all games (e.g., 2000 in Snake + 3000 in Space = Quest Complete)

### Scoring System

| Game | Score Conversion | Notes |
|------|------------------|-------|
| **Arcade Bot** | 1:1 Points | Standard gameplay points |
| **Space Pilot** | 1 Sec = 100 Pts | Based on survival time |
| **Snake Arena** | 1:1 Points | Based on massive growth |
| **Bushido** | 500 Pts / Win | Platformer coins + Duel wins |

---

## 🔌 API Integration

### Verification Endpoint

**URL:**
```
GET https://arcadebots.solarstudios.co/api/verify?wallet={WALLET_ADDRESS}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wallet` | string | Yes | Ethereum wallet address (0x...) |

**Example Request:**
```
GET https://arcadebots.solarstudios.co/api/verify?wallet=0x1234567890abcdef1234567890abcdef12345678
```

**Response Format:**
```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "totalScore": 7500,
  "completed": true,
  "threshold": 5000,
  "games": {
    "arcade_bot": { "score": 2500, "highScore": 2500, "gamesPlayed": 5 },
    "space_pilot": { "score": 3000, "highScore": 1500, "gamesPlayed": 10 },
    "bushido": { "score": 2000, "highScore": 500, "gamesPlayed": 4 }
  }
}
```

### Quest Completion Logic

```javascript
completed = (totalScore >= 5000)
```
A player has completed the quest when `completed: true` is returned.

---

## 🌐 Network Information

- **Supported Network:** Somnia Mainnet
- **Chain ID:** 50312 (0x13A7)
- **RPC URL:** https://api.infra.mainnet.somnia.network/
- **Block Explorer:** https://explorer.somnia.network

---

*Last Updated: January 2026*
