# 🏨 Hotel OS - Complete Integration Guide

**Date:** June 18, 2026  
**Version:** 2.0

---

## 1. HOTEL OS FEATURES

### Complete Module List

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOTEL OS - 40+ MODULES                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │    CORE (4)     │  │   AI (5)        │  │  GUEST (12)    │         │
│  │  Booking Engine │  │  AI Chatbot     │  │  Digital Key   │         │
│  │  PMS            │  │  Voice Agent    │  │  Restaurant    │         │
│  │  Hotel Service │  │  Genie         │  │  Spa           │         │
│  │  Analytics      │  │  AI Frontdesk  │  │  Concierge     │         │
│  └─────────────────┘  └─────────────────┘  │  Room Controls │         │
│                                          │  Parking       │         │
│  ┌─────────────────┐  ┌─────────────────┐│  Upsell        │         │
│  │  OPERATIONS (4) │  │  INTELLIGENCE   ││  Minibar       │         │
│  │  Housekeeping   │  │  (4)            ││  Pre-Arrival   │         │
│  │  Maintenance    │  │  Guest Memory   ││  Self Checkout  │         │
│  │  Messaging      │  │  Guest Twin     ││  Lost & Found  │         │
│  └─────────────────┘  │  Business Twin  ││  Reviews       │         │
│                       └─────────────────┘└─────────────────┘         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │  INTEGRATIONS   │  │   PAYMENTS      │  │   FEEDBACK      │       │
│  │  Channel Manager│  │  Hotel Payment  │  │  Reviews        │       │
│  │  Google Ads    │  │                 │  │  Surveys        │       │
│  │  Corp Bridge   │  │                 │  │                 │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Details

| Category | Module | Port | Description |
|----------|--------|------|-------------|
| **Core** | Booking Engine | 4031 | Reservation management |
| | PMS | 4802 | Property Management System |
| | Hotel Service | 4803 | Core hotel operations |
| | Analytics | 4818 | Business analytics |
| **AI** | AI Chatbot (Staybot) | 4840 | Guest conversational AI |
| | Voice Agent | 4842 | Voice commands |
| | Genie | 4843 | Personal AI assistant |
| | AI Frontdesk | 4844 | Virtual frontdesk |
| **Guest** | Digital Key | 4810 | Mobile keyless entry |
| | Restaurant | 4811 | In-hotel dining |
| | Spa | 4812 | Spa bookings |
| | Concierge | 4813 | Concierge services |
| | Room Controls | 4814 | AC, lights, TV |
| | Parking | 4815 | Valet/self-parking |
| | Upsell | 4817 | Upgrade offers |
| | Minibar | 4818 | Mini bar charges |
| | Pre-Arrival | 4819 | Early check-in |
| | Self Checkout | 4823 | Express checkout |
| **Operations** | Housekeeping | 4830 | Room cleaning |
| | Maintenance | 4831 | Issue tracking |
| | Messaging | 4833 | Guest notifications |
| **Intelligence** | Guest Memory | 4850 | Preference storage |
| | Guest Twin | 4852 | Digital guest twin |
| | Business Twin | 4853 | Hotel business twin |
| **Integrations** | Channel Manager | 4860 | OTA sync (Booking, Expedia) |
| | Google Ads | 4861 | Marketing integration |
| | Corp Integration | 4862 | Corporate booking |
| **Payments** | Hotel Payment | 4870 | Billing, checkout |

---

## 2. HOW HOTEL OS WORKS

