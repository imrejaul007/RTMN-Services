# HOJAI MERCHANT AI OS
**Version:** 1.0 | **Date:** May 29, 2026 | **Status:** ARCHITECTURE SPEC

---

## Executive Summary

**Merchant AI OS** is the unified platform for businesses (restaurants, salons, clinics, retailers) to run their operations with AI employees.

It is built on top of Hojai Core infrastructure and provides:

- **Customers** - Customer management and intelligence
- **Conversations** - Unified messaging (WhatsApp, Instagram, Web)
- **Memory** - Business memory, preferences, history
- **Workflows** - Business automation
- **AI Employees** - Virtual staff members
- **Knowledge** - Business knowledge base
- **Analytics** - Performance dashboards
- **ROI** - Return on investment tracking

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MERCHANT AI OS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND LAYER                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │Dashboard │ │ Inbox    │ │ Builder  │ │ Reports  │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MODULE LAYER                                 │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  Customers   │  │ Conversations│  │   Memory     │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │ • Profiles   │  │ • WhatsApp  │  │ • Preferences│          │   │
│  │  │ • Segments   │  │ • Instagram  │  │ • History    │          │   │
│  │  │ • Lifetime   │  │ • Web Chat  │  │ • Context    │          │   │
│  │  │ • Insights   │  │ • Inbox     │  │ • SOPs       │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  Workflows   │  │ AI Employees │  │  Knowledge   │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │ • Automations│  │ • Support    │  │ • FAQs      │          │   │
│  │  │ • Sequences  │  │ • Sales      │  │ • Policies   │          │   │
│  │  │ • Triggers  │  │ • Booking    │  │ • Products   │          │   │
│  │  │ • Conditions │  │ • Marketing  │  │ • Pricing    │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐                            │   │
│  │  │  Analytics   │  │    ROI       │                            │   │
│  │  │              │  │              │                            │   │
│  │  │ • Dashboard  │  │ • Revenue    │                            │   │
│  │  │ • Funnels   │  │ • Cost Save  │                            │   │
│  │  │ • Reports   │  │ • ROI Score  │                            │   │
│  │  └──────────────┘  └──────────────┘                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      HOJAI CORE LAYER                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ Events   │ │ Memory   │ │ Workflow  │ │ Agents   │          │   │
│  │  │ (4510)  │ │ (4520)  │ │ (4560)   │ │ (4550)   │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Customers

### 1.1 Purpose

Central customer database with intelligence.

### 1.2 Features

| Feature | Description |
|---------|-------------|
| **Customer Profiles** | Name, phone, email, birthday, tags |
| **Customer Segments** | Auto-segments based on behavior |
| **Lifetime Value** | Predicted LTV per customer |
| **Churn Risk** | At-risk customer identification |
| **Engagement Score** | How active is this customer |
| **Last Contact** | When was last interaction |

### 1.3 Data Model

```typescript
interface Customer {
  // Identity
  id: string;
  tenant_id: string;
  phone?: string;
  email?: string;
  name?: string;
  
  // Profile
  birthday?: string;
  gender?: string;
  location?: string;
  tags: string[];
  
  // Intelligence
  lifetime_value: number;
  order_count: number;
  avg_order_value: number;
  last_order_date?: string;
  first_contact_date: string;
  
  // Engagement
  engagement_score: number; // 0-100
  churn_risk: 'low' | 'medium' | 'high';
  last_interaction_date?: string;
  
  // Segments
  segments: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

interface CustomerSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  
  // Segment Rules
  rules: SegmentRule[];
  
  // Computed
  customer_count: number;
  
  created_at: string;
}

interface SegmentRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}
```

### 1.4 API Endpoints

```
GET    /api/customers              - List customers
POST   /api/customers              - Create customer
GET    /api/customers/:id         - Get customer
PUT    /api/customers/:id          - Update customer
DELETE /api/customers/:id         - Delete customer

GET    /api/customers/:id/orders  - Customer orders
GET    /api/customers/:id/timeline - Customer timeline

GET    /api/segments              - List segments
POST   /api/segments             - Create segment
GET    /api/segments/:id/customers - Segment customers
```

---

## Module 2: Conversations

### 2.1 Purpose

Unified inbox for all customer communications.

### 2.2 Channels

