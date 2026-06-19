# Genie Gateway - Feature Specification

**Version:** 1.0.0  
**Port:** 4701  
**Status:** ✅ BUILT | **June 18, 2026**

---

## 🎯 Core Feature Overview

Genie Gateway is the **central orchestrator** for Genie Personal AI - a unified API gateway that routes requests to Memory, Twins, Calendar, Briefing, and other AI services while providing contextual responses.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            GENIE GATEWAY                                        │
│                              (Port 4701)                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      REQUEST ROUTING                                  │       │
│  │                                                                       │       │
│  │   /api/query ─────→ Intent Detection ─────→ Service Routing          │       │
│  │   /api/memory ──────────────────────────→ MemoryOS (4703)           │       │
│  │   /api/twins ───────────────────────────→ TwinOS Hub (4705)         │       │
│  │   /api/briefing ────────────────────────→ Briefing (4706)           │       │
│  │   /api/search ──────────────────────────→ Multi-service Search       │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      CONTEXT AGGREGATION                             │       │
│  │                                                                       │       │
│  │   User Context ←── Memory (4703)                                     │       │
│  │                ←── Personal Twin (4708)                             │       │
│  │                ←── Financial Twin (4715)                             │       │
│  │                ←── Health Twin (4717)                                │       │
│  │                ←── Founder Twin (4716)                               │       │
│  │                                                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Features

### 1. Unified Query Processing
**Purpose:** Process natural language queries and route to appropriate services

| Feature | Description |
|---------|-------------|
| Intent Detection | Identifies query type (weather, tasks, calendar, etc.) |
| Service Routing | Routes to Memory, Twins, Calendar, or Briefing |
| Context Enrichment | Adds user context to responses |
| Response Generation | Generates contextual AI responses |

### 2. Multi-Service Context Aggregation
**Purpose:** Gather user data from all connected services

| Feature | Description |
|---------|-------------|
| Memory Fetch | Retrieves memories from MemoryOS |
| Twin Aggregation | Collects data from all 5 twins |
| Preference Loading | Loads user preferences |
| Real-time Updates | Broadcasts changes to all twins |

### 3. Service Health Monitoring
**Purpose:** Monitor connectivity to all backend services

| Feature | Description |
|---------|-------------|
| Health Checks | Pings each service every request |
| Readiness Probe | `/ready` endpoint checks all services |
| Graceful Degradation | Works with partial service availability |
| Status Reporting | Reports individual service status |

### 4. Memory Operations
**Purpose:** Store and retrieve personal memories

| Feature | Description |
|---------|-------------|
| Store Memory | POST /api/memory |
| Get Memories | GET /api/memory/:userId |
| Type Filtering | Filter by memory type |
| Search | Full-text search across memories |

### 5. Twin Synchronization
**Purpose:** Coordinate data across digital twins

| Feature | Description |
|---------|-------------|
| Twin Fetch | GET /api/twins/:userId |
| Broadcast | POST /api/broadcast |
| Cross-Twin Updates | Updates propagate to relevant twins |
| Conflict Resolution | Handles duplicate entries |

---

## 🌐 API Endpoints

### Health & Status

```
GET /health
  Response: { status, service, port, version, timestamp }

GET /ready
  Response: { ready: boolean, services: { name: status } }
  Checks all connected services
```

### User Context

```
GET /api/user/:userId/context
  Response: {
    success: true,
    userId: string,
    context: {
      memory: object,
      personalTwin: object,
      financialTwin: object,
      healthTwin: object
    }
  }

GET /api/user/:userId/preferences
  Response: { success, preferences: object }

PUT /api/user/:userId/preferences
  Body: { preferences: object }
  Response: { success: true }
```

### AI Query (Main Endpoint)

```
POST /api/query
  Body: {
    query: string,       // Required
    userId?: string,
    sessionId?: string,
    context?: object
  }
  
  Response: {
    success: true,
    query: string,
    response: {
      type: 'weather' | 'tasks' | 'calendar' | 'reminder' | 'general',
      message: string,
      data?: object,
      suggestions?: string[]
    },
    requestId: string,
    timestamp: string
  }
```

### Twins

```
GET /api/twins/:userId
  Response: {
    success: true,
    userId: string,
    twins: {
      personal: object,
      financial: object,
      health: object,
      founder: object,
      relationship: object
    }
  }
```

### Briefing

```
GET /api/briefing/:userId
  Query: ?type=morning|evening
  
  Response: {
    success: true,
    briefing: {
      type: string,
      greeting: string,
      message: string,
      sections: {
        weather: object,
        tasks: object,
        calendar: object,
        insights: string[]
      }
    }
  }
```

### Memory

```
POST /api/memory
  Body: {
    userId: string,
    content: string,
    type?: 'general' | 'preference' | 'fact' | 'event'
  }
  Response: { success: true, message: string }

GET /api/memory/:userId
  Query: ?type=&limit=50
  Response: { success, memories: array, count: number }
```