### Booking to Checkout Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GUEST JOURNEY - HOTEL OS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. DISCOVERY                                                           │
│     Guest searches ──▶ Channel Manager (4860) ──▶ Google Ads (4861)     │
│                              │                                           │
│                              ▼                                           │
│  2. BOOKING                                                             │
│     Booking Engine (4031) ──▶ PMS (4802) ──▶ Payment (4870)            │
│                              │                                           │
│                              ▼                                           │
│  3. PRE-ARRIVAL                                                          │
│     Pre-Arrival (4819) ──▶ Guest Memory (4850) ──▶ TwinOS Sync         │
│                              │                                           │
│                              ▼                                           │
│  4. CHECK-IN                                                            │
│     AI Frontdesk (4844) ──▶ Digital Key (4810) ──▶ Room Controls      │
│                              │                                           │
│                              ▼                                           │
│  5. STAY                                                                │
│     Room Service ──▶ Spa ──▶ Restaurant ──▶ Concierge                  │
│     All tracked in Guest Twin (4852)                                     │
│                              │                                           │
│                              ▼                                           │
│  6. AI ASSIST (Genie)                                                   │
│     Voice/Chat ──▶ AI Chatbot (4840) ──▶ Genie (4843)                  │
│     "Order room service" ──▶ Restaurant API                             │
│                              │                                           │
│                              ▼                                           │
│  7. CHECKOUT                                                            │
│     Self Checkout (4823) ──▶ Payment (4870) ──▶ Review (4820)         │
│                              │                                           │
│                              ▼                                           │
│  8. FEEDBACK                                                            │
│     Survey (4821) ──▶ Analytics (4818) ──▶ TwinOS Update              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Internal Module Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOTEL OS - INTERNAL FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                 │
│  │   Booking   │                                                 │
│  │   Engine    │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│  ┌──────▼──────┐      ┌─────────────┐      ┌─────────────┐      │
│  │     PMS     │─────▶│   Payment   │      │    Guest    │      │
│  │   (4802)   │      │   (4870)    │      │   Memory    │      │
│  └──────┬──────┘      └─────────────┘      │   (4850)    │      │
│         │                       ▲          └──────┬──────┘      │
│         │                       │                 │              │
│  ┌──────▼──────┐      ┌────────┴────────┐        │              │
│  │  Housekeep  │      │  Restaurant    │        │              │
│  │   (4830)    │      │   (4811)      │        │              │
│  └─────────────┘      └────────┬───────┘        │              │
│                               │                │              │
│                      ┌────────▼────────┐       │              │
│                      │      Spa        │       │              │
│                      │     (4812)      │       │              │
│                      └────────┬────────┘       │              │
│                               │                │              │
│                      ┌────────▼────────────────▼───────┐      │
│                      │         GUEST TWIN (4852)       │      │
│                      │   Digital copy of guest stay    │      │
│                      └─────────────────┬───────────────┘      │
│                                        │                     │
│                               ┌────────▼────────┐           │
│                               │  BUSINESS TWIN  │           │
│                               │    (4853)       │           │
│                               │  Hotel metrics  │           │
│                               └─────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. HOTEL OS + DEPARTMENT OS CONNECTIONS

### How Hotel OS Connects to All 8 Department OS

