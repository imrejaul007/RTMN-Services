# Genie Relationship OS

**Version:** 1.0.0
**Port:** 4718
**Status:** ✅ PHASE 1 COMPLETE - Human Relationship Intelligence

---

## Overview

Genie Relationship OS is your **Personal Relationship Intelligence System**. Unlike business CRMs, this is designed for personal life — helping you maintain meaningful connections with the people who matter most.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   GENIE RELATIONSHIP OS (4718)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      PERSONAL CRM                                      │       │
│  │                                                                       │       │
│  │   People ──→ Relationships ──→ Interactions ──→ Milestones         │       │
│  │   Categories ──→ Birthday ──→ Anniversary ──→ Tags                 │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                  RELATIONSHIP HEALTH                                  │       │
│  │                                                                       │       │
│  │   Health Score ──→ Importance ──→ Recency ──→ Sentiment          │       │
│  │   Weak Ties ──→ Strong Ties ──→ At-Risk ──→ Healthy                │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                  RECONNECT REMINDERS                                   │       │
│  │                                                                       │       │
│  │   Auto-reminders ──→ Birthday ──→ Anniversary ──→ Follow-ups      │       │
│  │   Priority ──→ Urgency ──→ Templates ──→ Snooze                     │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                  GIFT INTELLIGENCE                                     │       │
│  │                                                                       │       │
│  │   Gift Ideas ──→ Occasions ──→ Budget ──→ Suggestions             │       │
│  │   Track ──→ Purchase ──→ Gifted ──→ History                        │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                  SOCIAL INSIGHTS                                      │       │
│  │                                                                       │       │
│  │   Network Analysis ──→ Patterns ──→ Suggestions ──→ Trends          │       │
│  │   Quality Time ──→ Expand Network ──→ Maintain Ties                 │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## This is NOT Business CRM

| Aspect | Business CRM | Genie Relationship OS |
|--------|------------|---------------------|
| **Purpose** | Sales, leads, transactions | Personal connections |
| **Relationships** | B2B, transactional | Family, friends, community |
| **Interactions** | Calls, meetings, deals | Calls, meals, events |
| **Metrics** | Revenue, pipeline | Relationship health |
| **Reminders** | Follow-up, deadlines | Birthdays, reconnect |

---

## Architecture

```
services/genie-relationship-os/
├── src/
│   ├── index.js              # Main entry point
│   └── routes/
│       ├── people.js          # Personal CRM
│       ├── interactions.js    # Interaction tracking
│       ├── health.js         # Relationship health
│       ├── reminders.js       # Reconnect reminders
│       ├── intelligence.js    # Social insights
│       └── gifts.js          # Gift intelligence
├── package.json
└── CLAUDE.md
```

---

## 12 Pillar Coverage

| Pillar | Supported | Features |
|--------|-----------|----------|
| **1. ❤️ Companion OS** | 🟡 Partial | Relationship building, milestones |
| **2. 🧠 Intelligence OS** | 🔜 Phase 2 | Social insights (needs Thinking Engine) |
| **3. 📚 Learning OS** | ❌ | - |
| **4. 💼 Consultant OS** | ❌ | - |
| **5. 🤖 Execution OS** | 🔜 Phase 4 | Task execution |
| **6. 🏥 Wellness OS** | 🔜 Phase 3 | Health tracking |
| **7. 💰 Money OS** | 🔜 Phase 3 | Personal finance |
| **8. 🌍 World OS** | 🟡 Partial | Connects to REZ/BuzzLocal |
| **9. 👥 Relationship OS** | ✅ Full | Personal CRM, health, reminders, gifts, insights |
| **10. 🎨 Creation OS** | 🔜 Phase 4 | Content generation |
| **11. 🏢 Business OS** | 🔜 Phase 2 | Connects to RTMN ecosystem |
| **12. 🧬 Twin OS** | 🟡 Partial | Uses existing twins |

---

## Relationship Types

### Family
- parent, mother, father
- sibling, brother, sister
- spouse, partner
- child, son, daughter
- grandparent, grandchild

### Friend
- best_friend, close_friend
- friend, acquaintance
- childhood_friend, college_friend
- neighbor

### Professional
- colleague, boss, manager
- mentor, mentee
- client, vendor
- partner, investor, advisor

### Community
- teacher, professor
- coach, doctor
- therapist, religious_leader

---

## API Endpoints

### People Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/people` | Add person |
| GET | `/api/people/:userId` | Get all people |
| GET | `/api/people/:userId/:personId` | Get person details |
| PUT | `/api/people/:userId/:personId` | Update person |
| DELETE | `/api/people/:userId/:personId` | Remove person |
| GET | `/api/people/:userId/types` | Get relationship types |
| GET | `/api/people/:userId/upcoming` | Upcoming birthdays/anniversaries |
| POST | `/api/people/:userId/:personId/milestone` | Add milestone |
| GET | `/api/people/:userId/search` | Search people |

