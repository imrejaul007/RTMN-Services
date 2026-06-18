# Genie AI & RAZO Ecosystem - Complete Documentation

> **Version:** 2.0  
> **Last Updated:** June 18, 2026  
> **Status:** ✅ FULLY DOCUMENTED

---

## 🎯 Executive Summary

The **Genie AI & RAZO Ecosystem** is the Consumer-facing layer of RTMN, providing personal AI assistance across all devices. It consists of **10 Genie Voice Services** and **RAZO Keyboard** for communication.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CONSUMER TRIANGLE                                             │
│                                                                                 │
│     GENIE (Think)  ←─────→  RAZO (Communicate)  ←─────→  DO APP (Act)         │
│        4701                   4725                          3001                 │
│          ↑                        ↑                           ↑                  │
│          └────────────────────────┼───────────────────────────┘                  │
│                                   │                                               │
│                           ┌───────▼───────┐                                     │
│                           │  TwinOS Hub   │                                     │
│                           │    4705       │                                     │
│                           │  86+ Twins    │                                     │
│                           └───────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Service Overview

| Service | Port | Category | Purpose |
|---------|------|----------|---------|
| **Genie Wake Word** | 4767 | Voice | "Hey Genie" / "हे जिनी" detection |
| **Genie Listening Modes** | 4768 | Voice | Manual, Continuous, Passive, Smart |
| **Genie Device Integration** | 4769 | Voice | Multi-device support |
| **Genie Calendar** | 4709 | Personal | Scheduling, conflicts, reminders |
| **Genie Gateway** | 4711 | Personal | Personal AI orchestrator |
| **Genie Memory Inbox** | 4710 | Memory | Universal memory capture |
| **Genie Briefing** | 4712 | Memory | Morning/Evening/Weekly briefings |
| **Genie Universal Search** | 4713 | Memory | Cross-source search |
| **Genie Serendipity** | 4714 | Memory | Memory resurfacing engine |
| **Genie Smart Forgetting** | 4715 | Memory | Auto-archive, privacy |
| **RAZO Keyboard** | 4725 | Communication | 22 intents, multi-channel |

---

## 🧠 1. Genie Wake Word Service

**Port:** 4767 | **Status:** ✅ Production Ready

### Overview
Detects wake words "Hey Genie" and "हे जिनी" (Hindi) for hands-free voice activation.

### Supported Wake Words
| Language | Phrases |
|----------|---------|
| English | "Hey Genie", "Hi Genie", "Ok Genie" |
| Hindi | "हे जिनी", "अरे जिनी", "भाई जिनी" |

### API Endpoints
```
GET  /health                    # Health check
GET  /api/detections            # Get detection logs
GET  /api/statistics            # Detection statistics
POST /api/listen/start          # Start listening
POST /api/listen/stop           # Stop listening
WS   /ws                        # WebSocket for audio
```

### Quick Start
```bash
cd services/genie-wake-word-service
npm start  # Port 4767
```

---

## 🎚️ 2. Genie Listening Modes Service

**Port:** 4768 | **Status:** ✅ Production Ready

### Overview
Manages different listening modes for different contexts and battery preferences.

### Modes
| Mode | Description | Battery Impact |
|------|-------------|----------------|
| **Manual** | Tap-to-talk | None |
| **Continuous** | Always listening | High |
| **Passive** | Ambient context | Low |
| **Smart** | Adaptive based on context | Medium |

### API Endpoints
```
GET  /health                         # Health check
GET  /api/modes                      # List all modes
POST /api/modes/switch               # Switch mode
     Body: { mode: "smart", clientId }
GET  /api/recommend?deviceType=watch # Get mode recommendation
```

### Device Recommendations
```javascript
{
  smartphone: 'smart',
  smartwatch: 'passive',
  earbuds: 'continuous',
  car: 'continuous',
  laptop: 'smart',
  desktop: 'manual'
}
```

---

## 📱 3. Genie Device Integration Service

**Port:** 4769 | **Status:** ✅ Production Ready

### Overview
Connects phones, watches, earbuds, glasses, cars for unified Genie experience.