| Channel | Description | Integration |
|---------|------------|------------|
| **WhatsApp** | Primary messaging | Twilio WhatsApp |
| **Instagram** | DM handling | Instagram API |
| **Web Chat** | Website visitors | Web widget |
| **Facebook** | Messenger | Facebook API |

### 2.3 Features

| Feature | Description |
|---------|-------------|
| **Unified Inbox** | All channels in one place |
| **Smart Routing** | Auto-assign to AI or human |
| **Canned Responses** | Pre-written replies |
| **Templates** | WhatsApp message templates |
| **Private Notes** | Internal notes on conversations |
| **Tags** | Organize conversations |
| **Status** | Open, Pending, Closed |

### 2.4 Data Model

```typescript
interface Conversation {
  id: string;
  tenant_id: string;
  
  // Participants
  customer_id: string;
  channel: 'whatsapp' | 'instagram' | 'webchat' | 'facebook';
  channel_conversation_id: string; // External ID
  
  // Status
  status: 'open' | 'pending' | 'closed';
  assigned_to?: string; // Agent or AI
  
  // Content
  messages: Message[];
  last_message?: Message;
  
  // Context
  tags: string[];
  notes: string;
  
  // Metadata
  started_at: string;
  last_message_at: string;
  closed_at?: string;
  
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  
  // Sender
  sender_type: 'customer' | 'agent' | 'ai';
  sender_id: string;
  
  // Content
  content: string;
  content_type: 'text' | 'image' | 'document' | 'location' | 'button';
  media_url?: string;
  
  // AI
  ai_generated?: boolean;
  ai_confidence?: number;
  
  // Status
  status: 'sent' | 'delivered' | 'read' | 'failed';
  
  created_at: string;
}

interface InboxRule {
  id: string;
  tenant_id: string;
  name: string;
  
  // Conditions
  conditions: {
    field: 'channel' | 'customer_segment' | 'time' | 'keywords';
    operator: string;
    value: any;
  }[];
  
  // Action
  action: {
    type: 'assign_ai' | 'assign_agent' | 'tag' | 'priority';
    value: string;
  };
  
  enabled: boolean;
}
```

### 2.5 API Endpoints

```
GET    /api/conversations              - List conversations
POST   /api/conversations              - Start conversation
GET    /api/conversations/:id         - Get conversation
PUT    /api/conversations/:id         - Update conversation
POST   /api/conversations/:id/close   - Close conversation

POST   /api/conversations/:id/messages - Send message
GET    /api/conversations/:id/messages - Get messages

GET    /api/inbox                      - Inbox view
PUT    /api/inbox/bulk-assign          - Bulk assign

GET    /api/rules                      - Inbox rules
POST   /api/rules                      - Create rule
```

---

## Module 3: Memory

### 3.1 Purpose

Persistent memory for each customer and business.

### 3.2 Memory Types

| Type | Description | Examples |
|------|-------------|----------|
| **Customer Preferences** | What customer likes | "Prefers window seat", "Vegan" |
| **Customer History** | Past interactions | Orders, complaints, purchases |
| **Business SOPs** | Standard procedures | "Refund policy", "Opening hours" |
| **Context** | Current situation | "Customer waiting for order" |

### 3.3 Data Model

```typescript
interface MemoryEntry {
  id: string;
  tenant_id: string;
  
  // Memory Type
  type: 'customer_preference' | 'customer_history' | 'business_sop' | 'conversation_context';
  
  // Scope
  scope_type: 'customer' | 'business' | 'conversation';
  scope_id: string;
  
  // Content
  key: string;           // "dietary_preference"
  value: string;         // "Vegan"
  confidence: number;    // 0-1
  
  // Source
  source: 'ai_extracted' | 'manual' | 'behavior' | 'conversation';
  extracted_at: string;
  
  // Expiry
  expires_at?: string;
  
  created_at: string;
  updated_at: string;
}

// Customer Preference Example
interface CustomerPreference extends MemoryEntry {
  type: 'customer_preference';
  scope_type: 'customer';
  scope_id: string; // customer_id
  
  key: 'dietary' | 'preferred_items' | 'payment_method' | 'communication_style';
  value: string;
  source: 'conversation' | 'behavior' | 'manual';
}

// Business SOP Example
interface BusinessSOP extends MemoryEntry {
  type: 'business_sop';
  scope_type: 'business';
  scope_id: string; // tenant_id
  
  key: 'refund_policy' | 'delivery_terms' | 'opening_hours' | 'response_time';
  value: string;
  source: 'manual';
}

// Conversation Context Example
interface ConversationContext extends MemoryEntry {
  type: 'conversation_context';
  scope_type: 'conversation';
  scope_id: string; // conversation_id
  
  key: 'current_topic' | 'pending_action' | 'customer_mood';
  value: string;
  source: 'ai_extracted';
  
  expires_at: string; // Expires after conversation closes
}
```