### Search

```
GET /api/search
  Query: ?q=query&userId=&type=all|memory|calendar
  
  Response: {
    success: true,
    query: string,
    timestamp: string,
    results: [
      { ...result, source: 'memory' | 'calendar' }
    ]
  }
```

### Broadcast

```
POST /api/broadcast
  Body: {
    userId: string,
    event: string,
    data: object
  }
  Response: { success: true, message: string }
```

### Service Registry

```
GET /api/services
  Response: {
    success: true,
    services: [
      { name: string, url: string, status: string }
    ],
    gateway: { name, version, port }
  }
```

---

## 🔌 Connected Services

| Service | Port | Protocol | Endpoints Used |
|---------|------|----------|----------------|
| MemoryOS | 4703 | HTTP | /api/memory, /api/context, /api/preferences |
| TwinOS Hub | 4705 | HTTP | /api/broadcast |
| Genie Calendar | 4709 | HTTP | /api/search |
| Genie Briefing | 4706 | HTTP | /api/briefing |
| Personal Twin | 4708 | HTTP | /api/twin |
| Financial Twin | 4715 | HTTP | /api/twin |
| Health Twin | 4717 | HTTP | /api/twin |
| Founder Twin | 4716 | HTTP | /api/twin |
| Relationship Twin | 4705 | HTTP | /api/twin |
| CorpID | 4702 | HTTP | Identity verification |

---

## 📊 Response Type Mapping

| Query Keywords | Response Type | Data Included |
|----------------|--------------|---------------|
| weather | weather | temp, condition, location |
| task, todo, to-do | tasks | count, items array |
| meeting, schedule, calendar | calendar | meetings array |
| remind, reminder | reminder | awaiting details |
| (default) | general | message, suggestions |

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | 100 requests/minute per IP |
| Request IDs | UUID tracking for all requests |
| Helmet.js | Security headers (CSP, XSS, etc.) |
| CORS | Cross-origin resource sharing |
| Input Validation | All inputs validated before processing |
| Error Handling | Structured error responses |

---

## 🔄 Flow Diagrams

### Query Flow
```
User: "What's my schedule today?"
         ↓
RAZO Intent Router: ask_genie (85%)
         ↓
Genie Gateway: /api/query
         ↓
Intent Detection: calendar query
         ↓
Service Routing: Calendar (4709)
         ↓
Response Aggregation + Context Enrichment
         ↓
User: "You have 2 meetings: Standup at 10 AM, Review at 3 PM"
```

### Context Aggregation Flow
```
User: "Show my complete profile"
         ↓
Genie Gateway: /api/user/:userId/context
         ↓
┌────────────────────────────────────┐
│  Parallel Fetch (Promise.allSettled)│
│  ├── MemoryOS (4703)               │
│  ├── Personal Twin (4708)          │
│  ├── Financial Twin (4715)         │
│  └── Health Twin (4717)            │
└────────────────────────────────────┘
         ↓
Aggregated Response
```

---

## ⚙️ Configuration

### Environment Variables
```env
MEMORY_URL=http://localhost:4703
TWINS_URL=http://localhost:4705
CALENDAR_URL=http://localhost:4709
BRIEFING_URL=http://localhost:4706
PERSONAL_TWIN_URL=http://localhost:4708
FINANCIAL_TWIN_URL=http://localhost:4715
HEALTH_TWIN_URL=http://localhost:4717
FOUNDER_TWIN_URL=http://localhost:4716
RELATIONSHIP_TWIN_URL=http://localhost:4705
CORPID_URL=http://localhost:4702
```

### Port Configuration
```env
PORT=4701  # Default
```

---

## 🧪 Testing

### Test Health
```bash
curl http://localhost:4701/health
```

### Test Readiness
```bash
curl http://localhost:4701/ready
```

### Test Query
```bash
curl -X POST http://localhost:4701/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my schedule?", "userId": "test"}'
```

### Test Context
```bash
curl http://localhost:4701/api/user/test/context
```

---

## 📈 Statistics

| Metric | Description |
|--------|-------------|
| Connected Services | 10 |
| Request Limit | 100/min |
| Timeout | 5s per service |
| Response Types | 5 |

---

## 🚀 Deployment

```bash
# Install dependencies
cd services/genie-gateway
npm install

# Start production server
npm start

# Start development
npm run dev

# Health check
curl http://localhost:4701/health
```

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Port** | 4701 |
| **Type** | API Gateway / Orchestrator |
| **Framework** | Express.js |
| **Connected Services** | 10 |
| **API Endpoints** | 15+ |
| **Rate Limit** | 100 req/min |
| **Authentication** | Request ID tracking |
| **Consumer Triangle** | Think layer (Genie) |

---

*Last Updated: June 18, 2026*