### Supported Devices
| Device | Brands |
|--------|--------|
| Smartphone | iOS, Android |
| Smartwatch | Apple Watch, Galaxy Watch, Wear OS |
| Earbuds | AirPods, Galaxy Buds, Sony |
| Smart Glasses | Ray-Ban Meta, Snap Spectacles |
| Car | Android Auto, CarPlay, Tesla |
| Laptop | Windows, macOS, Chrome OS |

### API Endpoints
```
GET  /health              # Health check
GET  /api/devices         # List connected devices
POST /api/devices         # Register device
     Body: { type: "smartphone", userId }
GET  /api/types           # List supported device types
DELETE /api/devices/:id   # Remove device
```

---

## 📅 4. Genie Calendar Service

**Port:** 4709 | **Status:** ✅ Production Ready

### Overview
Personal calendar with events, scheduling, conflict detection, availability, and reminders.

### Event Types
```javascript
{
  MEETING: 'meeting',
  REMINDER: 'reminder',
  TASK: 'task',
  BLOCKED: 'blocked',
  OUT_OF_OFFICE: 'out_of_office',
  TRAVEL: 'travel',
  FOCUS: 'focus',
  BREAK: 'break'
}
```

### Event Status
```javascript
{
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
}
```

### API Endpoints
```
# Events CRUD
GET    /api/events                    # List events (with filters)
GET    /api/events/today              # Today's events
GET    /api/events/upcoming           # Upcoming events
GET    /api/events/search?q=meeting   # Search events
GET    /api/events/:id                # Get single event
POST   /api/events                    # Create event
PUT    /api/events/:id                # Update event
DELETE /api/events/:id                # Delete event

# Availability
GET    /api/availability?userId=&date=&duration=60  # Find available slots
POST   /api/availability/find        # Find best meeting time
     Body: { userIds: [], duration: 60, preference: "morning" }

# Conflicts
POST   /api/conflicts                 # Check conflicts
GET    /api/conflicts/:userId         # Get all user conflicts

# Reminders
GET    /api/events/:id/reminders      # Get reminders
POST   /api/events/:id/reminders     # Add reminder

# Views
GET    /api/day/:date                 # Day summary
GET    /api/week?startDate=           # Week summary

# Statistics
GET    /api/statistics                # Calendar statistics
GET    /api/types                     # Event types & statuses
```

### Example: Create Event
```bash
curl -X POST http://localhost:4709/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Standup",
    "startTime": "2026-06-18T09:00:00Z",
    "endTime": "2026-06-18T09:30:00Z",
    "type": "meeting",
    "location": "Zoom",
    "attendees": ["rahul@rez.money"]
  }'
```

---

## 🚪 5. Genie Gateway

**Port:** 4711 | **Status:** ✅ Production Ready

### Overview
Central orchestrator for Genie Personal AI. Routes requests to Memory, Twins, Calendar, Briefing services.

### Connected Services
| Service | Port | Purpose |
|---------|------|---------|
| MemoryOS | 4703 | Personal memory storage |
| TwinOS Hub | 4705 | Digital twins |
| Genie Calendar | 4709 | Calendar & scheduling |
| Genie Briefing | 4712 | Daily briefings |
| Personal Twin | 4708 | User profile twin |
| Financial Twin | 4715 | Finance tracking |
| Health Twin | 4717 | Health monitoring |

### API Endpoints
```
# Core
GET  /health              # Health check
GET  /ready               # Service readiness
GET  /api/services        # List connected services

# User Context
GET  /api/user/:userId/context        # Get full context from all services
GET  /api/user/:userId/preferences   # Get user preferences
PUT  /api/user/:userId/preferences   # Update preferences

# AI Query
POST /api/query                        # Main AI query endpoint
   Body: { query, userId?, sessionId?, context? }

# Twins
GET  /api/twins/:userId               # Get all twins data

# Briefing
GET  /api/briefing/:userId?type=morning # Get daily briefing

# Memory
POST /api/memory                       # Store memory
   Body: { userId, content, type? }
GET  /api/memory/:userId              # Get memories

# Search
GET  /api/search?q=query&type=all     # Search across services

# Broadcast
POST /api/broadcast                    # Broadcast to all twins
   Body: { userId, event, data }
```

