# Genie Smart Forgetting Service - Intelligent Memory Archival

> **Version:** 1.0  
> **Port:** 4715  
> **Status:** ✅ PRODUCTION READY

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

## 🎯 Purpose

Smart Forgetting is an intelligent memory lifecycle management system that automatically determines what memories to keep, archive, or eventually delete. Unlike traditional deletion, it preserves privacy while maintaining memory relevance and freshness.

---

## 🔄 Memory Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   NEW → ACTIVE → DORMANT → ARCHIVED → DELETED                  │
│    │                    │                                      │
│    │                    └── (Never accessed for 30+ days)      │
│    │                                                          │
│    └── All new memories start here                            │
│                                                                 │
│   Active: Frequently accessed, important                       │
│   Dormant: Not accessed in a while                            │
│   Archived: Moved to cold storage (privacy preserved)        │
│   Deleted: Permanently removed                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Intelligence Features

| Feature | Description |
|---------|-------------|
| **Importance Classification** | AI-powered scoring based on content, entities, tags, and sentiment |
| **Freshness Tracking** | Measures memory relevance over time |
| **Privacy Redaction** | Auto-redacts sensitive data before archiving |
| **Retention Policies** | Configurable rules by importance level |
| **Never Forget** | User can mark memories as permanent |

### Importance Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Twin Type | High | Health/Financial > Personal > Creative |
| Entities | Medium | More entities = higher importance |
| Tags | Medium | "important", "milestone" boost score |
| Keywords | Variable | Context-aware keyword analysis |
| Sentiment | Medium | Strong emotions = more memorable |
| Access Count | Low | Frequently accessed = more relevant |

---

## 📡 API Endpoints

### Forgetting Routes

```
GET  /api/forgetting/analyze    - Analyze all memories for forgetting decisions
POST /api/forgetting/suggest    - Get suggestions for specific memories
POST /api/forgetting/keep       - Mark memory as "keep forever"
POST /api/forgetting/archive    - Archive memory with smart redaction
POST /api/forgetting/delete     - Schedule memory for deletion
GET  /api/forgetting/stats      - Get forgetting statistics
```

### Archive Routes

```
GET  /api/archive               - List archived memories
GET  /api/archive/:id           - Get specific archived memory
POST /api/archive/:id/restore   - Restore from archive
DELETE /api/archive/:id          - Permanently delete archived memory
GET  /api/archive/stats          - Archive statistics
POST /api/archive/cleanup        - Trigger archive cleanup
```

### Config Routes

```
GET  /api/config                - Get current configuration
PUT  /api/config                - Update configuration
GET  /api/config/retention      - Get retention policy
PUT  /api/config/retention     - Update retention policy
GET  /api/config/presets       - Get available presets
POST /api/config/presets/:id   - Apply preset
POST /api/config/reset         - Reset to defaults
```

---

## ⚙️ Default Configuration

```javascript
{
  enabled: true,
  autoArchive: true,
  autoDelete: false,  // Never auto-delete, always archive first

  retention: {
    lowImportance: 90,      // Archive after 90 days
    mediumImportance: 180,  // Archive after 180 days
    highImportance: 365,    // Archive after 1 year
    archivedRetention: 730  // Delete archived after 2 years
  },

  archivePolicy: {
    lowImportance: true,
    mediumImportance: true,
    highImportance: false,  // Never archive high importance
    financial: false,        // Never archive financial
    health: false            // Never archive health
  },

  redaction: {
    enabled: true,
    redactFinancial: true,   // Mask amounts, card numbers
    redactHealth: true,      // Mask specific health metrics
    redactPersonal: false
  }
}
```

---

## 🔒 Privacy Features

### Auto-Redaction Patterns

| Data Type | Pattern | Redacted Example |
|-----------|---------|------------------|
| Card Numbers | `****-****-****-1234` | 4 digits preserved |
| Phone Numbers | `***` | Full number masked |
| Amounts | `$***` | Only symbol preserved |
| Account Numbers | `***` | Full number masked |

### Never-Forget Protection

- User can mark any memory as "keep forever"
- High-importance memories never auto-archive
- Health and Financial twins are protected
- Contract/legal content is always preserved

---

## 📊 Statistics Tracked

```json
{
  "totalMemories": 1250,
  "activeMemories": 780,
  "dormantMemories": 320,
  "archivedMemories": 140,
  "deletedMemories": 10,
  "storageUsedMB": 45.2,
  "storageSavedMB": 12.8,
  "retentionRate": "94.2%"
}
```

---

## 🔗 Integrations

| Service | Purpose |
|---------|---------|
| MemoryOS (4703) | Primary memory storage |
| TwinOS (4705) | Twin-type classification |
| Genie Briefing (4712) | Include in daily briefings |

---

## 📁 Project Structure

```
services/genie-smart-forgetting-service/
├── src/
│   ├── index.js                 # Main Express server
│   ├── routes/
│   │   ├── forgetting.js        # Memory lifecycle routes
│   │   ├── archive.js          # Archive management
│   │   └── config.js           # Configuration management
│   └── services/
│       └── analyzers/
│           └── importance.js     # AI importance classifier
├── package.json
└── CLAUDE.md
```

---

## 🚀 Quick Start

```bash
cd products/genie/genie-smart-forgetting-service
npm install
npm start  # Port 4715

# Analyze memories
curl http://localhost:4715/api/forgetting/analyze

# Archive a memory
curl -X POST http://localhost:4715/api/forgetting/archive \
  -H "Content-Type: application/json" \
  -d '{"memoryId": "mem_123"}'

# Update retention policy
curl -X PUT http://localhost:4715/api/config/retention \
  -H "Content-Type: application/json" \
  -d '{"retention": {"lowImportance": 30}}'
```

---

*Last Updated: June 22, 2026*
*Genie AI - Smart Forgetting*