### 3.4 API Endpoints

```
GET    /api/memory/customer/:id      - Get customer memory
POST   /api/memory/customer/:id      - Add customer memory
PUT    /api/memory/customer/:id/:entryId - Update entry
DELETE /api/memory/customer/:id/:entryId - Delete entry

GET    /api/memory/business          - Get business memory (SOPs)
POST   /api/memory/business          - Add business SOP
PUT    /api/memory/business/:id      - Update SOP
DELETE /api/memory/business/:id      - Delete SOP

GET    /api/memory/context/:conversationId - Get conversation context
POST   /api/memory/context/:conversationId - Set context
```

---

## Module 4: Workflows

### 4.1 Purpose

Business automation and customer journeys.

### 4.2 Workflow Types

| Type | Description | Example |
|------|-------------|---------|
| **Automation** | Trigger-based actions | "Order confirmed → Send SMS" |
| **Sequence** | Time-based messages | "Day 1, 3, 7 follow-up" |
| **Broadcast** | One-time campaigns | "Festival sale announcement" |
| **Reaction** | Customer action response | "Left cart → Send reminder" |

### 4.3 Data Model

```typescript
interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  
  // Workflow Type
  type: 'automation' | 'sequence' | 'broadcast' | 'reaction';
  
  // Status
  status: 'draft' | 'active' | 'paused' | 'completed';
  
  // Trigger
  trigger: WorkflowTrigger;
  
  // Steps
  steps: WorkflowStep[];
  
  // Audience (for broadcast/sequence)
  audience?: WorkflowAudience;
  
  // Stats
  stats: {
    total_recipients: number;
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
  
  created_at: string;
  updated_at: string;
}

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'api';
  
  // For event triggers
  event_type?: string;           // 'order.created', 'customer.tagged'
  event_conditions?: Condition[];
  
  // For schedule triggers
  schedule_cron?: string;       // '0 9 * * *' (every day at 9am)
  schedule_timezone?: string;   // 'Asia/Kolkata'
  
  // For API triggers
  api_endpoint?: string;
}

interface WorkflowStep {
  id: string;
  order: number;
  
  type: 'message' | 'delay' | 'condition' | 'action' | 'ai';
  
  // Message Step
  message?: {
    channel: 'whatsapp' | 'sms' | 'email' | 'push';
    template?: string;
    content?: string;
    media?: { type: 'image' | 'document'; url: string };
    buttons?: { text: string; action: string }[];
  };
  
  // Delay Step
  delay?: {
    duration: number;           // In minutes
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
  };
  
  // Condition Step
  condition?: {
    field: string;
    operator: string;
    value: any;
    
    // Branch steps
    if_true: string[];         // Step IDs if true
    if_false: string[];       // Step IDs if false
  };
  
  // Action Step
  action?: {
    type: 'add_tag' | 'remove_tag' | 'update_field' | 'webhook' | 'assign';
    value: any;
  };
  
  // AI Step
  ai?: {
    prompt: string;
    response_type: 'text' | 'action';
    actions?: string[];
  };
}

interface Condition {
  field: string;        // 'customer.lifetime_value'
  operator: string;     // 'gt', 'eq', 'contains'
  value: any;
}

interface WorkflowAudience {
  type: 'all' | 'segment' | 'filter';
  
  // For segment
  segment_id?: string;
  
  // For filter
  filters?: {
    field: string;
    operator: string;
    value: any;
  }[];
}
```

### 4.4 API Endpoints

```
GET    /api/workflows               - List workflows
POST   /api/workflows               - Create workflow
GET    /api/workflows/:id           - Get workflow
PUT    /api/workflows/:id           - Update workflow
DELETE /api/workflows/:id          - Delete workflow

POST   /api/workflows/:id/activate  - Activate workflow
POST   /api/workflows/:id/pause    - Pause workflow
POST   /api/workflows/:id/test      - Test workflow

POST   /api/workflows/:id/trigger   - Trigger workflow (manual)
GET    /api/workflows/:id/stats    - Workflow stats
GET    /api/workflows/:id/runs     - Workflow run history
```