### Example: Query Genie
```bash
curl -X POST http://localhost:4711/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is my schedule for today?",
    "userId": "user_123"
  }'
```

**Response:**
```json
{
  "success": true,
  "response": {
    "type": "calendar",
    "message": "You have 2 meetings scheduled today.",
    "data": {
      "meetings": ["Standup at 10 AM", "Product review at 3 PM"]
    }
  }
}
```

---

## 🧠 6. Genie Memory Inbox Service

**Port:** 4710 | **Status:** ✅ Production Ready

### Overview
Universal memory capture - everything lands here first, then AI auto-classifies into Twins.

### Capture Types
| Type | Description |
|------|-------------|
| voice | Voice notes |
| text | Text notes |
| image | Photos/screenshots |
| document | PDFs, files |
| link | Bookmarks/URLs |
| email | Email capture |
| whatsapp | WhatsApp messages |
| meeting | Meeting notes |
| expense | Receipts/bills |
| reminder | Reminders |
| task | Tasks |

### Default Categories
| Category | Icon | Color |
|----------|------|-------|
| Personal | 👤 | #6366f1 |
| Work | 💼 | #3b82f6 |
| Health | ❤️ | #ef4444 |
| Finance | 💰 | #10b981 |
| Travel | ✈️ | #f59e0b |
| Family | 👨‍👩‍👧 | #ec4899 |
| Ideas | 💡 | #8b5cf6 |
| Important | ⭐ | #eab308 |
| To Do | 📋 | #14b8a6 |
| Later | 📌 | #6b7280 |

### API Endpoints
```
# Capture
POST /api/capture/quick               # Quick capture
POST /api/capture/voice              # Voice note
POST /api/capture/text               # Text note
POST /api/capture/image              # Image upload
POST /api/capture/link               # URL bookmark
POST /api/capture/whatsapp           # WhatsApp message
POST /api/capture/meeting            # Meeting notes
POST /api/capture/expense            # Receipt/bill

# Memories
GET  /api/memories                    # List memories
GET  /api/memories/:id                # Get memory
PUT  /api/memories/:id                # Update memory
DELETE /api/memories/:id              # Delete memory
POST /api/memories/:id/classify       # Reclassify

# Timeline
GET  /api/timeline                    # Chronological view
GET  /api/timeline/by-date            # By date range
GET  /api/timeline/by-category        # By category

# Search
GET  /api/search?q=query              # Search memories

# Categories
GET  /api/categories                  # List categories
POST /api/categories                  # Create category
DELETE /api/categories/:id            # Delete category

# Tags
GET  /api/tags                         # List tags
POST /api/tags                         # Create tag

# Reminders
GET  /api/reminders                   # List reminders
POST /api/reminders                   # Create reminder
PATCH /api/reminders/:id              # Update reminder

# Statistics
GET  /api/stats                       # Memory statistics
```

---

## 📋 7. Genie Briefing Service

**Port:** 4712 | **Status:** ✅ Production Ready

### Overview
Daily briefings: Morning, Evening, and Weekly summaries.

### Briefing Types
| Type | Trigger | Content |
|------|---------|---------|
| **Morning** | Before noon | Weather, schedule, tasks, priorities |
| **Evening** | After noon | Day summary, completed tasks, tomorrow |
| **Weekly** | Sundays | Week overview, highlights, metrics |

### Morning Briefing Sections
```javascript
{
  type: 'weather',
  title: 'Weather',
  icon: '☀️',
  content: 'Sunny, 28°C in Mumbai',
  details: { temperature: 28, condition: 'sunny', location: 'Mumbai' }
},
{
  type: 'calendar',
  title: "Today's Schedule",
  icon: '📅',
  items: [
    { time: '10:00 AM', title: 'Team Standup', location: 'Zoom' },
    { time: '2:00 PM', title: 'Client Call', location: 'Google Meet' }
  ]
},
{
  type: 'tasks',
  title: 'Pending Tasks',
  icon: '📋',
  items: [
    { task: 'Review Q2 report', priority: 'high', due: 'Today' },
    { task: 'Send proposal to client', priority: 'high', due: 'Today' }
  ]
},
{
  type: 'health',
  title: 'Health Summary',
  icon: '❤️',
  metrics: [
    { metric: 'Steps', value: '7,234', target: '10,000', progress: 72 },
    { metric: 'Sleep', value: '7.5 hrs', target: '8 hrs', progress: 94 }
  ]
},
{
  type: 'priorities',
  title: 'Suggested Priorities',
  icon: '⭐',
  items: [
    { priority: 1, task: 'Client presentation prep' },
    { priority: 2, task: 'Review budget proposal' }
  ]
}
```