```
┌─────────────────────────────────────────────────────────────────────────┐
│              HOTEL OS ↔ DEPARTMENT OS CONNECTIONS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                      ┌──────────────────┐                               │
│                      │   HOTEL OS       │                               │
│                      │   (Industry)     │                               │
│                      └────────┬─────────┘                               │
│                               │                                          │
│         ┌─────────────────────┼─────────────────────┐                 │
│         │                     │                     │                  │
│  ┌──────▼──────┐     ┌───────▼───────┐     ┌──────▼──────┐          │
│  │    SALES    │     │   MARKETING   │     │   FINANCE    │          │
│  │     OS      │     │      OS       │     │     OS       │          │
│  ├──────────────┤     ├───────────────┤     ├──────────────┤          │
│  │ Corp booking│     │ OTA campaigns │     │ Billing      │          │
│  │ Group deals │     │ Email offers  │     │ Revenue sync │          │
│  │ Lead mgmt  │     │ Google Ads    │     │ P&L report   │          │
│  └──────────────┘     └───────────────┘     └──────────────┘          │
│                                                                          │
│  ┌──────────────────┐     ┌──────────────────┐                          │
│  │ OPERATIONS OS   │     │ WORKFORCE OS    │                          │
│  ├──────────────────┤     ├──────────────────┤                          │
│  │ Housekeeping    │     │ Staff scheduling │                          │
│  │ Maintenance     │     │ Payroll         │                          │
│  │ Task mgmt       │     │ Training        │                          │
│  └──────────────────┘     └──────────────────┘                          │
│                                                                          │
│  ┌──────────────────┐     ┌──────────────────┐                          │
│  │  CXO OS         │     │ PROCUREMENT OS   │                          │
│  ├──────────────────┤     ├──────────────────┤                          │
│  │ Executive KPI   │     │ Supplier mgmt    │                          │
│  │ RevPAR, ADR    │     │ Linen, supplies  │                          │
│  │ Board reports  │     │ Food vendors     │                          │
│  └──────────────────┘     └──────────────────┘                          │
│                                                                          │
│  ┌──────────────────┐     ┌──────────────────┐                          │
│  │MARKETING OS     │     │  CS OS           │                          │
│  ├──────────────────┤     ├──────────────────┤                          │
│  │ Loyalty program │     │ Post-stay survey │                          │
│  │ Review mgmt     │     │ NPS tracking     │                          │
│  │ Campaign sync   │     │ Churn analysis   │                          │
│  └──────────────────┘     └──────────────────┘                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Connection Examples

#### Hotel OS → Sales OS (Corporate Bookings)
```javascript
// When a corporate client books 50 rooms
{
  "dealId": "CORP-GOOGLE-001",
  "hotelId": "GRAND-HOTEL",
  "rooms": 50,
  "duration": "30 days",
  "contact": "google@corp.com"
}
// → Creates lead in Sales OS
// → Tracks in CXO executive dashboard
```

#### Hotel OS → Finance OS (Daily Revenue)
```javascript
// End of day revenue sync
{
  "date": "2026-06-18",
  "revenue": {
    "rooms": 15000,
    "restaurant": 3500,
    "spa": 2000,
    "minibar": 500,
    "parking": 800
  },
  "total": 21800
}
// → Syncs to Finance OS for P&L
// → Updates CXO revenue metrics
```

#### Hotel OS → Workforce OS (Staff Scheduling)
```javascript
// Daily shift assignment
{
  "date": "2026-06-18",
  "department": "housekeeping",
  "staff": ["Maria", "John", "Priya"],
  "rooms": 45,
  "shift": "morning"
}
// → Links to Workforce OS payroll
```

#### Hotel OS → Procurement OS (Supply Orders)
```javascript
// Weekly linen order
{
  "supplier": "LinenCo",
  "items": [
    {"name": "Bath Towels", "qty": 100},
    {"name": "Bed Sheets", "qty": 50}
  ],
  "amount": 2500
}
// → Creates PO in Procurement OS
// → SUTAR verifies supplier trust score
```

---

## 4. SUTAR OS + NEXHA IN HOTEL OS

### How SUTAR + Nexha Work in Hotel Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 SUTAR + NEXHA IN HOTEL OS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    HOTEL OS GUEST FLOW                            │   │
│  │                                                                  │   │
│  │  1. GUEST REGISTRATION                                           │   │
│  │     └── SUTAR /corpid/issue → Guest CorpID                       │   │
│  │     └── Nexha Commerce Identity → Guest profile                   │   │
│  │                                                                     │   │
│  │  2. VERIFICATION                                                  │   │
│  │     └── SUTAR /trust/sync → Trust score (new guest = 50)        │   │
│  │     └── SUTAR /policy/evaluate → Can book premium suite?         │   │
│  │                                                                     │   │
│  │  3. BOOKING                                                       │   │
│  │     └── Nexha Procurement → Corporate rate negotiation            │   │
│  │     └── SUTAR policy → Credit limit check                        │   │
│  │                                                                     │   │
│  │  4. STAY                                                          │   │
│  │     └── SUTAR events → "guest.checked_in"                        │   │
│  │     └── Guest Twin updates                                        │   │
│  │                                                                     │   │
│  │  5. PAYMENT                                                       │   │
│  │     └── SUTAR /trust/sync → Trust += (on-time payment)           │   │
│  │     └── Nexha TradeFinance → BNPL for large bills                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    HOTEL SUPPLIER FLOW                           │   │
│  │                                                                  │   │
│  │  Supplier → SUTAR CorpID → Trust Score → Nexha Procurement       │   │
│  │                                                                      │   │
│  │  Example: Linen Supplier                                          │   │
│  │  ├── SUTAR issues SUP-LINEN-001                                   │   │
│  │  ├── Trust score: 75 (based on delivery history)                 │   │
│  │  ├── Nexha Procurement: Listed in Hotel OS vendor directory      │   │
│  │  └── RFQ for new towels → Awarded if trust >= 70                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Examples for Hotel + SUTAR + Nexha

```bash
# 1. Guest Registration (via SUTAR)
POST /corpid/issue
{
  "type": "guest",
  "businessName": "John Doe",
  "email": "john@email.com",
  "phone": "+1234567890"
}
Response: { "corpId": "GST-JOHN123" }

# 2. Guest Trust Score
POST /trust/sync
{
  "corpId": "GST-JOHN123",
  "subject": "guest",
  "overallScore": 85,
  "breakdown": {
    "payment_score": 90,
    "stay_count": 5,
    "avg_rating": 4.5
  }
}

# 3. Check-in Policy
POST /policy/evaluate
{
  "action": "guest.upgrade.premium",
  "corpId": "GST-JOHN123",
  "context": { "currentTier": "gold" }
}
Response: { "allowed": true, "reason": "policy allows gold upgrade" }

# 4. Supplier Verification
POST /corpid/issue
{
  "type": "supplier",
  "businessName": "ABC Linen Supply"
}
Response: { "corpId": "SUP-ABC-LINEN" }

