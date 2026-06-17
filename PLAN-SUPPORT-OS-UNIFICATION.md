# RTMN Customer Support OS - Unified Platform

**Version:** 1.0  
**Date:** June 17, 2026  
**Goal:** Combine ALL support features into ONE best-in-class platform

---

## Vision

> *"One platform to rule them all - AI-powered, multi-tenant, omnichannel customer support that predicts problems before they happen and resolves them before customers notice."*

---

## Current State Analysis

### Systems to Combine

| System | Location | Features | Status |
|--------|----------|----------|--------|
| **HOJAI AI** | `hojai-ai/hojai-*` | Customer 360, AI Agents, KB, SLA, Workflow | 14 services |
| **REZ-Consumer** | `REZ-Consumer/` | Care, Tickets, CSAT, Chat | Working |
| **AdBazaar** | `AdBazaar/` | CRM, Help Desk, Chat Widget, Social Inbox | Working |
| **Axomi BPO** | `AdBazaar/axomi-bpo/` | BPO Workers, Voice BPO | Working |

### Feature Matrix

| Feature | HOJAI | REZ | AdBazaar | Axomi | Needed |
|---------|-------|-----|-----------|-------|--------|
| Customer 360 | ✅ | ✅ | ❌ | ❌ | **COMBINE** |
| Ticket System | ✅ | ✅ | ❌ | ❌ | **COMBINE** |
| Knowledge Base | ✅ | ❌ | ✅ | ❌ | **COMBINE** |
| AI Chatbot | ✅ | ✅ | ❌ | ❌ | **UNIFY** |
| AI Agents | ✅ | ✅ | ❌ | ❌ | **UNIFY** |
| CSAT/Sentiment | ✅ | ✅ | ❌ | ❌ | **UNIFY** |
| CRM | ❌ | ❌ | ✅ | ❌ | **ADD** |
| Live Chat Widget | ❌ | ❌ | ✅ | ❌ | **ADD** |
| Social Inbox | ❌ | ❌ | ✅ | ❌ | **ADD** |
| BPO Workers | ❌ | ❌ | ❌ | ✅ | **ADD** |
| Voice BPO | ❌ | ❌ | ❌ | ✅ | **ADD** |
| SLA Tracking | ✅ | ❌ | ❌ | ❌ | ✅ |
| Workflow Engine | ✅ | ❌ | ❌ | ❌ | ✅ |
| Multi-tenant | ✅ | ❌ | ❌ | ❌ | ✅ |
| Integrations | ✅ | Limited | Limited | ❌ | **EXPAND** |

---

## Unified Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER SUPPORT OS                                    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         CUSTOMER LAYER (Frontend)                         │   │
│  │                                                                              │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │   │ Web SDK  │  │Mobile SDK│  │ WhatsApp │  │ Email    │  │ Live Chat│ │   │
│  │   │ (Embed)  │  │ (React)  │  │ Business  │  │ Gateway  │  │ Widget   │ │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                         API GATEWAY (4001)                            │   │
│  │              Auth │ Rate Limit │ Routing │ Multi-tenant               │   │
│  └──────────────────────────────────┬───────────────────────────────────┘   │
│                                      │                                           │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                         CORE SERVICES                                │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │   │   Customer     │  │   Ticket       │  │   Knowledge    │          │   │
│  │   │   Intelligence │  │   Engine       │  │   Base         │          │   │
│  │   │   (CDP)        │  │                │  │                │          │   │
│  │   │   4885         │  │   4872        │  │   4871         │          │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │   │   SLA          │  │   Workflow     │  │   Action       │          │   │
│  │   │   Manager      │  │   Engine       │  │   Registry     │          │   │
│  │   │   4873         │  │   4886         │  │   4887         │          │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │   │   Notification │  │   Integration │  │   CRM          │          │   │
│  │   │   Service      │  │   Hub         │  │   Engine       │          │   │
│  │   │   4880         │  │   4890         │  │   4888         │          │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                          │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                         AI LAYER                                       │   │
│  │                                                                          │   │
│  │   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │   │  Intent    │ │ Sentiment  │ │   Fraud    │ │  Summary   │      │   │
│  │   │  Agent     │ │  Agent     │ │   Agent    │ │   Agent    │      │   │
│  │   └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  │                                                                          │   │
│  │   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │   │  CSAT      │ │Escalation  │ │  Churn     │ │ Recommend  │      │   │
│  │   │  Predict   │ │  Predict   │ │  Predict   │ │   Agent    │      │   │
│  │   └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  │                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────┐      │   │
│  │   │                      Memory Layer                           │      │   │
│  │   │   Conversation │ Customer │ Organization │ Product        │      │   │
│  │   └────────────────────────────────────────────────────────────┘      │   │
│  │                                                                          │   │
│  │   ┌────────────────────────────────────────────────────────────┐      │   │
│  │   │                   Policy Engine                            │      │   │
│  │   │   ALLOW │ DENY │ REQUIRE_APPROVAL │ ESCALATE │ BLOCK     │      │   │
│  │   └────────────────────────────────────────────────────────────┘      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                      AGENT LAYER                                      │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │   │   Agent       │  │   BPO         │  │   Voice        │          │   │
│  │   │   Dashboard   │  │   Manager     │  │   BPO          │          │   │
│  │   │               │  │               │  │   4891         │          │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                          │   │
│  │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │   │   Copilot      │  │   Supervisor   │  │   Reports      │          │   │
│  │   │   (AI Tools)   │  │   Console     │  │   Dashboard    │          │   │
│  │   │   4895         │  │               │  │   4874         │          │   │
│  │   └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  │                                                                          │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Services to Create/Update