### API Endpoints
```
# Briefing
GET  /api/briefing/morning?userId=&date=  # Morning briefing
GET  /api/briefing/evening?userId=&date=  # Evening briefing
GET  /api/briefing/weekly?userId=         # Weekly briefing
GET  /api/briefing/today?userId=          # Auto-detect briefing type
GET  /api/briefing/:id                    # Get specific briefing

# History
GET  /api/briefing/history?userId=&type=&limit=10  # Briefing history

# Subscriptions
POST /api/subscribe                       # Subscribe to briefings
     Body: { userId, type: "both", time: "08:00", channels: ["whatsapp"] }
GET  /api/subscriptions?userId=           # Get subscriptions
DELETE /api/subscribe/:id                 # Unsubscribe
```

---

## 🔍 8. Genie Universal Search Service

**Port:** 4713 | **Status:** ✅ Production Ready

### Overview
Search across everything: Memories, Twins, Files, People, Calendar, Tasks.

### Search Sources
| Source | Description |
|--------|-------------|
| memories | From Memory Inbox |
| twins | Personal, Health, Financial, Relationship |
| calendar | Events and appointments |
| tasks | Tasks and projects |
| people | Contacts and relationships |
| knowledge | Articles and guides |

### API Endpoints
```
# Main Search
GET  /api/search?q=query&sources=&limit=20  # Universal search
GET  /api/search/semantic?q=query          # AI semantic search

# Source-Specific
GET  /api/search/memories?q=query           # Search memories
GET  /api/search/twins?q=query             # Search twins
GET  /api/search/people?q=query           # Search people
GET  /api/search/health?q=query            # Search health
GET  /api/search/finance?q=query          # Search finance
GET  /api/search/calendar?q=query         # Search calendar
GET  /api/search/tasks?q=query            # Search tasks

# Saved & Recent
POST /api/search/saved                     # Save search
     Body: { userId, name, query, filters }
GET  /api/search/saved?userId=            # Get saved searches
DELETE /api/search/saved/:id              # Delete saved search
GET  /api/search/recent?userId=&limit=10  # Recent searches
DELETE /api/search/recent?userId=         # Clear recent

# Suggestions
GET  /api/search/suggestions?q=query      # Get suggestions
GET  /api/search/trending                 # Trending searches

# Index Management
POST /api/index/rebuild                   # Rebuild search index
POST /api/index/add                       # Add to index
```

### Example: Universal Search
```bash
curl "http://localhost:4713/api/search?q=meeting&sources=memories,calendar,tasks&limit=10"
```

---

## ✨ 9. Genie Serendipity Service

**Port:** 4714 | **Status:** ✅ Production Ready

### Overview
Memory resurfacing engine - surfaces old memories at the right time.

### Types of Resurfacing
| Type | Trigger | Example |
|------|---------|---------|
| **Time-Based** | Same date in previous years | "1 year ago today, you visited Tokyo..." |
| **People-Based** | Follow-up reminders | "You mentioned Sarah 3 weeks ago..." |
| **Promise-Based** | Unfulfilled commitments | "You promised to call Mom 2 weeks ago..." |
| **Context-Based** | Location/Activity match | "You were at this café last month..." |
| **Emotional** | Mood-match | "You were stressed on this day before..." |