---

## Module 5: AI Employees

### 5.1 Purpose

Virtual staff members that handle customer interactions.

### 5.2 AI Employee Types

| Type | Role | Capabilities |
|------|------|--------------|
| **Support Agent** | Answer questions | FAQ, order status, troubleshooting |
| **Sales Agent** | Drive conversions | Product recommendations, offers |
| **Booking Agent** | Handle reservations | Appointments, scheduling |
| **Marketing Agent** | Engage customers | Campaigns, promotions, reactivation |
| **Retention Agent** | Win back churn | Win-back offers, surveys |

### 5.3 Data Model

```typescript
interface AIEmployee {
  id: string;
  tenant_id: string;
  name: string;
  avatar_url?: string;
  
  // Role
  type: 'support' | 'sales' | 'booking' | 'marketing' | 'retention';
  
  // Configuration
  config: AIEmployeeConfig;
  
  // Behavior
  behavior: AIBehavior;
  
  // Knowledge
  knowledge_base_ids: string[];
  
  // Status
  status: 'active' | 'training' | 'inactive';
  
  // Stats
  stats: {
    total_conversations: number;
    avg_resolution_time: number; // minutes
    customer_satisfaction: number; // 0-5
    escalation_rate: number; // 0-1
  };
  
  created_at: string;
  updated_at: string;
}

interface AIEmployeeConfig {
  // Working Hours
  working_hours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      day: number; // 0-6 (Sunday-Saturday)
      start_time: string; // '09:00'
      end_time: string;   // '18:00'
    }[];
  };
  
  // Auto-Responses
  auto_respond: {
    enabled: boolean;
    max_response_time: number; // seconds
  };
  
  // Human Handoff
  handoff: {
    enabled: boolean;
    conditions: HandoffCondition[];
    handoff_message: string;
  };
  
  // Limits
  limits: {
    max_conversations_per_hour: number;
    max_messages_per_conversation: number;
  };
}

interface HandoffCondition {
  type: 'keyword' | 'sentiment' | 'intent' | 'escalation_count';
  operator: 'contains' | 'eq' | 'gt';
  value: any;
}

interface AIBehavior {
  // Tone
  tone: 'formal' | 'friendly' | 'casual' | 'professional';
  
  // Communication
  language: string[];  // ['en', 'hi']
  use_emoji: boolean;
  max_response_length: number; // characters
  
  // Personality
  traits: string[];  // 'helpful', 'patient', 'efficient'
  
  // Guardrails
  disallowed_topics: string[];
  require_approval_for: string[];  // 'refund', 'discount'
  escalation_keywords: string[];
}
```

### 5.4 API Endpoints

```
GET    /api/ai-employees           - List AI employees
POST   /api/ai-employees           - Create AI employee
GET    /api/ai-employees/:id       - Get AI employee
PUT    /api/ai-employees/:id       - Update AI employee
DELETE /api/ai-employees/:id       - Delete AI employee

POST   /api/ai-employees/:id/train - Train AI employee
POST   /api/ai-employees/:id/test   - Test AI employee

GET    /api/ai-employees/:id/stats - Get AI employee stats
GET    /api/ai-employees/:id/conversations - Get conversations

POST   /api/ai-employees/:id/activate - Activate
POST   /api/ai-employees/:id/pause    - Pause
```

---

## Module 6: Knowledge Base

### 6.1 Purpose

Business information that AI employees use to answer questions.

### 6.2 Knowledge Types

| Type | Description | Examples |
|------|-------------|----------|
| **FAQ** | Frequently asked questions | "What are your hours?" |
| **Products** | Product catalog info | Prices, availability |
| **Policies** | Business policies | Refund, delivery |
| **Pricing** | Pricing information | Menu, service rates |
| **Team** | Staff info | Availability, expertise |

### 6.3 Data Model