### Phase 1: Core Platform (Unify existing)

| Port | Service | Status | Action |
|------|---------|--------|--------|
| 4001 | API Gateway | ✅ Exists | Enhance with all routes |
| 4885 | Customer Intelligence CDP | ✅ Exists | Merge with REZ-care |
| 4872 | Ticket Engine | ✅ Exists | Merge with REZ-care |
| 4871 | Knowledge Base | ✅ Exists | Merge with Axomi Help KB |
| 4873 | SLA Manager | ✅ Exists | Keep as-is |
| 4886 | Workflow Engine | 🔨 Creating | Keep as-is |
| 4887 | Action Registry | 🔨 Creating | Keep as-is |
| 4880 | Notification Service | 🔨 Creating | Keep as-is |
| 4890 | Integration Hub | 🔨 Creating | Expand connectors |
| 4874 | Reports Dashboard | ✅ Exists | Keep as-is |
| 4881 | AI Intelligence | 🔨 Creating | Merge AI agents |

### Phase 2: New Services

| Port | Service | Purpose | Source |
|------|---------|---------|--------|
| 4888 | **CRM Engine** | Deals, Contacts, Pipeline | AdBazaar REZ-crm-hub |
| 4891 | **BPO Manager** | Worker pool, Jobs, Voice | AdBazaar axomi-bpo |
| 4870 | **Unified Inbox** | All channels in one | AdBazaar social inbox |
| 4878 | **Smart Chatbot** | Customer-facing AI | REZ-support-copilot |
| 4892 | **Live Chat Server** | WebSocket chat | AdBazaar live-chat |
| 4893 | **Social Hub** | Instagram, Telegram, etc | AdBazaar |

### Phase 3: Frontend UIs

| UI | Purpose | Source |
|----|---------|--------|
| `support-portal-ui` | Customer-facing portal | REZ-Consumer support/ |
| `agent-dashboard-ui` | Agent workspace | REZ-support-tools-hub |
| `admin-panel-ui` | Admin configuration | New |
| `chat-widget` | Embeddable chat | AdBazaar live-chat-widget |

---

## Feature Implementation

### 1. Customer 360 (Port 4885)

**Combined from:** HOJAI Customer Intel + REZ-care Customer 360

```typescript
interface Customer360 {
  // Identity
  id: string;
  tenantId: string;  // Multi-tenant support
  profile: Profile;
  
  // Orders (from any connected system)
  orders: Order[];
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  
  // Support History
  tickets: Ticket[];
  totalTickets: number;
  openTickets: number;
  avgResolutionTime: number;
  
  // Knowledge (articles viewed)
  viewedArticles: Article[];
  preferences: Preferences;
  
  // AI Predictions
  ai: {
    genuinenessScore: number;      // Trust 0-100
    csatProbability: number;        // Expected rating
    escalationRisk: number;         // % chance
    churnRisk: 'low' | 'medium' | 'high' | 'critical';
    lifetimeValue: number;
  };
  
  // CRM Data (from CRM Engine)
  crm: {
    deals: Deal[];
    contacts: Contact[];
    lastInteraction: Date;
  };
  
  // BPO (if outsourced)
  bpo: {
    assignedWorker?: Worker;
    escalatedTickets: number;
  };
}
```