### API Endpoints
```
# Main
GET  /api/serendipity?userId=&limit=5   # Get resurfaced memories
GET  /api/serendipity/time?period=month # Time-based resurfacing
GET  /api/serendipity/context            # Context-based resurfacing
GET  /api/serendipity/people?limit=5    # People follow-ups
GET  /api/serendipity/daily             # Daily resurfacing batch

# Feedback
POST /api/serendipity/:id/feedback      # Record feedback
     Body: { useful: true, userId }
GET  /api/serendipity/history?userId=&limit=50  # Resurfacing history

# Subscriptions
POST /api/subscribe                      # Subscribe to serendipity
     Body: { userId, frequency: "daily", channels: ["whatsapp"] }
GET  /api/subscriptions?userId=          # Get subscriptions
```

### Example Response
```json
{
  "success": true,
  "items": [
    {
      "id": "ser-001",
      "type": "anniversary",
      "trigger": "same-day-last-year",
      "title": "On this day last year: CorpPerks",
      "description": "You noted: Launch a corporate perks platform",
      "icon": "📅",
      "action": "Review progress"
    }
  ],
  "count": 1
}
```

---

## 🗑️ 10. Genie Smart Forgetting Service

**Port:** 4715 | **Status:** ✅ Production Ready

### Overview
Intelligent memory archival system - determines what to keep, archive, or delete.

### Memory Lifecycle
```
NEW → ACTIVE → DORMANT → ARCHIVED → DELETED
 │                    │
 └── Not accessed 30+ days
```

### Memory States
| State | Description |
|-------|-------------|
| **ACTIVE** | Frequently accessed, important |
| **DORMANT** | Not accessed in a while |
| **ARCHIVED** | Moved to cold storage |
| **DELETED** | Permanently removed |

### Default Retention Rules
```javascript
{
  timeRules: {
    lowImportanceAge: 90,      // Archive after 90 days
    mediumImportanceAge: 180,  // Archive after 180 days
    highImportanceAge: 365,   // Archive after 1 year
    archivedAge: 730           // Delete archived after 2 years
  },
  archivePolicy: {
    lowImportance: true,
    mediumImportance: true,
    highImportance: false,  // Never archive high importance
    financial: false,         // Never archive financial
    health: false            // Never archive health
  }
}
```

### Auto-Redaction Patterns
| Data Type | Pattern | Example |
|-----------|---------|---------|
| Card Numbers | `****-****-****-1234` | 4 digits preserved |
| Phone Numbers | `***` | Full masked |
| Amounts | `$***` | Only symbol preserved |

### API Endpoints
```
# Forgetting
GET  /api/forgetting/analyze?userId=     # Analyze all memories
POST /api/forgetting/suggest             # Get suggestions for memories
     Body: { memories: [...] }
POST /api/forgetting/keep                # Mark as "keep forever"
     Body: { memoryId, reason }
POST /api/forgetting/archive             # Archive memory
     Body: { memoryId, options: { redactSensitive: true } }
POST /api/forgetting/delete              # Schedule deletion
     Body: { memoryId, reason }
GET  /api/forgetting/stats               # Get statistics

# Archive
GET  /api/archive?userId=&page=1&limit=20  # List archived
GET  /api/archive/:id?restore=true          # Get/restore archive
POST /api/archive/:id/restore               # Restore from archive
DELETE /api/archive/:id                    # Permanently delete
GET  /api/archive/stats                    # Archive statistics
POST /api/archive/cleanup                  # Trigger cleanup

# Config
GET  /api/config                           # Get configuration
PUT  /api/config                           # Update configuration
GET  /api/config/retention                 # Get retention policy
PUT  /api/config/retention                 # Update retention policy
GET  /api/config/presets                   # Get presets
POST /api/config/presets/:presetId        # Apply preset
POST /api/config/reset                    # Reset to defaults
```

### Configuration Presets
| Preset | Description |
|--------|-------------|
| **minimal** | Only archive very old, low-importance |
| **balanced** | Smart archive based on importance |
| **aggressive** | Archive more aggressively |
| **privacy** | Maximum privacy with redaction |

---

## ⌨️ 11. RAZO Keyboard - Communication OS

**Port:** 4725 | **Status:** ✅ Production Ready

### Overview
The keyboard that thinks - transforms text into actionable intents across WhatsApp, Telegram, SMS, Email.

### Architecture
```
User Input → Intent Router → Context Engine → Action Engine → Services
                     ↓
              Channel Bridge → WhatsApp/Telegram/SMS/Email
```

### 22 Supported Intents

