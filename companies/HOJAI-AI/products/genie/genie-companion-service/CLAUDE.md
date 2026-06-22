# Genie Companion Service

**Version:** 1.0.0
**Port:** 4716
**Status:** ✅ PHASE 1 COMPLETE - Emotional AI & Personal Connection

---
---

## 🔐 Auth (Phase 7)

This service now requires a **Bearer JWT** (CorpID-issued) on every request except `/health`, `/`, and `/ready`. Auth is enforced via `app.use(requireAuth)` from `@rtmn/shared/auth`.

**Get a token:**

```bash
# Dev shortcut (base64 JSON token — matches what requireAuth verifies):
TOKEN=$(curl -s -X POST http://localhost:4702/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"dev"}' | jq -r .token)
```

**Call this service:**

```bash
curl http://localhost:PORT/health                      # public, no token
curl http://localhost:PORT/your-endpoint \
  -H "Authorization: Bearer $TOKEN"                   # protected
```

**Disable in dev/test:** Set `SERVICE_REQUIRE_AUTH=false` env var.

See [shared/MIGRATION-GUIDE.md](../../shared/MIGRATION-GUIDE.md) for the full `@rtmn/shared/auth` pattern and the canonical thin-shim approach.

## Overview

Genie Companion Service is the **heart of Genie's personal connection** with users. It builds emotional understanding, tracks moods, generates journals, remembers personal stories, and creates a lifelong companion relationship.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GENIE COMPANION SERVICE (4716)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    EMOTIONAL INTELLIGENCE                              │       │
│  │                                                                       │       │
│  │   Mood Tracking ──→ Emotion Analysis ──→ Response Generation         │       │
│  │   Pattern Detection ──→ Wellbeing Score ──→ Support Suggestions      │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    PERSONAL JOURNALING                                 │       │
│  │                                                                       │       │
│  │   Daily Journal ──→ AI Insights ──→ Timeline ──→ Reflections         │       │
│  │   Auto-generation ──→ Sentiment Analysis ──→ Gratitude Tracking      │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    LIFE STORY MEMORY                                  │       │
│  │                                                                       │       │
│  │   Stories ──→ Milestones ──→ Connections ──→ Anniversaries         │       │
│  │   Categories ──→ People ──→ Locations ──→ Emotions                   │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    RELATIONSHIP BUILDING                              │       │
│  │                                                                       │       │
│  │   XP System ──→ Levels ──→ Milestones ──→ Daily Check-ins          │       │
│  │   Companion Style ──→ Personality Traits ──→ Interaction History    │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
services/genie-companion-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── routes/
│   │   ├── companion.js      # Companion profile & interactions
│   │   ├── mood.js          # Mood tracking
│   │   ├── journal.js        # Journaling
│   │   ├── story.js         # Life stories
│   │   └── emotion.js       # Emotional intelligence
│   └── models/
│       ├── mood.js           # Mood data model
│       ├── journal.js        # Journal data model
│       └── story.js          # Story data model
├── package.json
└── CLAUDE.md
```

---

## 12 Pillar Coverage

| Pillar | Supported | Features |
|--------|-----------|----------|
| **1. ❤️ Companion OS** | ✅ Full | Emotional AI, mood tracking, journaling, relationship memory, life timeline, daily check-ins, celebrations, reflection prompts |
| **2. 🧠 Intelligence OS** | 🔜 Phase 2 | Deep thinking, brainstorming (needs Thinking Engine) |
| **3. 📚 Learning OS** | 🔜 Phase 3 | Languages, business school (needs Learning OS) |
| **4. 💼 Consultant OS** | 🔜 Phase 2 | Domain expertise (needs Consultant Agent) |
| **5. 🤖 Execution OS** | 🔜 Phase 4 | Task execution (needs Execution Engine) |
| **6. 🏥 Wellness OS** | 🔜 Phase 3 | Health tracking (needs Wellness OS) |
| **7. 💰 Money OS** | 🔜 Phase 3 | Personal finance (needs Money OS) |
| **8. 🌍 World OS** | 🔜 Phase 2 | Discovery (connects to REZ/BuzzLocal) |
| **9. 👥 Relationship OS** | 🟡 Partial | Personal stories, people tracking (needs Relationship OS) |
| **10. 🎨 Creation OS** | 🔜 Phase 4 | Content generation (needs Creation OS) |
| **11. 🏢 Business OS** | 🔜 Phase 2 | Business metrics (connects to RTMN) |
| **12. 🧬 Twin OS** | 🟡 Partial | Uses TwinOS Hub for storage |

---

## Mood Categories

### Positive Moods (😊)
| Mood | Emoji | Description |
|------|-------|-------------|
| happy | 😊 | General happiness |
| excited | 🎉 | High energy positive |
| grateful | 🙏 | Appreciation |
| calm | 😌 | Peaceful |
| confident | 💪 | Self-assured |
| loved | ❤️ | Feeling loved |
| motivated | 🚀 | Driven |
| content | ☺️ | Satisfied |
| hopeful | 🌅 | Optimistic |
| proud | 🏆 | Accomplished |

### Neutral Moods (😐)
| Mood | Emoji | Description |
|------|-------|-------------|
| neutral | 😐 | Neither good nor bad |
| tired | 😴 | Low energy |
| focused | 🎯 | Concentrated |
| bored | 😐 | Understimulated |
| curious | 🤔 | Interested |

### Negative Moods (😢)
| Mood | Emoji | Description |
|------|-------|-------------|
| sad | 😢 | Down |
| anxious | 😰 | Worried |
| stressed | 😫 | Overwhelmed |
| angry | 😠 | Frustrated |
| lonely | 😔 | Isolated |
| scared | 😨 | Fearful |
| frustrated | 😤 | Blocked |
| disappointed | 😞 | Let down |
| overwhelmed | 😵 | Too much |
| hopeless | 😩 | No hope |

---

## API Endpoints

### Companion Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companion/:userId/profile` | Get companion relationship profile |
| PUT | `/api/companion/:userId/style` | Update companion's communication style |
| POST | `/api/companion/:userId/interact` | Record a companion interaction |
| POST | `/api/companion/:userId/milestone` | Record a relationship milestone |
| GET | `/api/companion/:userId/checkin` | Get a check-in prompt |
| POST | `/api/companion/:userId/checkin` | Submit a check-in response |
| GET | `/api/companion/:userId/celebrate` | Get celebration content |