### 2. Ticket Engine (Port 4872)

**Combined from:** HOJAI Tickets + REZ-care Tickets

```typescript
interface Ticket {
  id: string;
  ticketNumber: string;  // e.g., TKT-2606-00001
  tenantId: string;
  
  // Customer Info (linked to Customer 360)
  customer: CustomerReference;
  customer360?: Customer360;  // Full context
  
  // Classification
  type: 'support' | 'complaint' | 'billing' | 'technical' | 'feedback';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  
  // Assignment
  assignedTo?: {
    type: 'agent' | 'bpo_worker' | 'team';
    id: string;
    name: string;
  };
  team?: Team;
  
  // Content
  subject: string;
  description: string;
  messages: Message[];
  
  // Context (from Customer 360)
  context: {
    relatedOrder?: Order;
    relatedDeal?: Deal;
    recentTickets: Ticket[];
    customerTier: string;
  };
  
  // AI Analysis
  ai: {
    intent: string;
    sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    suggestedResponses: string[];
    similarTickets: Ticket[];
    autoResolved: boolean;
  };
  
  // SLA
  sla: {
    policy: SLAPolicy;
    firstResponseDue: Date;
    resolutionDue: Date;
    breached: boolean;
    breachedAt?: Date;
  };
  
  // Workflow
  workflow?: WorkflowInstance;
  
  // Actions taken
  actions: Action[];
  
  // Feedback
  rating?: {
    score: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    submittedAt: Date;
  };
  
  // Metadata
  tags: string[];
  attachments: Attachment[];
  
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}
```

### 3. Knowledge Base (Port 4871)

**Combined from:** HOJAI KB + Axomi Help KB

```typescript
interface Article {
  id: string;
  tenantId: string;
  
  // Content
  title: string;
  content: string;  // Markdown/HTML
  summary: string;
  
  // Organization
  category: Category;
  subcategory?: string;
  tags: string[];
  
  // SEO
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  
  // Visibility
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'authenticated' | 'internal';
  
  // AI
  ai: {
    embeddings: number[];  // For semantic search
    relatedArticles: Article[];
    suggestedForIntents: string[];
  };
  
  // Feedback
  ratings: {
    helpful: number;
    notHelpful: number;
  };
  
  // Access Control
  allowedTiers: string[];  // e.g., ['vip', 'premium']
  
  versions: ArticleVersion[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. AI Intelligence (Port 4881)

**Combined from:** All AI agents

```typescript
// Intent Detection
interface IntentResult {
  intent: string;
  confidence: number;
  entities: Entity[];
  suggestedActions: string[];
  suggestedArticles: Article[];
}

// Sentiment Analysis
interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  score: number;  // -1 to 1
  emotions: {
    anger: number;
    sadness: number;
    joy: number;
    fear: number;
  };
  escalated: boolean;
}

// CSAT Prediction
interface CSATPrediction {
  predictedScore: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  factors: {
    positive: string[];
    negative: string[];
  };
}

// Escalation Risk
interface EscalationRisk {
  risk: 'low' | 'medium' | 'high' | 'critical';
  probability: number;  // 0-100
  triggers: string[];
  recommendedAction: string;
}

// Genuineness Score
interface GenuinenessScore {
  score: number;  // 0-100
  level: 'low' | 'medium' | 'high';
  factors: {
    orderHistory: number;
    refundRate: number;
    accountAge: number;
    supportHistory: number;
    deviceConsistency: number;
  };
  explanation: string;
}
```

### 5. BPO Manager (Port 4891)

**Combined from:** Axomi BPO

```typescript
interface BPOJob {
  id: string;
  tenantId: string;
  
  // Job Info
  type: 'customer_support' | 'data_entry' | 'moderation' | 
        'transcription' | 'annotation' | 'research' | 'voice';
  clientId: string;
  clientName: string;
  
