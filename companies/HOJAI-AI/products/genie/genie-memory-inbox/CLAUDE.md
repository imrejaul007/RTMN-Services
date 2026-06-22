# Genie Memory Inbox Service

**Version:** 1.0.0  
**Port:** 4710  
**Status:** ✅ BUILT - Universal Memory Capture

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

Genie Memory Inbox is the **universal capture layer** for Genie AI. Everything lands here first, then AI auto-classifies into Twins.

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY INBOX                              │
│                                                             │
│  Voice ──┐                                                 │
│  Text ───┼──→ Memory Inbox ──→ AI Classifier ──→ Twins     │
│  Image ──┤         (4710)          │                        │
│  Link ───┼──→ Timeline ────────────┼──→ Search             │
│  Email ──┤                                         │        │
│  WhatsApp┘                                         ▼        │
│                                                   Universal │
│                                                   Search    │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Types

| Type | Description | Capture Source |
|------|-------------|----------------|
| `text` | Text notes | Manual input |
| `voice` | Voice notes | Voice capture |
| `image` | Photos/screenshots | Camera/share |
| `link` | Bookmarks/URLs | Browser |
| `email` | Email capture | Email forward |
| `whatsapp` | WhatsApp messages | Webhook |
| `document` | PDFs, files | Upload |
| `meeting` | Meeting notes | Calendar |
| `expense` | Receipts/bills | Camera/upload |
| `reminder` | Reminders | Quick capture |
| `task` | Tasks | Quick capture |

---

## API Endpoints

### Capture (Post to Inbox)

```
POST /api/capture/text       # Capture text note
POST /api/capture/voice      # Capture voice note
POST /api/capture/image      # Capture image/screenshot
POST /api/capture/link       # Capture bookmark
POST /api/capture/email      # Capture forwarded email
POST /api/capture/whatsapp   # Capture WhatsApp (webhook)
POST /api/capture/document   # Capture document
POST /api/capture/meeting    # Capture meeting notes
POST /api/capture/expense    # Capture expense/receipt
POST /api/capture/quick      # Quick capture - "Remember this"
```

### Memories (CRUD)

```
GET    /api/memories          # List memories (filters: type, category, tag, search)
GET    /api/memories/:id      # Get single memory
POST   /api/memories          # Create memory
PUT    /api/memories/:id      # Update memory
DELETE /api/memories/:id      # Delete memory
POST   /api/memories/:id/classify  # Re-classify
POST   /api/memories/:id/tags     # Add tags
```

### Timeline

```
GET /api/timeline                    # Get timeline
GET /api/timeline/by-date           # Grouped by date
GET /api/timeline/activity          # Activity stream
GET /api/timeline/summary           # Daily/weekly summary
GET /api/timeline/today             # Today's memories
GET /api/timeline/year/:year        # Memories for year
```

### Search

```
GET /api/search                     # Universal search
GET /api/search/semantic            # AI semantic search
GET /api/search/people              # Search people
GET /api/search/health              # Search health
GET /api/search/finance             # Search finance
GET /api/search/related/:id         # Find related memories
```

### Categories & Tags

```
GET    /api/categories              # List categories
POST   /api/categories             # Create category
DELETE /api/categories/:id          # Delete category
GET    /api/tags                   # List tags
POST   /api/tags                   # Create tag
```

### Reminders

```
GET    /api/reminders              # List reminders
POST   /api/reminders             # Create reminder
PATCH  /api/reminders/:id          # Update reminder
```

### Stats

```
GET /api/stats                     # Memory statistics
```

---

## Example Usage

### Quick Capture ("Remember this")
```bash
curl -X POST http://localhost:4710/api/capture/quick \
  -H "Content-Type: application/json" \
  -d '{"text": "Remember to call Dr. Sharma about appointment"}'
```

**Response:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid-123",
    "type": "text",
    "title": "Remember to call Dr. Sharma about appointment",
    "category": "health",
    "tags": ["health", "appointment", "follow-up"]
  },
  "classification": {
    "twinType": "health",
    "confidence": 0.85,
    "priority": "normal"
  }
}
```

### Voice Note
```bash
curl -X POST http://localhost:4710/api/capture/voice \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Meeting with Rahul went well. He wants to discuss partnership.",
    "duration": 45,
    "audioUrl": "https://storage.genie.ai/voice/uuid.mp3"
  }'
```

### Capture from WhatsApp
```bash
curl -X POST http://localhost:4710/api/capture/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "919876543210",
    "message": "Send me the quarterly report",
    "timestamp": "2026-06-18T10:30:00Z"
  }'
```

### Capture Expense
```bash
curl -X POST http://localhost:4710/api/capture/expense \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1250,
    "merchant": "Uber",
    "category": "transport",
    "date": "2026-06-18"
  }'
```

### Search Memories
```bash
curl "http://localhost:4710/api/search?q=meeting&limit=10"
```

---

## AI Classification

The classifier automatically determines:

| Twin Type | Keywords |
|-----------|----------|
| `health` | doctor, medicine, hospital, workout, diet |
| `financial` | payment, expense, invoice, salary, bank |
| `personal` | personal, diary, goal, dream, birthday |
| `business` | meeting, project, deadline, client, report |
| `relationship` | friend, family, call, meet, birthday |

### Auto-Tag Generation

Tags are generated based on:
- Content analysis
- Detected entities (dates, amounts, people)
- Action patterns (reminders, tasks)
- Category matching

---

## Integration with Twins

Memories are automatically linked to Twins based on classification:

```
Memory Classification ──→ Twin Sync
─────────────────────────────────
health category ──────────→ Health Twin (4717)
finance category ──────────→ Financial Twin (4715)
personal/relationship ────→ Personal Twin (4708)
meeting/work ──────────────→ Business Context
```

---

## Service Integrations

| Service | Port | Purpose |
|---------|------|---------|
| TwinOS Hub | 4705 | Twin synchronization |
| MemoryOS | 4703 | Memory storage |
| Calendar | 4709 | Meeting events |
| Personal Twin | 4708 | User profile |
| Health Twin | 4717 | Health data |
| Financial Twin | 4715 | Finance data |

---

## Quick Start

```bash
# Install dependencies
cd products/genie/genie-memory-inbox
npm install

# Start service
npm start

# Health check
curl http://localhost:4710/health
```

---

## Environment Variables

```env
GENIE_INBOX_PORT=4710
TWIN_OS_URL=http://localhost:4705
MEMORY_OS_URL=http://localhost:4703
```

---

## Memorae Features Mapped

| Memorae Feature | Genie Memory Inbox |
|----------------|-------------------|
| Memory Inbox | ✅ `/api/capture/*` |
| Voice Capture | ✅ `/api/capture/voice` |
| Screenshot Capture | ✅ `/api/capture/image` |
| Email to App | ✅ `/api/capture/email` |
| WhatsApp Capture | ✅ `/api/capture/whatsapp` |
| AI Auto-Classify | ✅ MemoryClassifier |
| Quick Capture | ✅ `/api/capture/quick` |
| Memory Timeline | ✅ `/api/timeline/*` |
| Universal Search | ✅ `/api/search/*` |
| Reminders | ✅ `/api/reminders` |

---

*Last Updated: June 22, 2026*