### Mood Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mood/categories` | Get all mood categories |
| POST | `/mood/track` | Track a new mood entry |
| GET | `/mood/:userId` | Get mood history |
| GET | `/mood/:userId/today` | Get today's mood |
| GET | `/mood/:userId/trend` | Get mood trend analysis |
| POST | `/mood/:userId/insight` | Get AI mood insights |
| PUT | `/mood/:userId/:moodId` | Update mood entry |
| DELETE | `/mood/:userId/:moodId` | Delete mood entry |

### Journal Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/journal/types` | Get journal types |
| GET | `/journal/:userId` | Get all journals |
| POST | `/journal/:userId` | Create journal entry |
| GET | `/journal/:userId/:journalId` | Get specific journal |
| PUT | `/journal/:userId/:journalId` | Update journal |
| DELETE | `/journal/:userId/:journalId` | Delete journal |
| GET | `/journal/:userId/date/:date` | Get journal for date |
| GET | `/journal/:userId/today` | Get today's journal |
| POST | `/journal/:userId/auto` | Auto-generate journal |
| GET | `/journal/:userId/insights` | Get AI insights |
| GET | `/journal/:userId/timeline` | Get journal timeline |
| GET | `/journal/:userId/prompts/:type` | Get prompts |

### Story Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/story/categories` | Get story categories |
| GET | `/story/:userId` | Get all stories |
| POST | `/story/:userId` | Create story |
| GET | `/story/:userId/:storyId` | Get specific story |
| PUT | `/story/:userId/:storyId` | Update story |
| DELETE | `/story/:userId/:storyId` | Delete story |
| POST | `/story/:userId/:storyId/favorite` | Toggle favorite |
| GET | `/story/:userId/milestones` | Get milestones |
| GET | `/story/:userId/favorites` | Get favorites |
| GET | `/story/:userId/timeline` | Get timeline |
| GET | `/story/:userId/anniversary` | Get anniversaries |
| GET | `/story/:userId/search` | Search stories |
| GET | `/story/:userId/stats` | Get statistics |

### Emotion Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/emotion/analyze` | Analyze text for emotions |
| POST | `/emotion/process` | Process emotional expression |
| GET | `/emotion/:userId/history` | Get emotional history |
| GET | `/emotion/:userId/insights` | Get emotional insights |
| POST | `/emotion/:userId/check` | Check wellbeing |
| POST | `/emotion/:userId/support` | Get emotional support |

---

## Companion XP & Levels