#### Commerce Intents
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| order_food | order, pizza, delivery | do-app | /api/orders |
| book_hotel | hotel, room, booking | do-app | /api/hotel-booking |
| book_appointment | appointment, schedule, salon | do-app | /api/appointments |
| purchase_subscription | subscribe, premium, plan | do-app | /api/subscriptions |

#### Financial Intents
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| make_payment | pay, transfer, upi, ₹ | sutar | /api/escrow/transfer |
| track_expense | expense, spent, bill | financial-twin | /api/expenses |
| check_balance | balance, account, funds | financial-twin | /api/accounts/balance |
| apply_loan | loan, credit, emi | financial-os | /api/loans/apply |

#### Communication Intents
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| send_message | send, whatsapp, sms, email | channel | /api/message/send |
| schedule_meeting | meeting, calendar, zoom | calendar | /api/events |

#### Information Intents
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| ask_genie | genie, what, how, why | genie | /api/query |
| get_status | status, track, where | do-app | /api/status |
| find_service | find, search, nearby | discovery | /api/search |
| get_recommendation | recommend, suggest, also | copilot | /api/recommendations |
| check_availability | available, slots, open | industry-os | /api/availability |

#### Action Intents
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| track_order | track, delivery, eta | do-app | /api/orders/track |
| cancel_order | cancel, stop, abort | do-app | /api/orders/cancel |
| request_refund | refund, return, money back | sutar | /api/refunds |
| file_complaint | complaint, issue, problem | support | /api/complaints |
| update_profile | update, change, edit | corpid | /api/profile |

#### Miscellaneous
| Intent | Keywords | Action | Endpoint |
|--------|----------|--------|----------|
| get_insurance | insurance, policy, coverage | insurance-os | /api/insurance/quote |

### Channel Bridge
Supports multiple messaging channels:

| Channel | Integration |
|---------|-------------|
| **WhatsApp** | Meta Business API |
| **Telegram** | Bot API |
| **SMS** | Twilio |
| **Email** | SMTP/Nodemailer |

### API Endpoints
```
# Core
GET  /health              # Health check
GET  /ready               # Readiness

# Intent
POST /api/intent/detect   # Detect intent from text
     Body: { text, userId?, sessionId? }

# Messages
POST /api/message/send    # Send message
     Body: { channel, to, message, options? }
POST /api/message/broadcast # Broadcast to multiple

# Sessions
POST /api/session/create  # Create session
GET  /api/session/:id     # Get session
PUT  /api/session/:id     # Update session
DELETE /api/session/:id   # End session

# Webhooks
GET  /api/webhook/whatsapp # WhatsApp webhook verification
POST /api/webhook/whatsapp # WhatsApp incoming messages
GET  /api/webhook/telegram # Telegram webhook
POST /api/webhook/telegram # Telegram incoming
```

### Example: Intent Detection
```bash
curl -X POST http://localhost:4725/api/intent/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Order pizza from Dominos",
    "userId": "user_123"
  }'
```

**Response:**
```json
{
  "success": true,
  "intent": "order_food",
  "confidence": 0.89,
  "entities": {
    "item": "pizza",
    "restaurant": "Dominos"
  },
  "action": "do-app",
  "endpoint": "/api/orders"
}
```

---

## 🔗 Service Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
    ┌───────────┐          ┌───────────┐          ┌───────────┐
    │   GENIE   │          │   RAZO    │          │   DO APP  │
    │  (Think)  │          │ (Communicate)│        │   (Act)   │
    └─────┬─────┘          └─────┬─────┘          └─────┬─────┘
          │                       │                       │
          │    ┌──────────────────┼──────────────────┐    │
          │    │                  │                  │    │
          ▼    ▼                  ▼                  ▼    ▼
    ┌─────────────────────────────────────────────────────────┐
    │                     TwinOS Hub (4705)                    │
    │                   86+ Digital Twins                     │
    ├─────────────────────────────────────────────────────────┤
    │  Personal Twin │ Health Twin │ Financial Twin │ +more │
    └─────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────┐
    │                     MemoryOS (4703)                      │
    │                  Personal AI Memory                       │
    ├─────────────────────────────────────────────────────────┤
    │  Memory Inbox │ Briefing │ Search │ Serendipity │      │
    └─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