### Interaction Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interactions` | Log interaction |
| GET | `/api/interactions/:userId` | Get interactions |
| GET | `/api/interactions/:userId/stats` | Interaction statistics |
| GET | `/api/interactions/:userId/types` | Get interaction types |
| DELETE | `/api/interactions/:userId/:id` | Delete interaction |

### Health Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/:userId/:personId` | Get relationship health |
| GET | `/api/health/:userId/overview` | Health overview |
| GET | `/api/health/:userId/weak` | Weak relationships |

### Reminder Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reminders` | Create reminder |
| GET | `/api/reminders/:userId` | Get reminders |
| PUT | `/api/reminders/:userId/:id` | Update reminder |
| POST | `/api/reminders/:userId/:id/complete` | Complete reminder |
| POST | `/api/reminders/:userId/:id/snooze` | Snooze reminder |
| POST | `/api/reminders/:userId/automatic` | Create auto-reminders |

### Intelligence Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intelligence/:userId/insights` | Relationship insights |
| GET | `/api/intelligence/:userId/suggestions` | Reconnect suggestions |
| GET | `/api/intelligence/:userId/patterns` | Social patterns |

### Gift Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gifts/idea` | Add gift idea |
| GET | `/api/gifts/:userId` | Get gift ideas |
| GET | `/api/gifts/:userId/suggest/:personId` | Gift suggestions |
| GET | `/api/gifts/:userId/upcoming` | Upcoming gift occasions |
| PUT | `/api/gifts/:userId/:id` | Update gift |
| DELETE | `/api/gifts/:userId/:id` | Delete gift |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:userId/dashboard` | Relationship dashboard |

---

## Example Usage

### Add a Person
```bash
curl -X POST http://localhost:4718/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "name": "Rahul Sharma",
    "category": "friend",
    "relationshipType": "best_friend",
    "importance": 9,
    "birthday": "1990-05-15",
    "tags": ["startup", "tech", "fitness"]
  }'
```

### Log Interaction
```bash
curl -X POST http://localhost:4718/api/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "karim",
    "personId": "person-123",
    "personName": "Rahul Sharma",
    "type": "meal",
    "channel": "in_person",
    "topic": "Caught up over dinner",
    "duration": 120,
    "sentiment": "positive"
  }'
```

### Get Relationship Health
```bash
curl "http://localhost:4718/api/health/karim/overview"
```

**Response:**
```json
{
  "success": true,
  "overview": {
    "excellent": { "count": 5, "people": [...] },
    "good": { "count": 12, "people": [...] },
    "needsAttention": { "count": 3, "people": [...] },
    "atRisk": { "count": 1, "people": [...] }
  },
  "summary": {
    "total": 21,
    "averageHealth": 72
  }
}
```

### Get Reconnect Suggestions
```bash
curl "http://localhost:4718/api/intelligence/karim/suggestions"
```

---

## Quick Start

```bash
cd services/genie-relationship-os
npm install
npm start

# Health check
curl http://localhost:4718/health

# Dashboard
curl http://localhost:4718/api/karim/dashboard
```

---

## The 6 "Nobody Else Has" Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **🧭 Life GPS** | Goal tracking | 🔜 Phase 2 |
| **📖 Life Replay** | Timeline | 🟡 Memory Graph |
| **🎓 Life University** | Learning | 🔜 Phase 3 |
| **🪞 Future Self** | Goal projection | 🔜 Phase 2 |
| **🌐 Real World Memory** | People, places, events | ✅ Relationship OS |
| **🤝 Relationship Intelligence** | Personal CRM, reconnect, gifts | ✅ Complete |

---

## Phase Status

| Phase | Services | Status |
|-------|----------|--------|
| **Phase 1** | Companion Service | ✅ COMPLETE |
| **Phase 1** | Memory Graph | ✅ COMPLETE |
| **Phase 1** | Relationship OS | ✅ COMPLETE |
| **Phase 2** | Thinking Engine | 🔜 Next |
| **Phase 2** | Consultant Agent | Pending |
| **Phase 2** | Life GPS | Pending |
| **Phase 3** | Learning OS | Pending |
| **Phase 3** | Wellness OS | Pending |
| **Phase 3** | Money OS | Pending |
| **Phase 4** | Creation OS | Pending |
| **Phase 4** | Execution Engine | Pending |
| **Phase 4** | Life University | Pending |

---

*Last Updated: June 18, 2026*
*Genie AI - Your Personal Relationship Intelligence*