| Level | XP Required | Milestones Unlocked |
|-------|-------------|-------------------|
| 1 | 0 | Basic chat |
| 2 | 100 | Basic check-ins |
| 3 | 250 | Journal prompts |
| 4 | 500 | Mood insights |
| 5 | 1000 | Deep conversations |
| 6 | 2000 | Milestone celebrations |
| 7 | 4000 | Advanced insights |
| 8 | 7000 | Future self analysis |
| 9 | 10000 | Full integration |
| 10 | 15000 | Lifelong companion |

---

## Example Usage

### Track Mood
```bash
curl -X POST http://localhost:4716/mood/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "mood": "happy",
    "intensity": 8,
    "causes": ["great meeting", "productive day"],
    "energy": 7,
    "sleep": 8
  }'
```

### Create Journal
```bash
curl -X POST http://localhost:4716/journal/karim \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "mood": "happy",
    "content": "Had an amazing day! Landed a new client and feeling grateful.",
    "highlights": ["New client signed", "Team lunch"],
    "gratitude": ["Health", "Supportive team", "Growing business"],
    "moodScore": 8
  }'
```

### Record Life Story
```bash
curl -X POST http://localhost:4716/story/karim \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Major Client",
    "content": "Signed our biggest client today after 6 months of outreach...",
    "date": "2026-06-18",
    "category": "achievement",
    "people": ["Rejaul", "Rahul"],
    "isMilestone": true,
    "impact": "transformative"
  }'
```

### Check Wellbeing
```bash
curl -X POST http://localhost:4716/emotion/karim/check
```

**Response:**
```json
{
  "success": true,
  "wellbeing": {
    "score": 7.5,
    "status": "good",
    "message": "You're in a good space emotionally. Keep it up!",
    "recentHistory": 15
  }
}
```

---

## Quick Start

```bash
cd products/genie/genie-companion-service
npm install
npm start

# Health check
curl http://localhost:4716/health

# Readiness check
curl http://localhost:4716/ready
```

---

## Environment Variables

```env
PORT=4716
NODE_ENV=development
```

---

## Integration with Genie Ecosystem

| Service | Port | Connection |
|---------|------|-----------|
| MemoryOS | 4703 | Stores memories |
| TwinOS Hub | 4705 | Syncs with twins |
| Genie Gateway | 4701 | Main AI orchestrator |
| Genie Briefing | 4712 | Morning/evening check-ins |
| Genie Memory Inbox | 4710 | Captures initial memories |
| Genie Search | 4713 | Searches stories/journals |

---

## The 6 "Nobody Else Has" Features

| Feature | Status | Implementation |
|---------|--------|----------------|
| **🧭 Life GPS** | 🔜 Phase 2 | Goal tracking needed |
| **📖 Life Replay** | 🟡 Partial | Journal timeline exists |
| **🎓 Life University** | 🔜 Phase 3 | Learning OS needed |
| **🪞 Future Self** | 🔜 Phase 2 | Life GPS needed |
| **🌐 Real World Memory** | 🟡 Partial | Story system exists |
| **🤝 Relationship Intelligence** | 🟡 Partial | Basic people tracking |

---

## Statistics

| Metric | Value |
|--------|-------|
| Mood Categories | 25 |
| Journal Types | 6 |
| Story Categories | 10 |
| Emotion Types | 7 |
| Companion Levels | 10 |
| API Endpoints | 50+ |

---

## Next Steps

- [ ] Connect to MemoryOS for persistent storage
- [ ] Connect to TwinOS Hub for personal twin sync
- [ ] Add voice input for journaling
- [ ] Build timeline visualization
- [ ] Add milestone celebrations
- [ ] Integrate with Genie Gateway

---

## Phase Status

| Phase | Services | Status |
|-------|----------|--------|
| **Phase 1** | Companion Service | ✅ COMPLETE |
| **Phase 1** | Memory Graph | 🔜 Next |
| **Phase 1** | Relationship OS | 🔜 Next |
| **Phase 2** | Thinking Engine | Pending |
| **Phase 2** | Consultant Agent | Pending |
| **Phase 2** | Life GPS | Pending |
| **Phase 3** | Learning OS | Pending |
| **Phase 3** | Wellness OS | Pending |
| **Phase 3** | Money OS | Pending |
| **Phase 4** | Creation OS | Pending |
| **Phase 4** | Execution Engine | Pending |
| **Phase 4** | Life University | Pending |

---

*Last Updated: June 22, 2026*
*Genie AI - Your Personal Companion*