# 5. Corporate Booking (via Nexha)
POST /api/hotel/corporate-booking
{
  "companyId": "GOOGLE",
  "corpId": "BUY-GOOGLE-001",  // From SUTAR
  "rate": "corporate",
  "creditLimit": 100000
}
```

---

## 5. GENIE + COPILOT IN HOTEL OS

### Genie - Voice AI for Hotels

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GENIE IN HOTEL OS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Genie is the VOICE AI ASSISTANT for hotel guests and staff             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    GUEST USES GENIE                             │   │
│  │                                                                  │   │
│  │  "Hey Genie, I want room service"                              │   │
│  │        │                                                        │   │
│  │        ▼                                                        │   │
│  │  Voice Agent (4842) → NLP → Intent: order_room_service         │   │
│  │        │                                                        │   │
│  │        ▼                                                        │   │
│  │  Routes to Restaurant (4811) → Creates order                     │   │
│  │        │                                                        │   │
│  │        ▼                                                        │   │
│  │  Confirms to guest "Your Biryani is being prepared"             │   │
│  │                                                                  │   │
│  │  Commands Genie understands:                                      │   │
│  │  • "Order room service"                                          │   │
│  │  • "Book spa appointment"                                        │   │
│  │  • "What's my bill?"                                             │   │
│  │  • "Set AC to 22 degrees"                                        │   │
│  │  • "Request late checkout"                                        │   │
│  │  • "Call taxi"                                                   │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    STAFF USES GENIE                              │   │
│  │                                                                  │   │
│  │  "Genie, what's Housekeeping status for 301?"                  │   │
│  │        │                                                        │   │
│  │        ▼                                                        │   │
│  │  Housekeeping API (4830) → Returns: "Dirty, assigned to Maria" │   │
│  │        │                                                        │   │
│  │        ▼                                                        │   │
│  │  Voice response: "Room 301 is dirty, Maria will clean in 15 min"│   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Copilot - AI Assistant for Hotel Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COPILOT IN HOTEL OS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Copilot provides AI assistance to HOTEL MANAGEMENT                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    COPILOT AGENTS FOR HOTEL                      │   │
│  │                                                                  │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │   │
│  │  │ Sales Agent   │  │ Ops Agent     │  │ Finance Agent │        │   │
│  │  │ (agent-1)    │  │ (agent-6)     │  │ (agent-4)     │        │   │
│  │  ├───────────────┤  ├───────────────┤  ├───────────────┤        │   │
│  │  │ Lead scoring  │  │ Workflow opt  │  │ Revenue audit │        │   │
│  │  │ Corp booking  │  │ Staffing     │  │ Cost analysis │        │   │
│  │  │ RevPAR pred   │  │ Maintenance  │  │ Budget fcst   │        │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Example: Hotel Manager uses Copilot                                    │
│  ────────────────────────────────────────                              │
│                                                                          │
│  POST /api/marketplace/ai/execute                                      │
│  {                                                                       │
│    "agentId": "agent-6",        // Operations Optimizer                │
│    "task": "Optimize housekeeping schedule for tomorrow"               │
│  }                                                                       │
│                                                                          │
│  Response:                                                              │
│  {                                                                       │
│    "execution": {                                                       │
│      "id": "exec-123",                                                  │
│      "status": "completed",                                             │
│      "result": {                                                       │
│        "recommendation": [                                              │
│          "Assign Maria to floors 1-3 (fast cleaner)",                 │
│          "John handles VIP rooms 501-505",                             │
│          "Add 2 temp staff for checkout rush"                         │
│        ],                                                               │
│        "estimated_time_savings": "2.5 hours"                          │
│      }                                                                 │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
│  POST /api/marketplace/ai/execute                                      │
│  {                                                                       │
│    "agentId": "agent-4",        // Finance Analyzer                    │
│    "task": "Analyze this month's revenue vs last month"                │
│  }                                                                       │
│                                                                          │
│  Response:                                                              │
│  {                                                                       │
│    "result": {                                                         │
│      "revenue_change": "+12%",                                         │
│      "drivers": [                                                      │
│        "Spa revenue up 25%",                                           │
│        "Restaurant occupancy +15%",                                     │
│        "Lower ADR in weekday"                                          │
│      ],                                                                 │
│      "recommendation": "Consider weekday promotions"                    │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Voice + Copilot Integration in RTMN Hub

```bash
# Guest uses Genie for voice commands
POST /api/marketplace/voice/order
{
  "userId": "GST-JOHN123",
  "transcript": "Book spa for 3 PM",
  "intent": "spa_booking"
}

# Hotel manager uses Copilot for analytics
POST /api/integrations/copilot-execute
{
  "agentId": "agent-6",
  "task": "Generate tomorrow's housekeeping schedule"
}

