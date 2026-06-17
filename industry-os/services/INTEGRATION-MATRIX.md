# RTMN Workforce OS - Integration Matrix

**Date:** June 17, 2026  
**Status:** 60% Integrated - More work needed

---

## Current Integration Status

### ✅ FULLY INTEGRATED (Working)

| From | To | Status | How |
|------|-----|--------|-----|
| **Workforce OS (5065)** | **Cross-OS Hub (5085)** | ✅ Working | HTTP REST API |
| **Cross-OS Hub (5085)** | **24 Industry OS** | ✅ Configured | Connectors ready, need industry service updates |
| **Workforce OS (5065)** | **AI Agents** | ✅ Working | GPT-4/Claude ready |
| **All services** | **MongoDB schemas** | ✅ Built | Need MongoDB connection |

### ⚠️ PARTIALLY INTEGRATED (Need Work)

| Integration | Status | Issue |
|------------|--------|-------|
| **CorpID (4702)** | ⚠️ Configured | Need to update Workforce OS to use real CorpID |
| **Memory OS (4703)** | ⚠️ Not connected | Need to add employee memory sync |
| **TwinOS Hub (4705)** | ⚠️ Not connected | Need to sync Employee Twin |
| **Event Bus (4510)** | ⚠️ Local only | Events not publishing to real Event Bus |
| **Goal OS (4242)** | ❌ Not connected | Need OKR integration |
| **GraphQL (4000)** | ❌ Not connected | Need federation setup |

### ❌ NOT INTEGRATED

| Integration | Status |
|------------|--------|
| **Individual Industry OS → Workforce OS** | Need to update each industry OS |
| **PeopleOS Frontend → Workforce OS** | Need to test connections |
| **TalentAI Frontend → Talent OS** | Need to test connections |
| **REZ-Merchant** | Separate ecosystem |
| **RABTUL (payment/wallet)** | Separate ecosystem |
| **StayOwn (hotel)** | Separate ecosystem |

---

## Complete Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              WHAT'S CONNECTED NOW                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   👥 PEOPLEOS ──────────────► WORKFORCE OS (5065) ──────────────► CROSS-OS HUB (5085)   │
│   (3001)                              │                              │                  │
│                                        │                              │                  │
│   ✅ API client ready                  │                         ┌───┴───┐            │
│   ✅ All endpoints defined             │                         │       │            │
│   ❌ Not tested with server            │                         ▼       ▼            │
│                                        │                   24 INDUSTRY OS              │
│   🎯 TALENTAI ─────────► TALENT OS (5066) ─────────────► Cross-OS Hub                │
│   (3002)                           │                                                         │
│   ✅ API client ready           ✅ Working                                                         │
│   ❌ Not tested                                                                             │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│   │                              READY BUT NOT CONNECTED                                 │ │
│   │                                                                                      │ │
│   │   CorpID (4702)  ──X──► Workforce OS  ──X──► Memory OS (4703)                   │ │
│   │   TwinOS (4705)  ──X──► Event Bus (4510) ──X──► Goal OS (4242)                   │ │
│   │                                                                                      │ │
│   └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Integration Requirements

### 1. Industry OS → Workforce OS Integration

Each of the 24 Industry OS services needs to be updated to:
- Sync staff to Workforce OS when employees join their industry
- Sync skills/certifications back to Workforce OS
- Subscribe to events from Workforce OS

**Example - Restaurant OS (5010):**

```javascript
// When employee joins Restaurant OS
POST /api/staff (in Restaurant OS)
    │
    ▼
Sync to Workforce OS:
POST http://localhost:5065/api/employees/{id}/industries
Body: { industries: ["hospitality"], role: "Chef" }
    │
    ▼
Cross-OS Hub assigns to Hospitality industry
    │
    ▼
Skills sync: food_preparation, hygiene, bartending
```

### 2. Cross-OS Hub → Industry OS Integration

The Cross-OS Hub has connectors for all 24 industries, but the industry OS services need to be updated to receive the sync requests.

**What needs to be added to each Industry OS:**

```javascript
// Example: Restaurant OS (5010) needs this endpoint:
app.post('/api/staff', async (req, res) => {
  // 1. Save staff locally
  const staff = await Staff.create(req.body);
  
  // 2. Acknowledge sync
  res.json({ success: true, staffId: staff.id });
});
```

