# Personalization OS

**Port:** 4893  
**Status:** ✅ Built  
**Purpose:** User preference learning, affinity scoring, recommendations, and segmentation

---

## Overview

Personalization OS learns user preferences and provides personalized experiences:
- User profile management
- Preference tracking (likes, dislikes, views)
- Affinity scoring by category
- Personalized recommendations
- User segmentation

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## Profile Structure

```json
{
  "userId": "string",
  "name": "string",
  "preferences": {},
  "traits": {},
  "affinityScores": { "category": 0.5 },
  "interactionCount": 100,
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## API Endpoints

### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List profiles (filter: userId) |
| POST | `/api/profiles` | Create profile |
| PUT | `/api/profiles/:userId` | Update profile |

### Preference Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/preferences/:userId/track` | Track interaction |
| GET | `/api/preferences/:userId/events` | Get interaction history |

### Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/:userId` | Get personalized recommendations |

### Segmentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/segments` | Get all user segments |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/ready` | Readiness check |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/personalization
npm install
npm start
```

---

## Example Usage

### Create Profile
```javascript
await fetch('http://localhost:4893/api/profiles', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user-123',
    name: 'John Doe',
    preferences: { theme: 'dark', notifications: true },
    traits: { age: 30, occupation: 'engineer' }
  })
});
```

### Track Preferences
```javascript
await fetch('http://localhost:4893/api/preferences/user-123/track', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    action: 'like',
    itemId: 'restaurant-456',
    itemType: 'restaurant',
    value: 5,
    context: { location: 'downtown', time: 'evening' }
  })
});
```

### Get Recommendations
```javascript
const recs = await fetch('http://localhost:4893/api/recommendations/user-123?limit=10');
// Returns personalized recommendations based on affinity scores
```

---

## Affinity Scoring

| Action | Score Delta |
|--------|-------------|
| Like | +0.1 |
| Dislike | -0.1 |
| View | +0.02 |
| Other | +0.0 |

---

## Integration

| Service | Integration |
|---------|-------------|
| `Genie` | User preference context |
| `DO App` | Action recommendations |
| `segment-brain` | Advanced segmentation |
| `ai-intelligence` | Preference analysis |

---

## Related Services

- [decision-intelligence](decision-intelligence/) - Decision support
- [segment-brain](segment-brain/) - ML segmentation
- [ai-intelligence](ai-intelligence/) - AI analysis