```typescript
interface KnowledgeBase {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  
  // Categories
  categories: KnowledgeCategory[];
  
  // Articles
  articles: KnowledgeArticle[];
  
  // Settings
  settings: {
    ai_enabled: boolean;
    search_enabled: boolean;
    public_access: boolean;
  };
  
  created_at: string;
  updated_at: string;
}

interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

interface KnowledgeArticle {
  id: string;
  category_id: string;
  
  // Content
  question: string;
  answer: string;
  
  // Variants (for NLP)
  variations: string[];  // Alternative phrasings
  
  // Metadata
  tags: string[];
  
  // Status
  status: 'draft' | 'published' | 'archived';
  
  // AI Training
  ai_training_data: {
    confidence_score: number;
    last_trained_at?: string;
    usage_count: number;
    helpful_count: number;
    unhelpful_count: number;
  };
  
  created_at: string;
  updated_at: string;
}

interface ProductKnowledge {
  id: string;
  tenant_id: string;
  
  // Product Info
  name: string;
  description?: string;
  category: string;
  
  // Pricing
  price: number;
  currency: string;
  variants?: { name: string; price: number }[];
  
  // Availability
  available: boolean;
  stock_count?: number;
  preparation_time?: number; // minutes
  
  // Images
  images: string[];
  
  // AI Context
  ai_description?: string;  // SEO-optimized description
  keywords: string[];
  
  created_at: string;
  updated_at: string;
}
```

### 6.4 API Endpoints

```
# Knowledge Base
GET    /api/knowledge              - Get knowledge base
PUT    /api/knowledge              - Update settings

# Categories
GET    /api/knowledge/categories   - List categories
POST   /api/knowledge/categories   - Create category
PUT    /api/knowledge/categories/:id - Update category
DELETE /api/knowledge/categories/:id - Delete category

# Articles
GET    /api/knowledge/articles    - List articles
POST   /api/knowledge/articles     - Create article
GET    /api/knowledge/articles/:id - Get article
PUT    /api/knowledge/articles/:id - Update article
DELETE /api/knowledge/articles/:id - Delete article

# Products
GET    /api/knowledge/products    - List products
POST   /api/knowledge/products    - Create product
PUT    /api/knowledge/products/:id - Update product
DELETE /api/knowledge/products/:id - Delete product

# Search
GET    /api/knowledge/search      - Search knowledge base
POST   /api/knowledge/ai-query    - AI-powered query
```

---

## Module 7: Analytics

### 7.1 Purpose

Performance dashboards and insights.

### 7.2 Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Overview** | Key metrics at a glance |
| **Conversations** | Inbox and message stats |
| **Customers** | Customer acquisition and retention |
| **AI Performance** | AI employee metrics |
| **Workflows** | Automation performance |

### 7.3 Data Model

```typescript
interface AnalyticsMetrics {
  tenant_id: string;
  period: {
    start: string;
    end: string;
  };
  
  // Overview
  overview: {
    total_customers: number;
    new_customers: number;
    total_conversations: number;
    total_messages: number;
    avg_response_time: number; // seconds
  };
  
  // Revenue
  revenue: {
    total: number;
    avg_order_value: number;
    orders_count: number;
  };
  
  // AI Performance
  ai_performance: {
    total_ai_conversations: number;
    ai_resolution_rate: number;
    avg_ai_resolution_time: number;
    customer_satisfaction: number;
    escalation_rate: number;
  };
  
  // Engagement
  engagement: {
    active_customers: number;
    message_opens: number;
    link_clicks: number;
    campaign_conversions: number;
  };
}

interface ConversationMetrics {
  tenant_id: string;
  period: {
    start: string;
    end: string;
  };
  
  // Volume
  total_conversations: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  
  // Response
  avg_first_response_time: number;
  avg_resolution_time: number;
  messages_per_conversation: number;
  
  // Quality
  csat_score: number;
  ai_accuracy: number;
  
  // Trends
  hourly_distribution: number[];
  daily_trend: { date: string; count: number }[];
}

interface CustomerMetrics {
  tenant_id: string;
  period: {
    start: string;
    end: string;
  };
  
  // Acquisition
  new_customers: number;
  by_channel: Record<string, number>;
  
  // Retention
  retention_rate: number;
  churned_customers: number;
  
  // Value
  avg_lifetime_value: number;
  top_customers: { customer_id: string; value: number }[];
  
  // Segments
  segment_distribution: { segment: string; count: number }[];
}
```

### 7.4 API Endpoints