  // Ticket Reference (if from support)
  ticketId?: string;
  customerId?: string;
  
  // Content
  description: string;
  requirements: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  
  // Assignment
  status: 'pending' | 'assigned' | 'in_progress' | 
          'completed' | 'failed' | 'cancelled';
  assignedWorker?: BPOWorker;
  
  // Voice BPO specific
  voice?: {
    phoneNumber: string;
    duration: number;
    recording?: string;
    transcript?: string;
  };
  
  // Results
  result?: any;
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  
  // Timeline
  deadline?: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface BPOWorker {
  id: string;
  tenantId: string;
  
  // Profile
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  
  // Skills
  skills: BPOSkill[];
  languages: string[];
  certifications: string[];
  
  // Performance
  stats: {
    totalJobs: number;
    completed: number;
    failed: number;
    avgRating: number;
    avgResolutionTime: number;
  };
  
  // Status
  status: 'available' | 'busy' | 'offline';
  currentJob?: BPOJob;
}
```

### 6. CRM Engine (Port 4888)

**Combined from:** AdBazaar REZ-crm-hub

```typescript
interface Contact {
  id: string;
  tenantId: string;
  
  // Identity (linked to Customer 360)
  customerId?: string;
  
  // Info
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  
  // CRM Data
  lifecycleStage: 'lead' | 'prospect' | 'customer' | 'churned';
  leadSource?: string;
  owner?: string;
  
  // HubSpot/Zoho Sync
  externalIds?: {
    hubspot?: string;
    zoho?: string;
  };
  
  // Activities
  activities: Activity[];
  
  // Deals
  deals: Deal[];
}

interface Deal {
  id: string;
  tenantId: string;
  
  // Info
  title: string;
  value: number;
  currency: string;
  
  // Pipeline
  stage: string;
  probability: number;
  
  // Contact
  contactId: string;
  
