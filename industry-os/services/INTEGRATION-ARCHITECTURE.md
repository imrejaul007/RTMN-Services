# RTMN Workforce OS - Integration Architecture

**How Everything Connects - Explained**

---

## 🔗 The Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USER / ADMIN                                          │
│                         Opens PeopleOS or TalentAI                                        │
└─────────────────────────────────────┬───────────────────────────────────────────────────┘
                                      │
                                      │ 🔐 Login with CorpID
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                               │
│                                                                                          │
│   ┌─────────────────────────────────┐    ┌─────────────────────────────────┐           │
│   │           PeopleOS              │    │            TalentAI                │           │
│   │         (Port 3001)            │    │          (Port 3002)               │           │
│   │                                 │    │                                   │           │
│   │  Tabs: Dashboard, Employees,   │    │  Tabs: Pipeline, Jobs, Candidates │           │
│   │  Leave, Attendance, Payroll,   │    │                                   │           │
│   │  Benefits, Training, Analytics │    │  Kanban Board, AI Scoring          │           │
│   │  AI Copilot, Org Chart       │    │  Analytics Dashboard              │           │
│   │                                 │    │                                   │           │
│   └──────────────┬──────────────────┘    └──────────────┬─────────────────────┘           │
│                  │                                    │                                  │
│                  │ API calls                           │ API calls                        │
│                  │                                    │                                  │
│                  │                                    │                                  │
└──────────────────┼────────────────────────────────────┼──────────────────────────────────┘
                   │                                    │
                   │ HTTP/REST                         │ HTTP/REST
                   ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                           │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────┐         │