RTMN/
├── services/
│   ├── genie-wake-word-service/      # Port 4767
│   │   ├── src/index.js
│   │   └── package.json
│   │
│   ├── genie-listening-modes/       # Port 4768
│   │   ├── src/index.js
│   │   └── package.json
│   │
│   ├── genie-device-integration/    # Port 4769
│   │   ├── src/index.js
│   │   └── package.json
│   │
│   ├── genie-calendar-service/      # Port 4709
│   │   ├── src/index.js
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── genie-gateway/                # Port 4711
│   │   ├── src/index.js
│   │   ├── package.json
│   │   ├── CLAUDE.md
│   │   └── FEATURES.md
│   │
│   ├── genie-memory-inbox/           # Port 4710
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   │   ├── capture.js
│   │   │   │   ├── memories.js
│   │   │   │   ├── timeline.js
│   │   │   │   └── search.js
│   │   │   └── services/
│   │   │       └── classifier.js
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── genie-briefing-service/       # Port 4712
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── briefings/
│   │   │   └── templates/
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── genie-universal-search/       # Port 4713
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── search/
│   │   │   │   ├── memory.js
│   │   │   │   ├── twin.js
│   │   │   │   └── semantic.js
│   │   │   └── indexing/
│   │   │       └── manager.js
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── genie-serendipity-service/    # Port 4714
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   ├── genie-smart-forgetting-service/ # Port 4715
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   │   ├── forgetting.js
│   │   │   │   ├── archive.js
│   │   │   │   └── config.js
│   │   │   └── services/
│   │   │       └── analyzers/
│   │   │           └── importance.js
│   │   ├── package.json
│   │   └── CLAUDE.md
│   │
│   └── razo-keyboard/                # Port 4725
│       ├── src/
│       │   ├── index.js
│       │   ├── intents/
│       │   │   └── router.js         # 22 intents
│       │   ├── channels/
│       │   │   └── bridge.js         # WhatsApp/Telegram/SMS/Email
│       │   ├── context/
│       │   │   └── engine.js         # Session management
│       │   ├── actions/
│       │   │   └── engine.js         # Service routing
│       │   └── routes/
│       │       ├── intents.js
│       │       ├── messages.js
│       │       ├── sessions.js
│       │       └── webhooks.js
│       ├── package.json
│       ├── CLAUDE.md
│       └── FEATURES.md
│
└── shared/
    └── twinos-shared/                # Shared utilities
```

---

## 🚀 Quick Start

### Start All Services
```bash
# Start all Genie services
for port in 4709 4710 4711 4712 4713 4714 4715 4725 4767 4768 4769; do
  cd services/genie-* 2>/dev/null || true
done

# Or individually:
cd services/genie-gateway && npm start &  # Port 4711
cd services/genie-memory-inbox && npm start &  # Port 4710
cd services/genie-briefing-service && npm start &  # Port 4712
cd services/genie-universal-search && npm start &  # Port 4713
cd services/genie-serendipity-service && npm start &  # Port 4714
cd services/genie-smart-forgetting-service && npm start &  # Port 4715
cd services/genie-calendar-service && npm start &  # Port 4709
cd services/razo-keyboard && npm start &  # Port 4725
```

### Health Checks
```bash
# Check all services
for port in 4709 4710 4711 4712 4713 4714 4715 4725; do
  curl -s http://localhost:$port/health | jq -r ".status"
done
```

---

## 🔐 Security

- ✅ JWT Authentication
- ✅ Rate Limiting (100/min default)
- ✅ Helmet Security Headers
- ✅ CORS Configuration
- ✅ Input Validation
- ✅ Request Logging
- ✅ Privacy Redaction for sensitive data

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total Services | 11 |
| Genie Voice Services | 3 |
| Genie Personal Services | 2 |
| Genie Memory Services | 5 |
| RAZO Keyboard Intents | 22 |
| Supported Channels | 4 |
| Digital Twins Connected | 86+ |

---

*Last Updated: June 18, 2026*
*Genie AI & RAZO Ecosystem - Personal AI for Everyone*