  // Dates
  expectedClose: Date;
  closedAt?: Date;
  createdAt: Date;
}
```

---

## Customer Experience Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. CUSTOMER VISITS WEBSITE
   │
   ├── Live Chat Widget appears (context-aware)
   │   └── AI greets based on browsing behavior
   │
   └── Customer can:
       ├── Chat with AI Bot (24/7)
       ├── Search Knowledge Base
       └── Create Ticket

2. AI CHAT (Supporter AI)
   │
   ├── Intent Detection → "Track Order"
   ├── Check Customer 360 → Order #12345
   ├── Send tracking link → Instant resolution
   │
   └── If can't resolve:
       ├── Create Ticket
       ├── Auto-classify: Priority + Category
       ├── Predict: CSAT 87%, Escalation 12%
       └── Route to agent

3. AGENT WORKSPACE (Agent Dashboard)
   │
   ├── Opens ticket
   ├── Sees full Customer 360:
   │   ├── 45 orders, ₹50,000 spent
   │   ├── 3 past tickets (all resolved ✓)
   │   ├── VIP tier customer
   │   └── Genuineness: 94/100 🟢
   │
   ├── AI Copilot suggests:
   │   ├── Draft reply
   │   ├── Similar ticket #3847
   │   └── Knowledge article #156
   │
   └── Agent can:
       ├── Reply (AI-assisted)
       ├── Take Action (Refund, Cancel, etc.)
       ├── Escalate to BPO
       └── Close ticket

4. IF COMPLEX → BPO ESCALATION
   │
   ├── Agent escalates ticket
   ├── BPO Job created
   ├── Voice BPO agent calls customer
   ├── Resolution documented
   └── Ticket updated

5. RESOLUTION + FEEDBACK
   │
   ├── Ticket resolved
   ├── CSAT survey sent
   ├── AI predicts CSAT vs actual
   └── Learn for next time
```

---

## API Routes

### Customer APIs
```
GET    /api/customers                    # List customers
GET    /api/customers/:id               # Customer 360
GET    /api/customers/:id/orders        # Order history
GET    /api/customers/:id/tickets       # Support history
GET    /api/customers/:id/context       # Full context for agent
```

### Ticket APIs
```
POST   /api/tickets                     # Create ticket
GET    /api/tickets                     # List tickets
GET    /api/tickets/:id                # Get ticket
PATCH  /api/tickets/:id                # Update ticket
POST   /api/tickets/:id/messages       # Add message
POST   /api/tickets/:id/resolve         # Resolve
POST   /api/tickets/:id/escalate        # Escalate to BPO
POST   /api/tickets/:id/rate            # Rate ticket
```

### Knowledge APIs
```
GET    /api/articles                    # List articles
GET    /api/articles/:id               # Get article
POST   /api/articles                    # Create article
GET    /api/articles/search             # Semantic search
POST   /api/articles/:id/rate           # Rate article
```

### AI APIs
```
POST   /api/ai/analyze                  # Full analysis
POST   /api/ai/intent                   # Intent detection
POST   /api/ai/sentiment                # Sentiment analysis
POST   /api/ai/csat-predict             # CSAT prediction
POST   /api/ai/escalation-risk          # Escalation risk
POST   /api/ai/genuineness              # Trust score
POST   /api/ai/draft-reply             # Generate reply
```

### BPO APIs
```
POST   /api/bpo/jobs                    # Create BPO job
GET    /api/bpo/jobs                    # List jobs
GET    /api/bpo/jobs/:id               # Get job
PATCH  /api/bpo/jobs/:id               # Update job
POST   /api/bpo/workers                 # Register worker
GET    /api/bpo/workers                 # List workers
POST   /api/bpo/voice/call             # Initiate call
```

### CRM APIs
```
GET    /api/contacts                    # List contacts
GET    /api/contacts/:id               # Get contact
POST   /api/contacts                    # Create contact
GET    /api/deals                       # List deals
POST   /api/deals                        # Create deal
POST   /api/crm/sync                    # Sync with HubSpot/Zoho
```

### Channel APIs
```
POST   /api/channels/webhook            # Receive webhooks
POST   /api/channels/email/incoming      # Email incoming
POST   /api/channels/whatsapp/webhook    # WhatsApp webhook
GET    /api/inbox                        # Unified inbox
POST   /api/inbox/:id/respond            # Respond to channel
```

---

## Deployment Plan

### Phase 1: Unify Core (Week 1-2)
1. Merge Customer Intelligence (HOJAI + REZ-care)
2. Merge Ticket Engine (HOJAI + REZ-care)
3. Merge Knowledge Base (HOJAI + Axomi Help)
4. Deploy unified AI Intelligence

### Phase 2: Add CRM + BPO (Week 3-4)
1. Create CRM Engine (from REZ-crm-hub)
2. Create BPO Manager (from Axomi BPO)
3. Add Social Hub
4. Add Live Chat Server

### Phase 3: Frontend UIs (Week 5-6)
1. Build Agent Dashboard UI
2. Build Customer Portal UI
3. Build Admin Panel UI
4. Embeddable Chat Widget

### Phase 4: Integration (Week 7-8)
1. HubSpot/Zoho sync
2. Shopify/WooCommerce integration
3. Payment gateway integration
4. WhatsApp Business API

---

## Success Metrics

| Metric | Target |
|--------|--------|
| First Response Time | < 2 min (chat), < 1 hr (email) |
| Resolution Time | < 4 hours |
| CSAT Score | > 90% |
| AI Resolution Rate | > 60% |
| SLA Compliance | > 95% |
| Agent Productivity | +40% with AI copilot |
| Customer Effort Score | < 3 (1-10 scale) |

---

## Files to Create/Update

### New Services
| Service | Path | Files |
|---------|------|-------|
| CRM Engine | `services/crm-engine/` | ~15 files |
| BPO Manager | `services/bpo-manager/` | ~15 files |
| Social Hub | `services/social-hub/` | ~10 files |
| Live Chat Server | `services/live-chat/` | ~12 files |

### Update Existing
| Service | Action |
|---------|--------|
| Customer Intelligence | Merge with REZ-care |
| Ticket Engine | Merge with REZ-care |
| Knowledge Base | Merge with Axomi Help |
| AI Intelligence | Merge all AI agents |
| Agent Copilot | Enhance with more features |

### Frontend UIs
| UI | Path | Files |
|----|------|-------|
| Agent Dashboard | `ui/agent-dashboard/` | ~50 files |
| Customer Portal | `ui/support-portal/` | ~40 files |
| Chat Widget | `ui/chat-widget/` | ~20 files |

---

**Let's build the best Customer Support OS together! 🚀**