│   │                    NEXT.JS API ROUTES (Rewrite Rules)                        │         │
│   │                                                                              │         │
│   │   /api/workforce/*  ──────────►  http://localhost:5065/*                      │         │
│   │   /api/talent/*    ──────────►  http://localhost:5066/*                      │         │
│   │   /api/learning/* ──────────►  http://localhost:5068/*                      │         │
│   │   /api/org/*      ──────────►  http://localhost:5072/*                      │         │
│   │                                                                              │         │
│   └─────────────────────────────────────────────────────────────────────────────┘         │
│                                      │                                                 │
└──────────────────────────────────────┼─────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────────────────┐
│                              SERVICE LAYER                                               │
│                                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│   │  Workforce OS    │  │    Talent OS     │  │  Learning OS     │  │Organization OS   │   │
│   │    (5065)       │  │     (5066)      │  │    (5068)       │  │    (5072)       │   │
│   │                 │  │                 │  │                 │  │                 │   │
│   │ Employees ◄───►│  │ Jobs ◄────────►│  │ Courses ◄──────►│  │ Org Chart ◄───►│   │
│   │ Leave    ◄───►│  │ Candidates ◄──►│  │ Enrollments ◄►│  │ Headcount ◄──►│   │
│   │ Attendance◄───►│  │ Pipeline ◄───►│  │ Skills ◄──────►│  │ Succession ◄──►│   │
│   │ Payroll   ◄───►│  │ AI Scoring ◄─►│  │ Certs ◄───────►│  │ Positions ◄───►│   │
│   │ Benefits  ◄───►│  │ Interviews ◄─►│  │ Assessments ◄►│  │ Simulations ◄─►│   │
│   │ AI Copilot◄───►│  │ Sourcing ◄───►│  │ AI Rec ◄─────►│  │ Org Health ◄─►│   │
│   │                 │  │                 │  │                 │  │                 │   │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│            │                     │                     │                     │             │
│            │   HTTP calls       │   HTTP calls        │   HTTP calls       │             │
│            │   to each other    │   to each other    │   to each other    │             │
│            └─────────┬─────────┴─────────┬───────────┴─────────┬───────────┘             │
│                      │                     │                     │                       │
└──────────────────────┼─────────────────────┼─────────────────────┼───────────────────────┘
                       │                     │                     │
                       │   ┌─────────────────┴─────────────────┐                     │
                       │   │                                   │                     │
                       ▼   ▼                                   ▼                     │
              ┌─────────────────────────────────┐                                     │
              │     Workforce Intelligence       │                                     │
              │          (5073)                │                                     │
              │                                 │                                     │
              │  CEO Dashboard ◄────────────────┼─────────────────────────────►         │
              │  HR Dashboard ◄────────────────┼─────────────────────────────►         │
              │  Attrition Prediction ◄─────────┼─────────────────────────────►         │
              │  Flight Risk ◄─────────────────┼─────────────────────────────►         │
              │  Burnout Detection ◄───────────┼─────────────────────────────►         │
              │  Sentiment Analysis ◄──────────┼─────────────────────────────►         │
              │  Skills Graph ◄────────────────┼─────────────────────────────►         │
              │  AI Insights ◄─────────────────┼─────────────────────────────►         │
              └──────────────┬──────────────────┴─────────────────────────────────────┘
                             │
                             │ Data aggregation
                             ▼
              ┌─────────────────────────────────────────────────────────────────┐
              │            Cross-OS Integration Hub (5085)                     │
              │                                                              │
              │  Employee Registry ◄──────────────────────────────────────►    │
              │  Industry Assignments ◄──────────────────────────────────►     │
              │  Skills Bridge ◄─────────────────────────────────────────►      │
              │  Training Bridge ◄───────────────────────────────────────►      │
              │  Compliance Bridge ◄────────────────────────────────────►      │
              │  Payroll Bridge ◄────────────────────────────────────────►       │
              └──────┬──────────┬──────────┬──────────┬──────────┬──────────┬───┘
                     │          │          │          │          │          │
                     │    ┌─────┴────┐    │     ┌─────┴────┐    │     ┌─────┴────┐
                     │    │          │    │     │          │    │     │
                     ▼    ▼          ▼    ▼     ▼          ▼    ▼     ▼
              ┌─────────────────────────────────────────────────────────────────┐
              │                  ALL 24 INDUSTRY OS SERVICES                     │
              │                                                                    │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
              │  │Hospitality│  │Healthcare│  │  Hotel   │  │  Retail  │           │
              │  │  (5010)  │  │  (5020)  │  │  (5025)  │  │  (5030)  │           │
              │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
              │                                                                    │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
              │  │  Legal   │  │Automotive│  │  Beauty  │  │  Sales   │           │
              │  │  (5035)  │  │  (5080)  │  │  (5090)  │  │  (5055)  │           │
              │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
              │                                                                    │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
              │  │Education │  │ RealEst  │  │  Media   │  │  Travel  │           │
              │  │  (5060)  │  │  (5230)  │  │  (5600)  │  │  (5190)  │           │
              │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
              │                                                                    │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
              │  │   Sales  │  │Manufacturing│ │Financial │  │Transport│           │
              │  │  (5055)  │  │  (5150)  │  │  (5220)  │  │  (5240)  │           │
              │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
              └────────────────────────────────────────────────────────────────────┘
```

---

## 📡 How Data Flows

### Example 1: Employee Hired in Hospitality

```
Step 1: Admin creates employee in PeopleOS
        │
        ▼
Step 2: PeopleOS → POST /api/employees (Workforce OS 5065)
        │
        ▼
Step 3: Workforce OS stores employee data
        │
        ├──► Employee saved to database
        ├──► Leave balance initialized
        └──► CorpID issued (Universal ID)
        │
        ▼
Step 4: Workforce Intelligence (5073) aggregates
        │
        ├──► Headcount updated
        ├──► Department distribution updated
        └──► CEO dashboard updated
        │
        ▼
Step 5: Cross-OS Hub (5085) syncs to Industry OS
        │
        ├──► Employee assigned to Hospitality
        ├──► Restaurant OS (5010) receives staff data
        └──► Skills recognized: "food_preparation" → Hospitality
        │
        ▼
Step 6: Employee can now:
        │
        ├──► Use PeopleOS (HR tasks)
        ├──► Access Restaurant OS (job-specific)
        └──► View unified analytics
```

### Example 2: Employee Completes Food Safety Training

```
Step 1: Employee completes training in Restaurant OS (5010)
        │
        ▼
Step 2: Restaurant OS → Cross-OS Hub (5085)
        │
        ├──► POST /api/employees/EMP001/training
        │    Body: { industry: "hospitality", training: "Food Safety" }
        │
        ▼
Step 3: Cross-OS Hub updates:
        │
        ├──► Skills graph: Employee now has "food_safety"
        ├──► Training record: Food Safety certified
        └──► Compliance: Compliant with hospitality regulations
        │
        ▼
Step 4: Cross-OS Hub identifies transferable skills:
        │
        ├──► "food_safety" also valid for: Hotel (5025), Retail (5030)
        └──► Employee flagged for cross-industry roles
        │
        ▼
Step 5: Learning OS (5068) syncs:
        │
        ├──► Employee profile updated
        └──► Skills graph visualization updated
        │
        ▼
Step 6: Workforce Intelligence (5073):
        │
        ├──► Compliance rate updated
        ├──► Skills coverage improved
        └──► AI insights generated
```

### Example 3: AI Analyzes Workforce Health

```
Step 1: CEO opens PeopleOS → Analytics Dashboard
        │
        ▼
Step 2: PeopleOS → GET /api/analytics/overview (5073)
        │
        ▼
Step 3: Workforce Intelligence aggregates from all services:
        │
        ├──► From Workforce OS (5065): Headcount, turnover
        ├──► From Learning OS (5068): Skills coverage
        ├──► From Cross-OS Hub (5085): Industry distribution
        └──► From CorpPerks (4006): Payroll, benefits
        │
        ▼
Step 4: AI analyzes patterns:
        │
        ├──► "Engineering dept showing burnout signals"
        ├──► "3 employees flagged for flight risk"
        ├──► "Hospitality skills gap in bartending"
        └──► "Compliance rate: 87% - needs attention"
        │
        ▼
Step 5: AI Insights Cards generated
        │
        ▼
Step 6: CEO sees unified dashboard with all workforce data
```

---

## 🔌 Actual API Connections

### From PeopleOS Frontend

```javascript
// .env.local
NEXT_PUBLIC_API_URL=http://localhost:5065
NEXT_PUBLIC_TALENT_API_URL=http://localhost:5066
NEXT_PUBLIC_LEARNING_API_URL=http://localhost:5068
NEXT_PUBLIC_ORG_API_URL=http://localhost:5072
NEXT_PUBLIC_INTELLIGENCE_API_URL=http://localhost:5073
```

### From TalentAI Frontend

```javascript
// lib/api.ts
const TALENT_API_URL = 'http://localhost:5066';
```

### Frontend → Backend Calls

| Frontend Page | API Endpoint | Service |
|---------------|-------------|---------|
| Dashboard | `GET /api/employees` | Workforce OS (5065) |
| Leave | `GET /api/leave/balance/:id` | Workforce OS (5065) |
| Attendance | `POST /api/attendance/checkin` | Workforce OS (5065) |
| Payroll | `GET /api/payroll/records` | Workforce OS (5065) |
| Benefits | `GET /api/benefits/plans` | Workforce OS (5065) |
| Pipeline | `GET /api/pipeline/kanban` | Talent OS (5066) |
| Jobs | `GET /api/jobs` | Talent OS (5066) |
| Candidates | `GET /api/candidates` | Talent OS (5066) |
| AI Score | `POST /api/candidates/:id/score` | Talent OS (5066) |
| Courses | `GET /api/courses` | Learning OS (5068) |
| Skills | `GET /api/skills/graph` | Learning OS (5068) |
| Org Chart | `GET /api/org/chart` | Organization OS (5072) |
| Analytics | `GET /api/analytics/overview` | Intelligence (5073) |
| AI Copilot | `POST /api/copilot/chat` | Workforce OS (5065) |

### Backend → Cross-OS Sync

| Workforce OS Event | Cross-OS Hub Action |
|-------------------|---------------------|
| Employee created | Assign to industries |
| Training completed | Update skills |
| Compliance cert added | Update compliance |
| Role changed | Update industry roles |

---

## 🏗️ Service-to-Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           INTERNAL CALLS                                            │
│                                                                                     │
│   Workforce OS (5065)                                                               │
│         │                                                                           │
│         ├──► CorpID (4702)       │ Get Universal ID                              │
│         ├──► Memory OS (4703)    │ Store employee context                         │
│         ├──► TwinOS Hub (4705)   │ Sync Employee Twin                            │
│         ├──► Event Bus (4510)    │ Publish employee events                       │
│         ├──► Learning OS (5068)   │ Get training recommendations                  │
│         ├──► Organization OS    │ Get department/position data                  │
│         │   (5072)                                                                 │
│         └──► Intelligence       │ Get workforce analytics                        │
│             (5073)                                                                 │
│                                                                                     │
│   Talent OS (5066)                                                                 │
│         │                                                                           │
│         ├──► Workforce OS (5065)  │ Verify job department exists                 │
│         ├──► Intelligence (5073) │ Get hiring predictions                        │
│         └──► Event Bus (4510)    │ Publish candidate events                      │
│                                                                                     │
│   Cross-OS Hub (5085)                                                              │
│         │                                                                           │
│         ├──► All 24 Industry OS    │ Sync employee data                          │
│         ├──► Workforce OS (5065)  │ Get employee base data                       │
│         └──► Event Bus (4510)     │ Publish cross-industry events                │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 External Integrations

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                                          │
│                                                                                     │
│   CorpPerks Legacy (4006-4150)                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐      │
│   │  • Payroll Service (4007)        • Shift Service (4010)               │      │
│   │  • Meeting Service (4013)        • Document Service (4014)             │      │
│   │  • Analytics Service (4018)      • Compensation Service (4019)          │      │
│   │  • Role AI Agents (4130)        • CorpPerks Intelligence (4135)        │      │
│   └─────────────────────────────────────────────────────────────────────────┘      │
│                                         │                                          │
│                                         │ Data sync (optional)                     │
│                                         ▼                                          │
│   RTMN Ecosystem                                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐      │
│   │  • RABTUL (Auth, Payment, Wallet)  • SUTAR OS (Goals)               │      │
│   │  • REZ Merchant (Commerce)          • REZ Consumer (Customer)           │      │
│   │  • Nexha (Procurement)             • StayOwn (Hotels)                 │      │
│   │  • AdBazaar (Marketing)            • KHAIRMOVE (Delivery)            │      │
│   └─────────────────────────────────────────────────────────────────────────┘      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Storage

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                            │
│                                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                        MONGODB                                          │      │
│   │                                                                       │      │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │      │
│   │  │ rtmn-workforce  │  │   rtmn-talent   │  │ rtmn-learning   │          │      │
│   │  │                 │  │                 │  │                 │          │      │
│   │  │ • employees     │  │ • jobs          │  │ • courses       │          │      │
│   │  │ • leave         │  │ • candidates    │  │ • enrollments   │          │      │
│   │  │ • attendance    │  │ • interviews    │  │ • certifications│          │      │
│   │  │ • payroll       │  │ • talent_pool   │  │ • assessments  │          │      │
│   │  │ • benefits      │  │ • pipeline      │  │ • skills       │          │      │
│   │  │ • expenses      │  │ • analytics     │  │                 │          │      │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │      │
│   │                                                                       │      │
│   │  ┌─────────────────────────────────────────────────────────────────┐  │      │
│   │  │              rtmn-workforce-intelligence                        │  │      │
│   │  │  • predictions  • sentiment  • insights  • alerts             │  │      │
│   │  └─────────────────────────────────────────────────────────────────┘  │      │
│   │                                                                       │      │
│   └──────────────────────────────────────────────────────────────────────┘      │
│                                      │                                           │
│                                      │ Data flows to                            │
│                                      ▼                                           │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                        TWINOS HUB (4705)                              │      │
│   │                                                                       │      │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │      │
│   │  │ Employee │  │ Payroll  │  │  Leave   │  │ Benefits │            │      │
│   │  │  Twin    │  │  Twin    │  │   Twin   │  │   Twin   │            │      │
│   │  └───────────┘  └───────────┘  └───────────┘  └───────────┘            │      │
│   │                                                                       │      │
│   └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                                     │
│                                                                                     │
│   User opens PeopleOS (3001)                                                      │
│         │                                                                           │
│         ▼                                                                           │
│   ┌─────────────────┐                                                              │
│   │   CorpID (4702) │  ◄─── User enters email/password                            │
│   │                 │                                                              │
│   │   • Verify user │                                                              │
│   │   • Issue JWT   │                                                              │
│   │   • Return ID   │                                                              │
│   └────────┬────────┘                                                              │
│            │ JWT token issued                                                      │
│            ▼                                                                       │
│   ┌─────────────────┐                                                              │
│   │  JWT included  │  ◄─── All API calls include Bearer token                   │
│   │  in requests   │                                                              │
│   └────────┬────────┘                                                              │
│            │                                                                       │
│            ▼                                                                       │
│   ┌─────────────────────────────────┐                                             │
│   │         SERVICE LAYER           │                                             │
│   │                                  │                                             │
│   │   Workforce OS (5065)            │  ◄─── Validates JWT, extracts tenantId     │
│   │   Talent OS (5066)               │  ◄─── Validates JWT, checks permissions   │
│   │   Learning OS (5068)             │  ◄─── Validates JWT, verifies enrollment  │
│   │   Intelligence (5073)            │  ◄─── Validates JWT, aggregates data     │
│   │   Cross-OS Hub (5085)             │  ◄─── Validates JWT, checks industry     │
│   │   Industry OS (5010-5240)        │  ◄─── Validates JWT, checks role          │
│   │                                  │                                             │
│   └─────────────────────────────────┘                                             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Start Everything

```bash
# 1. Start Foundation Services
cd ~/Documents/RTMN
docker-compose up -d

# Or individually:
# CorpID (4702), Memory OS (4703), TwinOS Hub (4705), Event Bus (4510)

# 2. Start Workforce OS Suite
cd industry-os/services
./start-workforce-os.sh start

# 3. Start Cross-OS Integration Hub
cd cross-os-integration && npm start

# 4. Start Frontends
cd companies/CorpPerks/peopleos && npm run dev
cd companies/CorpPerks/talentai && npm run dev

# 5. Start Industry OS (optional, e.g., Restaurant)
cd industry-os/services/restaurant-os && npm start
```

---

## Summary

| Connection | How |
|------------|-----|
| **PeopleOS → Workforce OS** | HTTP REST API (port 5065) |
| **TalentAI → Talent OS** | HTTP REST API (port 5066) |
| **PeopleOS → Learning OS** | HTTP REST API (port 5068) |
| **PeopleOS → Organization OS** | HTTP REST API (port 5072) |
| **PeopleOS → Intelligence** | HTTP REST API (port 5073) |
| **Workforce OS → CorpID** | HTTP REST API (port 4702) |
| **Workforce OS → TwinOS Hub** | HTTP REST API (port 4705) |
| **Workforce OS → Event Bus** | Pub/Sub (port 4510) |
| **Cross-OS → Industry OS** | HTTP REST API (ports 5010-5240) |
| **Intelligence → All Services** | Aggregates data via HTTP |
| **Auth → All Services** | JWT token validated by each service |

**All services communicate via HTTP REST APIs and Event Bus pub/sub!**