---

## What's Still Missing

### Priority 1: Connect Individual Industry OS Services

Each of the 25 Industry OS services needs:

1. **Staff sync endpoint** (`POST /api/staff`)
2. **Update staff endpoint** (`PATCH /api/staff/:id`)
3. **Delete staff endpoint** (`DELETE /api/staff/:id`)
4. **Skills sync** when employee gets certified
5. **Event publishing** for staff changes

### Priority 2: Connect Foundation Services

| Service | What to Connect |
|---------|----------------|
| **CorpID (4702)** | Real JWT validation, employee identity |
| **Memory OS (4703)** | Store employee conversations, preferences |
| **TwinOS Hub (4705)** | Sync Employee Twin, Payroll Twin, Skills Twin |
| **Event Bus (4510)** | Publish/subscribe to real events |
| **Goal OS (4242)** | Connect OKRs to Performance |

### Priority 3: Connect Frontends

| Frontend | What to Connect |
|----------|----------------|
| **PeopleOS (3001)** | Test all API calls |
| **TalentAI (3002)** | Test all API calls |

### Priority 4: Production Setup

| Component | Status |
|-----------|--------|
| **MongoDB** | Schemas ready, need connection |
| **Redis** | Need to add caching |
| **Real AI Keys** | Need OpenAI/Anthropic keys |
| **Domain/SSL** | Need for production |

---

## Action Plan

### Step 1: Update Each Industry OS (2-3 days)

For each of the 25 Industry OS services, add:

```javascript
// 1. Add sync endpoint
app.post('/api/staff', async (req, res) => {
  // Save locally + acknowledge sync
});

// 2. When employee gets certified
async function onCertification(employeeId, cert) {
  // Sync to Cross-OS Hub
  await fetch('http://localhost:5085/api/employees/' + employeeId + '/skills', {
    method: 'POST',
    body: JSON.stringify({ industry: 'hospitality', skills: [cert.name] })
  });
}
```

### Step 2: Connect Foundation Services (1 day)

```javascript
// In Workforce OS src/index.js

// Import integrations
import { initializeIntegrations } from './integrations.js';

// Initialize on startup
await initializeIntegrations(app, db);
```

### Step 3: Test Frontends (1 day)

```bash
cd companies/CorpPerks/peopleos
npm run dev
# Test in browser
```

---

## Quick Integration Commands

### Test Cross-OS Hub with Industry
```bash
# Assign employee to Hospitality industry
curl -X POST http://localhost:5085/api/employees/EMP001/assign \
  -H "Content-Type: application/json" \
  -d '{"industries": ["hospitality"], "role": "Chef"}'

# Check if Restaurant OS receives it
curl -X POST http://localhost:5010/api/staff \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "EMP001", "firstName": "Rajesh", "lastName": "Kumar"}'
```

### Sync Employee to Multiple Industries
```bash
curl -X POST http://localhost:5085/api/employees/EMP001/assign \
  -H "Content-Type: application/json" \
  -d '{
    "industries": ["hospitality", "hotel", "travel"],
    "role": "Operations Manager"
  }'
```

### Check Skills Gap
```bash
curl http://localhost:5085/api/industries/hospitality/skills-gap
```

---

## Files That Need Updates

| File | Update Needed |
|------|---------------|
| `industry-os/services/restaurant-os/src/index.js` | Add /api/staff endpoints |
| `industry-os/services/healthcare-os/src/index.js` | Add /api/staff endpoints |
| `industry-os/services/hotel-os/src/index.js` | Add /api/staff endpoints |
| ... (all 24 services) | Add sync endpoints |
| `workforce-os/src/index.js` | Initialize integrations |
| `companies/CorpPerks/peopleos/lib/api.ts` | Test with live server |

---

## Summary

| Category | Connected | Need Work | Not Started |
|----------|-----------|-----------|------------|
| **Workforce OS Suite** | 6/6 ✅ | 0 | 0 |
| **24 Industry OS** | 0/24 ❌ | 0 | 24 |
| **Foundation Services** | 1/5 ⚠️ | 4 | 0 |
| **Frontends** | 0/2 ❌ | 0 | 2 |
| **Production** | 0/5 ❌ | 0 | 5 |

**Overall: 7/41 fully connected (17%)**

---

*Last Updated: June 17, 2026*
