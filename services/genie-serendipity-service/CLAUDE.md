# Genie Serendipity Service - Memory Resurfacing Engine

> **Version:** 1.0  
> **Port:** 4714  
> **Status:** ✅ PRODUCTION READY

---

## 🎯 Purpose

The Serendipity Engine brings forgotten memories back to the surface at the perfect moment. It discovers meaningful connections between past experiences and present context, creating delightful "memory moments" that strengthen personal narrative and relationships.

---

## 🔄 How It Works

### Types of Memory Resurfacing

| Type | Trigger | Example |
|------|---------|---------|
| **Time-Based** | Same date in previous years | "1 year ago today, you visited Tokyo..." |
| **People-Based** | Follow-up reminders | "You mentioned Sarah 3 weeks ago..." |
| **Promise-Based** | Unfulfilled commitments | "You promised to call Mom 2 weeks ago..." |
| **Context-Based** | Location/Activity match | "You were at this café last month..." |
| **Emotional** | Mood-match resurfacing | "You were feeling stressed on this day before..." |

### Intelligence Layers

1. **Temporal Analysis** - Identifies anniversaries, milestones, recurring events
2. **Relationship Mapping** - Tracks who you talk about, how often, when last contacted
3. **Promise Detection** - NLP to identify commitments ("I'll...", "Should...", "Need to...")
4. **Context Matching** - Location, time of day, weather, activity correlations
5. **Emotional Resonance** - Mood-aware resurfacing timing

---

## 📡 API Endpoints

### Core Endpoints

```
GET  /health                    - Health check
GET  /api/serendipity           - Get all resurfaced memories
GET  /api/serendipity/time      - Time-based (anniversaries)
GET  /api/serendipity/people    - People follow-ups
GET  /api/serendipity/daily     - Daily resurfacing batch
GET  /api/serendipity/stats     - Serendipity statistics
POST /api/serendipity/feedback  - Record user feedback
```

### Response Format

```json
{
  "success": true,
  "resurfaced": [
    {
      "id": "ser_001",
      "type": "time_based",
      "trigger": "Anniversary - 1 year ago",
      "memory": {
        "id": "mem_123",
        "content": "Visited Tokyo for the first time",
        "date": "2025-06-18",
        "twinType": "personal",
        "entities": ["Tokyo", "travel"]
      },
      "resurfacedAt": "2026-06-18T09:00:00Z",
      "relevance": 0.85,
      "action": {
        "type": "reflection",
        "prompt": "Reflect on your Tokyo trip?"
      }
    }
  ]
}
```

---

## 🧠 Memory Sources

| Source | Twin Type | Content |
|--------|-----------|---------|
| Genie Memory Inbox | All | All captured memories |
| Personal Twin | personal | Life events, achievements |
| Health Twin | health | Fitness milestones, health changes |
| Financial Twin | financial | Major purchases, investments |
| Relationship Twin | relationship | Social interactions, connections |
| Business Twin | business | Work achievements, meetings |
| Creative Twin | creative | Ideas, projects, inspirations |

---

## ⚙️ Configuration

```javascript
{
  "port": 4714,
  "resurfacing": {
    "maxDaily": 10,           // Max memories per day
    "timeWindow": 30,         // Days to look back
    "minRelevance": 0.6,      // Minimum relevance score
    "diversityWeight": 0.3   // Prefer diverse types
  },
  "triggers": {
    "time": { enabled: true, weight: 0.4 },
    "people": { enabled: true, weight: 0.3 },
    "promise": { enabled: true, weight: 0.3 }
  }
}
```

---

## 🔗 Integrations

| Service | Purpose |
|---------|---------|
| MemoryOS (4703) | Fetch memories for resurfacing |
| TwinOS (4705) | Personal data & context |
| Genie Briefing (4712) | Include in daily briefings |

---

## 📁 Project Structure

```
services/genie-serendipity-service/
├── src/
│   ├── index.js              # Main Express server
│   ├── routes/
│   │   ├── serendipity.js     # Main routes
│   │   └── feedback.js       # Feedback routes
│   ├── services/
│   │   ├── resurfacer.js     # Core resurfacing engine
│   │   ├── analyzers/
│   │   │   ├── time.js        # Time-based analysis
│   │   │   ├── people.js      # People follow-ups
│   │   │   ├── promise.js     # Promise tracking
│   │   │   └── context.js     # Context matching
│   │   └── scorer.js          # Relevance scoring
│   └── utils/
│       └── memory-client.js   # MemoryOS client
├── package.json
└── CLAUDE.md
```

---

*Last Updated: June 18, 2026*
*Genie AI - Serendipity Engine*