# Genie + Copilot for upselling
POST /api/marketplace/ai/execute
{
  "agentId": "agent-1",  // Sales Lead Scorer
  "task": "Identify guests likely to upgrade to suite"
}
Response: {
  "leads": [
    {"guestId": "GST-JOHN123", "score": 92, "reason": "Frequent spa user"}
  ]
}
```

---

## 6. COMPLETE HOTEL OS FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│              COMPLETE HOTEL OS ECOSYSTEM FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 1: DISCOVERY & BOOKING                                           │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Guest searches (Google/OTA)                                            │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────┐     ┌─────────────────┐                           │
│  │ Channel Manager │     │ Marketing OS    │                           │
│  │ (4860)          │     │ Email campaign  │                           │
│  └────────┬────────┘     └─────────────────┘                           │
│           │                                                              │
│           ▼                                                              │
│  Booking Engine (4031) ──▶ SUTAR CorpID (guest verification)            │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐     ┌─────────────────┐                           │
│  │ Sales OS        │     │ Nexha           │                           │
│  │ Lead created    │     │ Corp booking    │                           │
│  └─────────────────┘     └─────────────────┘                           │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 2: PRE-ARRIVAL                                                   │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Pre-Arrival (4819) ──▶ Guest Memory (4850)                            │
│           │                                                              │
│           ▼                                                              │
│  TwinOS (4705) ──▶ Guest Twin created                                  │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 3: CHECK-IN                                                      │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  AI Frontdesk (4844) ──▶ Digital Key (4810)                            │
│           │                                                              │
│           ▼                                                              │
│  Room assigned ──▶ TwinOS updated ──▶ CS OS notified                   │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 4: STAY                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ Restaurant│ │  Spa   │  │Concierge│  │Room Svc │                     │
│  │ (4811)  │  │(4812) │  │(4813)  │  │ Via Genie│                     │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                     │
│       │             │             │             │                        │
│       └─────────────┼─────────────┼─────────────┘                        │
│                     │             │                                    │
│              Guest Twin (4852) ◄───┘                                   │
│                     │                                                 │
│                     ▼                                                 │
│  Operations OS ──▶ Housekeeping/Maintenance tasks                       │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 5: AI ASSISTANCE                                                 │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  "Hey Genie..." ──▶ Voice Agent (4842)                                │
│       │                                                                │
│       ▼                                                                │
│  AI Chatbot (4840) ──▶ Routes to appropriate service                  │
│       │                                                                │
│       ▼                                                                │
│  Genie (4843) ──▶ MemoryOS (remember preferences)                     │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 6: CHECKOUT                                                      │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Self Checkout (4823) ──▶ Payment (4870)                              │
│       │                                                                │
│       ▼                                                                │
│  Finance OS ──▶ Revenue recorded ──▶ CXO dashboard                     │
│       │                                                                │
│       ▼                                                                │
│  Review (4820) ──▶ NPS survey (CS OS)                                 │
│       │                                                                │
│       ▼                                                                │
│  SUTAR Trust update ──▶ Guest score +5                                  │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│  PHASE 7: POST-STAY                                                     │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  Marketing OS ──▶ "Thank you" email + future offer                     │
│       │                                                                │
│       ▼                                                                │
│  Copilot ──▶ Analyze stay for upsell opportunities                     │
│                                                                          │
│  Guest Twin ──▶ Updated with complete stay data                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. SUMMARY TABLE

| Component | In Hotel OS | Connects To | What It Does |
|-----------|-------------|-------------|--------------|
| **Booking Engine** | 4031 | Sales OS, SUTAR | Reservations |
| **PMS** | 4802 | All modules | Core management |
| **AI Chatbot** | 4840 | Genie, Memory | Guest conversations |
| **Voice Agent** | 4842 | Genie | Voice commands |
| **Genie** | 4843 | All services | Personal AI |
| **Guest Memory** | 4850 | TwinOS | Preferences |
| **Guest Twin** | 4852 | All modules | Digital guest |
| **Channel Manager** | 4860 | Marketing OS | OTA sync |
| **Housekeeping** | 4830 | Workforce OS | Room cleaning |
| **Maintenance** | 4831 | Operations OS | Issue tracking |
| **Payment** | 4870 | Finance OS | Billing |
| **Reviews** | 4820 | Marketing OS, CS OS | Feedback |
| **SUTAR** | 4799 | All above | Identity, Trust, Policy |
| **Nexha** | 3000, 4320 | Procurement | Corporate deals |
| **Copilot** | 4920 | CXO, Finance | AI analysis |

---

*Hotel OS - Where Industry meets Department meets AI*