```
GET    /api/analytics/overview    - Overview metrics
GET    /api/analytics/conversations - Conversation metrics
GET    /api/analytics/customers    - Customer metrics
GET    /api/analytics/revenue     - Revenue metrics
GET    /api/analytics/ai           - AI performance

GET    /api/analytics/trends      - Time series data
GET    /api/analytics/comparison   - Period comparison

GET    /api/analytics/export      - Export data
```

---

## Module 8: ROI Dashboard

### 8.1 Purpose

Show the business value of using Merchant AI OS.

### 8.2 ROI Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Time Saved** | Hours saved by automation | AI conversations × avg time |
| **Cost Savings** | Reduced staffing costs | Hours saved × hourly rate |
| **Revenue Impact** | Revenue from AI-driven sales | Attribution from AI |
| **CSAT Improvement** | Customer satisfaction | Before vs After |
| **Response Rate** | Message response improvement | Open rate improvement |

### 8.3 Data Model

```typescript
interface ROIDashboard {
  tenant_id: string;
  period: {
    start: string;
    end: string;
  };
  
  // Time Savings
  time_savings: {
    hours_saved: number;
    avg_hourly_rate: number;
    currency: string;
  };
  
  // Cost Savings
  cost_savings: {
    staffing_hours_reduced: number;
    monthly_savings: number;
    annualized_savings: number;
  };
  
  // Revenue Impact
  revenue_impact: {
    ai_attributed_revenue: number;
    conversion_uplift: number;
    avg_order_increase: number;
  };
  
  // Customer Impact
  customer_impact: {
    csat_improvement: number;
    response_rate_improvement: number;
    resolution_time_improvement: number;
  };
  
  // Overall ROI
  roi_score: {
    monthly_roi: number;      // percentage
    payback_period: number;     // months
    customer_ltv_impact: number;
  };
}

interface CostBreakdown {
  category: 'ai_platform' | 'human_agent' | 'automation' | 'tools';
  item: string;
  cost: number;
  frequency: 'monthly' | 'yearly';
}
```

### 8.4 API Endpoints

```
GET    /api/roi/dashboard         - ROI overview
GET    /api/roi/time-savings      - Time savings details
GET    /api/roi/cost-savings      - Cost breakdown
GET    /api/roi/revenue            - Revenue impact
GET    /api/roi/comparison         - Before vs after

GET    /api/roi/report            - Full ROI report
GET    /api/roi/export             - Export report
```

---

## Port Registry

| Service | Port | Module |
|---------|------|--------|
| Merchant AI OS API | 4400 | All modules |
| Customer Service | 4401 | Customers |
| Conversation Service | 4402 | Conversations |
| Memory Service | 4403 | Memory |
| Workflow Service | 4404 | Workflows |
| AI Employee Service | 4405 | AI Employees |
| Knowledge Service | 4406 | Knowledge Base |
| Analytics Service | 4407 | Analytics |
| ROI Service | 4408 | ROI Dashboard |

---

## Integration with Hojai Core

```
Merchant AI OS
    │
    ├── Customers ──────────────► Memory (4520)
    │       │
    │       └──► Signals ───────► Event Bus (4510)
    │
    ├── Conversations ──────────► Communications (4570)
    │       │
    │       └──► AI ────────────► Agent Runtime (4550)
    │
    ├── Workflows ─────────────► Workflow Engine (4560)
    │
    ├── AI Employees ───────────► Agent Registry (4550)
    │       │
    │       └──► Knowledge ─────► Knowledge Base (4406)
    │
    └── Analytics ──────────────► Event Bus (4510)
            │
            └──► Insights ─────► Analytics (4580)
```

---

## Migration from Current Services

### Phase 1: Consolidate

| Current Service | Migration To |
|----------------|-------------|
| REZ-whatsapp (4202) | Merchant AI OS - Conversations |
| REZ-care-service (4058) | Merchant AI OS - AI Employees |
| REZ-memory-layer (4201) | Merchant AI OS - Memory |

### Phase 2: Enhance

- Add Analytics module
- Add ROI module
- Add Workflow builder

### Phase 3: Scale

- Multi-tenant support
- Industry templates
- Self-service onboarding

---

## Document Version

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 29, 2026 | Hojai AI | Initial spec |

---

*This is the Merchant AI OS Architecture Specification.*
