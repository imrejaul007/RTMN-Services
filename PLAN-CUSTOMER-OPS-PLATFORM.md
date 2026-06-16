# RTMN Customer Operations Platform - Final Architecture

**Version:** 1.0  
**Vision:** AI-native Customer Operations Platform  
**Target:** Enterprise-grade, multi-domain, extensible  
**Score:** 8.8/10 → Targeting 9.5/10

---

## Executive Summary

```
RTMN is not a support platform.

It is a Customer Operations Platform.

Where every customer interaction becomes intelligence,
every insight becomes action,
and every action becomes learning.
```

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│                          RTMN PLATFORM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        ┌─────────────┐                              │
│                        │   TENANT    │  ← Amazon, Stripe, Swiggy   │
│                        │  (Company)  │                             │
│                        └──────┬──────┘                              │
│                               │                                     │
│                        ┌──────▼──────┐                              │
│                        │  PROJECTS   │  ← Web, Mobile, Admin, API  │
│                        │ (Channels)  │                             │
│                        └──────┬──────┘                              │
│                               │                                     │
│  ┌────────────────────────────┼────────────────────────────────┐  │
│  │                     CUSTOMER 360                              │  │
│  │                            │                                  │  │
│  │    ┌────────────┬──────────┼──────────┬────────────┐         │  │
│  │    │            │          │          │            │         │  │
│  │    ▼            ▼          ▼          ▼            ▼         │  │
│  │ Orders      Payments    Sessions   Devices    Conversations   │  │
│  │ Subs         CRM         Usage      Location    Tickets       │  │
│  │ Invoices     Marketing   Features   Network    KB Views       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                               │                                     │
│                               ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              CUSTOMER INTELLIGENCE LAYER                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Identity│ │  Risk   │ │Predict  │ │ Segment │       │   │
│  │  │ Resolut.│ │  Score  │ │ Engine  │ │ Engine  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              CONTEXT COMPOSER API                          │   │
│  │                                                            │   │
│  │  GET /customer-context/:id                                │   │
│  │                                                            │   │
│  │  Returns unified, composable customer profile               │   │
│  └───────────────────────────────────────────────────────────┘   │
│                               │                                     │
│     ┌─────────────────────────┼─────────────────────────┐       │
│     │                         │                         │       │
│     ▼                         ▼                         ▼       │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐      │
│  │  Hojai  │           │ Workflow │           │ Business│      │
│  │  Agents │           │  Engine  │           │ Actions │      │
│  └─────────┘           └─────────┘           └─────────┘      │
│                               │                         │       │
│                               ▼                         ▼       │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                  AGENT COPILOT                            │   │
│  │                                                            │   │
│  │  • Draft replies      • Predict CSAT     • Suggest KB    │   │
│  │  • Summarize          • Detect SLA risk  • Auto-fill     │   │
│  │  • Translate          • Highlight gaps   • Generate notes │   │
│  └───────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                  BUSINESS OUTCOMES                         │   │
│  │                                                            │   │
│  │  Ticket Resolution  •  Refund Processing  •  Order Update  │   │
│  │  CRM Sync          •  Account Changes    •  Notifications  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Customer Data Platform (CDP)

### 1.1 Customer Intelligence Service
**Port:** 4885  
**Location:** `/companies/hojai-ai/hojai-customer-intelligence/`

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER INTELLIGENCE SERVICE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Purpose: Single source of truth for every customer                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DATA INGESTION                           │   │
│  │                                                              │   │
│  │  Real-time Events                                           │   │
│  │  ├── order.created          → Customer profile updates       │   │
│  │  ├── payment.completed      → Lifetime value recalculated    │   │
│  │  ├── ticket.created         → Support count incremented      │   │
│  │  ├── conversation.ended     → Sentiment recorded             │   │
│  │  ├── refund.issued          → Refund rate updated            │   │
│  │  └── subscription.upgraded  → Tier updated                   │   │
│  │                                                              │   │
│  │  Batch Sync (daily)                                        │   │
│  │  ├── CRM data          → Enrich profile                     │   │
│  │  ├── Marketing data    → Campaign attribution               │   │
│  │  └── Usage analytics   → Feature adoption                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  CUSTOMER PROFILE                           │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "id": "cust_abc123",                                    │   │
│  │    "identifiers": {                                        │   │
│  │      "email": "john@example.com",                          │   │
│  │      "phone": "+91XXXXXXXX",                               │   │
│  │      "deviceIds": ["device_1", "device_2"],                 │   │
│  │      "orderIds": ["order_1", "order_2"],                   │   │
│  │      "crmId": "lead_28"                                    │   │
│  │    },                                                       │   │
│  │    "attributes": {                                         │   │
│  │      "name": "John Doe",                                   │   │
│  │      "avatar": "https://...",                              │   │
│  │      "language": "en",                                     │   │
│  │      "timezone": "Asia/Kolkata",                           │   │
│  │      "createdAt": "2022-01-15",                            │   │
│  │      "lastSeen": "2026-06-16T10:30:00Z"                   │   │
│  │    },                                                       │   │
│  │    "segments": ["premium", "repeat_buyer", "low_risk"],    │   │
│  │    "metrics": {                                            │   │
│  │      "lifetimeValue": 2500.00,                             │   │
│  │      "orderCount": 12,                                     │   │
│  │      "avgOrderValue": 208.33,                              │   │
│  │      "refundRate": 0.08,                                   │   │
│  │      "supportTickets": 5,                                  │   │
│  │      "csat": 4.6,                                         │   │
│  │      "churnRisk": 0.12,                                   │   │
│  │      "npsScore": 8                                        │   │
│  │    },                                                      │   │
│  │    "riskScore": {                                         │   │
│  │      "score": 96,                                          │   │
│  │      "level": "low",                                       │   │
│  │      "factors": [                                          │   │
│  │        "5 successful orders",                              │   │
│  │        "No chargebacks",                                    │   │
│  │        "Stable device",                                    │   │
│  │        "Good payment history"                               │   │
│  │      ],                                                     │   │
│  │      "confidence": 0.93                                    │   │
│  │    },                                                      │   │
│  │    "preferences": {                                        │   │
│  │      "notifications": true,                                 │   │
│  │      "marketing": false,                                   │   │
│  │      "language": "en"                                      │   │
│  │    }                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Identity Resolution
**Purpose:** Unify fragmented customer identities

```
┌─────────────────────────────────────────────────────────────────────┐
│                     IDENTITY RESOLUTION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Problem: One customer may appear as                               │
│                                                                     │
│  john@gmail.com ──┐                                                │
│  John Doe ────────┼──► cust_abc123                                │
│  +91XXXXXXXX ─────┤                                                │
│  Device ABC ──────┤                                                │
│  Order #9002 ─────┘                                                │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Resolution Rules:                                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Rule Type          │  Confidence   │  Action              │   │
│  │  ─────────────────────────────────────────────────────────│   │
│  │  Email exact match  │  High (95%)   │  Merge candidates     │   │
│  │  Phone exact match  │  High (95%)   │  Merge candidates     │   │
│  │  Device fingerprint │  Medium (80%) │  Probable match       │   │
│  │  Same IP + time     │  Low (60%)    │  Possible match      │   │
│  │  Name + Email guess │  Very Low     │  Manual review       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Merge Flow:                                                       │
│                                                                     │
│  New Event (email: john@gmail.com)                                 │
│         │                                                          │
│         ▼                                                          │
│  Check Identity Graph                                              │
│         │                                                          │
│         ├── Found: cust_abc123 → Link to existing                  │
│         │                                                          │
│         └── Not Found → Create new cust_xyz                        │
│                                                                     │
│  Periodic: Re-run resolution for ambiguous identities              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Integration Framework

### 2.1 Integration Hub
**Port:** 4890  
**Location:** `/companies/hojai-ai/hojai-integration-hub/`

```
┌─────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION HUB                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         ┌─────────────────┐                          │
│                         │  Integration   │                          │
│                         │     Hub        │                          │
│                         │    (4890)      │                          │
│                         └────────┬────────┘                          │
│                                  │                                   │
│     ┌────────────────────────────┼────────────────────────────────┐ │
│     │                            │                                │ │
│     │         Standard Connectors Framework                      │ │
│     │         (Unified contract for all integrations)             │ │
│     │                            │                                │ │
│     │    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │ │
│     │    │ Orders │ │Payments│ │   CRM  │ │   KB   │             │ │
│     │    │ Conn.  │ │ Conn.  │ │ Conn.  │ │ Conn.  │             │ │
│     │    └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘             │ │
│     │         │          │          │          │                   │ │
│     │    ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐             │ │
│     │    │Shopify │ │ Stripe │ │HubSpot │ │Conflu. │             │ │
│     │    │     │ │ │     │ │ │     │ │ │     │ │             │ │
│     │    │Razorpay│ │Paypal │ │   Zoho │ │ Notion │             │ │
│     │    │     │ │ │     │ │ │     │ │ │     │ │             │ │
│     │    └────────┘ └────────┘ └────────┘ └────────┘             │ │
│     │                                                           │ │
│     └───────────────────────────────────────────────────────────┘ │
│                                  │                                  │
│                                  ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  STANDARD CONNECTOR CONTRACT                  │  │
│  │                                                              │  │
│  │  Interface Connector {                                        │  │
│  │    connect(): Promise<void>                                   │  │
│  │    disconnect(): Promise<void>                                │  │
│  │    healthCheck(): Promise<boolean>                            │  │
│  │    // Standard operations                                     │  │
│  │    getCustomer(id): Promise<Customer>                         │  │
│  │    getOrders(customerId): Promise<Order[]>                    │  │
│  │    getSubscriptions(customerId): Promise<Subscription[]>      │  │
│  │    getPayments(customerId): Promise<Payment[]>                │  │
│  │    // Webhook handling                                        │  │
│  │    handleWebhook(event): Promise<void>                       │  │
│  │  }                                                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Built-in Connectors

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONNECTOR REGISTRY                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  E-COMMERCE                                                       │
│  ├── Shopify Connector                                             │
│  ├── WooCommerce Connector                                        │
│  ├── Magento Connector                                            │
│  ├── Custom Store API                                             │
│                                                                     │
│  PAYMENTS                                                          │
│  ├── Stripe Connector                                             │
│  ├── Razorpay Connector                                           │
│  ├── PayPal Connector                                             │
│  ├── Bank Transfer Connector                                      │
│                                                                     │
│  CRM                                                              │
│  ├── HubSpot Connector                                            │
│  ├── Zoho CRM Connector                                          │
│  ├── Salesforce Connector                                         │
│  ├── Freshsales Connector                                        │
│                                                                     │
│  KNOWLEDGE & DOCS                                                 │
│  ├── Confluence Connector                                         │
│  ├── Notion Connector                                            │
│  ├── Guru Connector                                              │
│  ├── Zendesk Guide Connector                                      │
│                                                                     │
│  ANALYTICS                                                        │
│  ├── Mixpanel Connector                                          │
│  ├── Amplitude Connector                                          │
│  ├── Segment Connector                                           │
│  ├── Google Analytics Connector                                   │
│                                                                     │
│  MESSAGING                                                        │
│  ├── Twilio (SMS) Connector                                      │
│  ├── Resend (Email) Connector                                    │
│  ├── FCM (Push) Connector                                        │
│  ├── WhatsApp Connector                                          │
│  ├── Slack Connector                                             │
│                                                                     │
│  PROJECT MANAGEMENT                                               │
│  ├── Jira Connector                                              │
│  ├── Linear Connector                                           │
│  ├── Asana Connector                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Workflow Engine

### 3.1 Workflow Service
**Port:** 4886  
**Location:** `/companies/hojai-ai/hojai-workflow-engine/`

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW ENGINE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Purpose: Execute complex business processes with approval chains    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WORKFLOW DEFINITION                        │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "name": "High-Value Refund Approval",                    │   │
│  │    "trigger": "refund.requested",                          │   │
│  │    "conditions": [                                          │   │
│  │      { "field": "amount", "operator": ">", "value": 10000 }  │   │
│  │    ],                                                       │   │
│  │    "steps": [                                              │   │
│  │      {                                                      │   │
│  │        "type": "approval",                                 │   │
│  │        "approver": "team_lead",                            │   │
│  │        "timeout": 3600                                      │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "type": "approval",                                 │   │
│  │        "approver": "finance_manager",                       │   │
│  │        "timeout": 7200                                      │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "type": "action",                                   │   │
│  │        "action": "issue_refund",                           │   │
│  │        "params": { "source": "original" }                   │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "type": "notification",                             │   │
│  │        "channel": "email",                                 │   │
│  │        "template": "refund_completed"                      │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "type": "crm_update",                               │   │
│  │        "fields": { "refund_status": "completed" }          │   │
│  │      }                                                      │   │
│  │    ]                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  WORKFLOW TYPES:                                                   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Approval    │  │  Conditional │  │   Parallel   │            │
│  │  Chain       │  │  Branching  │  │   Steps     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │    Delay     │  │  AI Decision │  │  Human Task  │            │
│  │    Timer     │  │    (Hojai)   │  │   (Agent)   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Webhook     │  │  Business    │  │   Loop /     │            │
│  │  Call        │  │   Action     │  │   Retry     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Business Actions

### 4.1 Action Registry
**Port:** 4887  
**Location:** `/companies/hojai-ai/hojai-action-registry/`

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ACTION REGISTRY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Purpose: Safe, auditable, permissioned business actions           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ACTION DEFINITION                         │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "name": "issue_refund",                                 │   │
│  │    "displayName": "Issue Refund",                           │   │
│  │    "category": "refunds",                                  │   │
│  │    "permission": "refund:create",                           │   │
│  │    "aiAllowed": true,                                       │   │
│  │    "aiConditions": [                                        │   │
│  │      { "field": "amount", "operator": "<=", "value": 5000 } │   │
│  │    ],                                                       │   │
│  │    "validation": {                                          │   │
│  │      "required": ["orderId", "amount"],                     │   │
│  │      "amount": { "min": 1, "max": 100000 }                 │   │
│  │    },                                                       │   │
│  │    "handler": "paymentService.issueRefund",                │   │
│  │    "sideEffects": [                                         │   │
│  │      "Create audit log entry",                             │   │
│  │      "Update order status",                                │   │
│  │      "Notify customer"                                       │   │
│  │    ]                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ACTION CATALOG:                                                   │
│                                                                     │
│  REFUNDS                         │  ORDER MANAGEMENT               │
│  ─────────────────────────────── │ ─────────────────────────────  │
│  ☐ Issue refund                 │  ☐ Cancel order               │
│  ☐ Partial refund               │  ☐ Modify order                │
│  ☐ Cancel refund request        │  ☐ Add item to order           │
│  ☐ Approve refund request       │  ☐ Change shipping address      │
│  ☐ Reject refund request        │  ☐ Track shipment               │
│                                 │                                │
│  CUSTOMER                       │  SUBSCRIPTIONS                 │
│  ─────────────────────────────── │ ─────────────────────────────  │
│  ☐ Update customer profile      │  ☐ Upgrade subscription         │
│  ☐ Merge customer accounts      │  ☐ Downgrade subscription       │
│  ☐ Lock customer account        │  ☐ Cancel subscription         │
│  ☐ Unlock customer account      │  ☐ Pause subscription          │
│  ☐ Reset customer password      │  ☐ Extend trial                │
│  ☐ Send verification OTP        │  ☐ Apply coupon                │
│                                 │                                │
│  CRM & NOTIFICATIONS            │  INTERNAL                      │
│  ─────────────────────────────── │ ─────────────────────────────  │
│  ☐ Update CRM record            │  ☐ Assign ticket to agent       │
│  ☐ Add CRM note                 │  ☐ Escalate ticket             │
│  ☐ Send email                   │  ☐ Merge tickets               │
│  ☐ Send SMS                     │  ☐ Split ticket               │
│  ☐ Send push notification       │  ☐ Create child ticket         │
│  ☐ Create ticket                │  ☐ Tag ticket                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: AI Intelligence Layer (Enhanced)

### 5.1 AI Tool Registry
**Port:** 4881  
**Purpose:** Structured tools for consistent AI behavior

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI TOOL REGISTRY                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Every AI action goes through a registered tool                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    TOOL DEFINITION                          │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "name": "get_order_details",                            │   │
│  │    "description": "Get details of a specific order",       │   │
│  │    "parameters": {                                         │   │
│  │      "orderId": {                                          │   │
│  │        "type": "string",                                   │   │
│  │        "required": true,                                    │   │
│  │        "description": "The order ID"                       │   │
│  │      }                                                     │   │
│  │    },                                                       │   │
│  │    "returns": {                                             │   │
│  │      "type": "object",                                     │   │
│  │      "properties": { ... }                                  │   │
│  │    },                                                       │   │
│  │    "permission": "orders:read",                             │   │
│  │    "cache": true,                                           │   │
│  │    "cacheTTL": 300                                          │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  TOOL CATEGORIES:                                                  │
│                                                                     │
│  KNOWLEDGE         │  CUSTOMER DATA      │  BUSINESS              │
│  ───────────────── │ ─────────────────── │ ─────────────────────  │
│  📄 Search KB      │ 👤 Get customer     │ 🎫 Create ticket       │
│  📄 Get article    │ 📦 Get orders       │ 🔄 Update ticket       │
│  📄 Get FAQs      │ 💳 Get payments     │ 🏷️ Add tag            │
│  🔍 Search tickets│ 📋 Get invoices     │ 👤 Assign ticket       │
│  📝 Get similar   │ ⭐ Get subscriptions│ 🚨 Escalate            │
│                                                                     │
│  ACTIONS           │  PREDICTIONS        │  GENERATION            │
│  ───────────────── │ ─────────────────── │ ─────────────────────  │
│  ✉️ Send email    │ 📊 CSAT prediction  │ ✍️ Draft reply        │
│  💬 Send chat     │ ⚠️ Churn risk      │ 📋 Generate summary   │
│  📱 Send SMS      │ 🔒 Fraud score     │ 💡 Suggest actions    │
│  🔔 Send push    │ ⏱️ SLA risk        │ 📝 Generate note      │
│  🏷️ Create ticket │ 📈 LTV estimate    │ 🔄 Translate          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Three Memory Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                      THREE MEMORY LAYERS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: CONVERSATION MEMORY                              │   │
│  │                                                              │   │
│  │  Current chat session. Short-term.                         │   │
│  │                                                              │   │
│  │  [Customer]: I didn't receive my order                     │   │
│  │  [Agent]: I see your order #28472 was shipped yesterday... │   │
│  │  [Customer]: When will it arrive?                          │   │
│  │  [Agent]: Based on tracking, expected delivery is...       │   │
│  │                                                              │   │
│  │  Memory: conversation_abc123 = [                            │   │
│  │    { role: "customer", content: "I didn't receive..." },   │   │
│  │    { role: "agent", content: "I see your order..." },      │   │
│  │    ...                                                      │   │
│  │  ]                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: CUSTOMER MEMORY                                   │   │
│  │                                                              │   │
│  │  Persistent customer preferences and history.                │   │
│  │                                                              │   │
│  │  customer_abc123_memory = {                                 │   │
│  │    preferences: {                                          │   │
│  │      language: "en",                                       │   │
│  │      contactMethod: "email",                               │   │
│  │      notifications: { orderUpdates: true }                │   │
│  │    },                                                      │   │
│  │    history: {                                              │   │
│  │      commonIssues: ["shipping delays", "refund status"],   │   │
│  │      preferredActions: ["refund", "reshipment"],           │   │
│  │      tonePreferences: "friendly but professional"          │   │
│  │    },                                                      │   │
│  │    context: {                                              │   │
│  │      season: "holiday_shopper",                            │   │
│  │      vipStatus: true,                                      │   │
│  │      specialCircumstances: ["traveling_until_June20"]       │   │
│  │    }                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: ORGANIZATION MEMORY                               │   │
│  │                                                              │   │
│  │  Company policies, brand voice, SLAs, and rules.             │   │
│  │                                                              │   │
│  │  tenant_amazon_org = {                                     │   │
│  │    policies: {                                             │   │
│  │      refundWindowDays: 30,                                  │   │
│  │      maxRefundWithoutApproval: 5000,                        │   │
│  │      requireIdForRefund: true,                              │   │
│  │      acceptPartialRefunds: true                             │   │
│  │    },                                                      │   │
│  │    brand: {                                                │   │
│  │      voice: "friendly, helpful, solution-oriented",         │   │
│  │      tone: "warm but professional",                         │   │
│  │      avoidPhrases: ["unfortunately", "as per policy"],      │   │
│  │      usePhrases: ["happy to help", "here's what I can do"] │   │
│  │    },                                                      │   │
│  │    sla: {                                                  │   │
│  │      firstResponseCritical: 15,  // minutes                 │   │
│  │      firstResponseHigh: 60,                                 │   │
│  │      resolutionCritical: 240,                                │   │
│  │      resolutionHigh: 480                                    │   │
│  │    },                                                      │   │
│  │    escalationRules: { ... },                               │   │
│  │    approvalThresholds: { ... }                             │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Policy Engine

```
┌─────────────────────────────────────────────────────────────────────┐
│                        POLICY ENGINE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Purpose: Ensure AI operates within defined business rules          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    POLICY DEFINITION                         │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "name": "refund_approval_rules",                         │   │
│  │    "rules": [                                               │   │
│  │      {                                                      │   │
│  │        "condition": "amount <= 5000 && riskScore >= 50",     │   │
│  │        "action": "ALLOW_AI_APPROVAL",                       │   │
│  │        "message": "AI can approve refunds up to ₹5000"      │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "condition": "amount > 5000 && amount <= 10000",      │   │
│  │        "action": "REQUIRE_TEAM_LEAD_APPROVAL",             │   │
│  │        "message": "Manager approval needed"                 │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "condition": "amount > 10000",                       │   │
│  │        "action": "REQUIRE_FINANCE_APPROVAL",               │   │
│  │        "message": "Finance approval needed"                  │   │
│  │      },                                                     │   │
│  │      {                                                      │   │
│  │        "condition": "refundCount > 3 && refundRate > 0.2",  │   │
│  │        "action": "BLOCK_AND_ESCALATE",                     │   │
│  │        "message": "Flag for fraud review"                   │   │
│  │      }                                                      │   │
│  │    ]                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  POLICY DECISION FLOW:                                              │
│                                                                     │
│  AI proposes: Issue ₹3000 refund                                    │
│                                                                     │
│         │                                                          │
│         ▼                                                          │
│  Policy Engine evaluates                                           │
│         │                                                          │
│         ├── amount (3000) <= 5000?     ✓ Yes                       │
│         ├── riskScore (96) >= 50?      ✓ Yes                       │
│         ├── refundCount (1) <= 3?      ✓ Yes                       │
│         └── refundRate (0.08) <= 0.2? ✓ Yes                       │
│                                                                     │
│         │                                                          │
│         ▼                                                          │
│  DECISION: ALLOW_AI_APPROVAL                                       │
│                                                                     │
│         │                                                          │
│         ▼                                                          │
│  AI executes refund, logs decision, notifies customer                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Explainable AI

```
┌─────────────────────────────────────────────────────────────────────┐
│                       EXPLAINABLE AI                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Instead of:                                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Risk Score: HIGH                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Show:                                                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔴 Risk Score: 86% (HIGH)                                 │   │
│  │                                                              │   │
│  │  Factors contributing to risk:                              │   │
│  │                                                              │   │
│  │  ⚠️ 5 refund requests in last 30 days      (+25 points)   │   │
│  │  ⚠️ Device changed 4 times this month      (+20 points)   │   │
│  │  ⚠️ New payment method added yesterday     (+15 points)   │   │
│  │  ⚠️ IP address from different country      (+15 points)   │   │
│  │  ⚠️ Previous chargeback on file            (+11 points)   │   │
│  │                                                              │   │
│  │  Factors reducing risk:                                     │   │
│  │                                                              │   │
│  │  ✓ 12 successful orders in 6 months      (-0 points)     │   │
│  │  ✓ Account verified with phone           (-0 points)     │   │
│  │  ✓ No suspicious login activity          (-0 points)     │   │
│  │                                                              │   │
│  │  Confidence: 93%                                             │   │
│  │                                                              │   │
│  │  Recommended Action:                                         │   │
│  │  Require OTP verification before processing refund           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 AI Feedback Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AI FEEDBACK LOOP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Every AI decision becomes training data                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    FEEDBACK EVENTS                           │   │
│  │                                                              │   │
│  │  ai_suggestion_made                                          │   │
│  │  ├── { suggestionId, agentId, context, suggestion }         │   │
│  │                                                              │   │
│  │  ai_suggestion_accepted                                      │   │
│  │  ├── { suggestionId, agentId, modification }                │   │
│  │                                                              │   │
│  │  ai_suggestion_rejected                                      │   │
│  │  ├── { suggestionId, agentId, reason }                      │   │
│  │                                                              │   │
│  │  ai_action_executed                                          │   │
│  │  ├── { actionId, outcome, customerFeedback }                │   │
│  │                                                              │   │
│  │  csat_received                                               │   │
│  │  ├── { ticketId, rating, feedback }                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  LEARNING CYCLE:                                                   │
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐         │
│  │  Suggest    │────▶│   Agent     │────▶│  Customer   │         │
│  │  Made       │     │  Feedback   │     │  CSAT       │         │
│  └─────────────┘     └──────┬──────┘     └──────┬──────┘         │
│                             │                      │                 │
│                             ▼                      ▼                 │
│                      ┌─────────────────────────────────┐            │
│                      │     TRAINING DATA REPOSITORY    │            │
│                      │                                  │            │
│                      │  suggestion | accepted | csat    │            │
│                      │  context    | rejected | rating  │            │
│                      │  ...       | modified | ...     │            │
│                      └─────────────────────────────────┘            │
│                                    │                                │
│                                    ▼                                │
│                      ┌─────────────────────────────────┐            │
│                      │      MODEL FINE-TUNING           │            │
│                      │                                  │            │
│                      │  Tenant-specific AI improves     │            │
│                      │  with each interaction           │            │
│                      └─────────────────────────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 6: Agent Copilot

### 6.1 Agent Workspace
**Port:** 4895  
**Purpose:** AI-powered tools for support agents

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AGENT COPILOT                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  CONVERSATION PANEL                                 │   │   │
│  │  │                                                      │   │   │
│  │  │  Customer: I need to change my shipping address     │   │   │
│  │  │  [AI Copilot suggestions appearing...]              │   │   │
│  │  │                                                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                 │   │
│  │  │ 🤖 AI SIDEBAR   │  │ 📋 QUICK ACTIONS │                 │   │
│  │  │                 │  │                   │                 │   │
│  │  │ Customer Brief: │  │ [✓] Update addr  │                 │   │
│  │  │ ─────────────── │  │ [✓] Send confirm │                 │   │
│  │  │ VIP • 12 orders│  │ [ ] Add note     │                 │   │
│  │  │ LTV: ₹25,000   │  │ [ ] Create ticket │                 │   │
│  │  │                 │  │                   │                 │   │
│  │  │ Suggested Reply:│  │ ─────────────────│                 │   │
│  │  │ ─────────────── │  │ Knowledge Base:    │                 │   │
│  │  │ "I can help    │  │ 📄 Address change │                 │   │
│  │  │ update that   │  │ 📄 Shipping FAQ   │                 │   │
│  │  │ for you..."   │  │                   │                 │   │
│  │  │                 │  │                   │                 │   │
│  │  │ [Use Suggestion]│  └─────────────────┘                 │   │
│  │  └─────────────────┘                                      │   │
│  │                                                             │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │ ⚠️ SLA WARNING: Critical ticket, 5 min remaining  │   │   │
│  │  │ 📊 CSAT Prediction: 89% likely satisfied           │   │   │
│  │  │ 🔍 Missing Info: Order ID not confirmed            │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Copilot Features

```
┌─────────────────────────────────────────────────────────────────────┐
│                      COPILOT CAPABILITIES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ 🎯 Smart Replies     │  │ 📝 Auto Summarize   │               │
│  │                      │  │                      │               │
│  │ AI generates reply   │  │ One-click summary   │               │
│  │ based on context     │  │ of conversation     │               │
│  │ and customer history  │  │ for handoff         │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ 🔍 Missing Info      │  │ 📊 CSAT Prediction   │               │
│  │                      │  │                      │               │
│  │ Highlights gaps in   │  │ Predict customer     │               │
│  │ conversation         │  │ satisfaction before  │               │
│  │ (order ID, etc)     │  │ you respond         │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ ⚠️ SLA Risk Alert   │  │ 🔄 Auto Translate    │               │
│  │                      │  │                      │               │
│  │ Real-time warning    │  │ Translate customer   │               │
│  │ when ticket is at   │  │ messages to your    │               │
│  │ risk of SLA breach   │  │ language instantly   │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ 💡 Action Suggestions│  │ 📚 KB Recommendations│               │
│  │                      │  │                      │               │
│  │ AI suggests next    │  │ Auto-suggest relevant│               │
│  │ best actions based  │  │ articles based on   │               │
│  │ on conversation     │  │ conversation        │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐               │
│  │ 📋 Macro Suggestions │  │ ✍️ Draft Editor     │               │
│  │                      │  │                      │               │
│  │ Recommends saved    │  │ AI helps polish     │               │
│  │ replies/macros      │  │ your response for   │               │
│  │ based on pattern    │  │ tone and clarity    │               │
│  └──────────────────────┘  └──────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 7: Product Catalog

### 7.1 Product Intelligence
**Purpose:** AI understands products to answer questions accurately

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCT CATALOG SERVICE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PRODUCT MODEL                             │   │
│  │                                                              │   │
│  │  {                                                          │   │
│  │    "id": "prod_abc123",                                     │   │
│  │    "name": "iPhone 15 Pro Max",                            │   │
│  │    "sku": "IPH15PM-256-BLK",                               │   │
│  │    "category": "Electronics > Phones",                     │   │
│  │    "versions": [                                            │   │
│  │      { "name": "256GB Black", "sku": "..." },              │   │
│  │      { "name": "512GB Gold", "sku": "..." }                 │   │
│  │    ],                                                       │   │
│  │    "plans": [                                              │   │
│  │      { "name": "Standard", "price": 1199 },                │   │
│  │      { "name": "Extended Warranty", "price": 199 }          │   │
│  │    ],                                                       │   │
│  │    "features": [                                            │   │
│  │      "5G", "A17 Pro Chip", "48MP Camera",                  │   │
│  │      "Titanium Design", "Action Button"                     │   │
│  │    ],                                                       │   │
│  │    "knowledge": {                                          │   │
│  │      "faq": ["How to transfer data?", "Battery life?"],    │   │
│  │      "troubleshooting": ["Screen issues", "Battery drain"],│   │
│  │      "knownIssues": ["Camera lag in low light v1.2"],      │   │
│  │      "releaseNotes": ["v1.0 - Initial release", ...]       │   │
│  │    },                                                      │   │
│  │    "support": {                                            │   │
│  │      "warrantyMonths": 12,                                 │   │
│  │      "supportTier": "premium",                             │   │
│  │      "knownIssues": [                                      │   │
│  │        {                                                    │   │
│  │          "issue": "Battery drain on v1.2",                  │   │
│  │          "workaround": "Update to v1.3",                    │   │
│  │          "fixedIn": "v1.3"                                 │   │
│  │        }                                                   │   │
│  │      ]                                                     │   │
│  │    }                                                       │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  AI PRODUCT QUERY EXAMPLE:                                          │
│                                                                     │
│  Customer: "My phone camera is blurry at night"                   │
│                                                                     │
│  AI checks:                                                         │
│  ├── Product: iPhone 15 Pro Max                                    │
│  ├── Version: v1.2                                                 │
│  ├── Known Issues: Camera lag in low light ✓ MATCH                │
│  ├── Workaround: Update to v1.3                                    │
│  └── Resolution: "This is a known issue in v1.2..."               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Data Governance

### 8.1 Compliance & Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA GOVERNANCE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TENANT ISOLATION                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  Tenant A Data     │  Tenant B Data     │  Tenant C Data   │   │
│  │  ──────────────── │  ──────────────── │  ──────────────── │   │
│  │  • MongoDB: A_db  │  • MongoDB: B_db  │  • MongoDB: C_db  │   │
│  │  • Redis: A_cache │  • Redis: B_cache │  • Redis: C_cache │   │
│  │  • Files: A_s3/   │  • Files: B_s3/   │  • Files: C_s3/   │   │
│  │                                                              │   │
│  │  Every query automatically filtered by tenant_id            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  DATA RESIDENCY                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  US Customer  →  US-East S3, US-East MongoDB               │   │
│  │  EU Customer  →  EU-West S3, EU-West MongoDB                │   │
│  │  IN Customer  →  Asia-Mumbai S3, Asia-Mumbai MongoDB       │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  AUDIT TRAIL                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Every action logged:                                        │   │
│  │  {                                                          │   │
│  │    "timestamp": "2026-06-16T10:30:00Z",                   │   │
│  │    "actor": "agent_xyz",                                   │   │
│  │    "action": "refund.issued",                              │   │
│  │    "resource": "order_28472",                             │   │
│  │    "tenantId": "amazon",                                   │   │
│  │    "ip": "192.168.1.1",                                   │   │
│  │    "changes": { "amount": null, "previous": 5000 }        │   │
│  │  }                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  PII MANAGEMENT                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  • Email, Phone, Address → Encrypted at rest              │   │
│  │  • PII fields → Masked in logs (john***@gmail.com)        │   │
│  │  • Right to delete → GDPR compliance workflow              │   │
│  │  • Data retention → Configurable per tenant                  │   │
│  │  • Consent tracking → Marketing preferences                 │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 9: Final Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN CUSTOMER OPERATIONS PLATFORM                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         TENANT LAYER                                │   │
│  │   Amazon │ Stripe │ Swiggy │ YourCompany                            │   │
│  │   ──────────────────────────────────────────────────────────────   │   │
│  │   Project: Web │ Mobile │ Admin │ API │ Seller                      │   │
│  │   Config: AI Model │ Policies │ SLAs │ Branding │ Integrations     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CUSTOMER DATA PLATFORM                            │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │   │   Identity  │  │   Risk &    │  │  Predict.   │  │  Segment  │  │   │
│  │   │  Resolution │  │   Trust     │  │   Engine    │  │  Engine   │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                                      │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │                   CONTEXT COMPOSER API                        │  │   │
│  │   │   GET /customer-context/{id} → Unified Customer Profile       │  │   │
│  │   └─────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                                 │                                      │ │
│  │   ┌─────────────────────────────┼───────────────────────────────┐   │ │
│  │   │              HOJAI INTELLIGENCE LAYER                        │   │ │
│  │   │                                                              │   │ │
│  │   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │   │ │
│  │   │  │ Router │ │Intent │ │Sentiment│ │ Fraud  │ │Summary │      │   │ │
│  │   │  │ Agent  │ │ Agent │ │ Agent  │ │ Agent  │ │ Agent  │      │   │ │
│  │   │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │   │ │
│  │   │                                                              │   │ │
│  │   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │   │ │
│  │   │  │Order & │ │Retrieval│ │Predict │ │Recommend│ │Action  │      │   │ │
│  │   │  │Payment │ │ Agent  │ │ Engine │ │ Engine │ │ Executor│      │   │ │
│  │   │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │   │ │
│  │   │                                                              │   │ │
│  │   │  ┌────────────────────────────────────────────────────────┐  │   │ │
│  │   │  │              THREE MEMORY LAYERS                        │  │   │ │
│  │   │  │  Conversation │ Customer │ Organization                 │  │   │ │
│  │   │  └────────────────────────────────────────────────────────┘  │   │ │
│  │   │                                                              │   │ │
│  │   │  ┌────────────────────────────────────────────────────────┐  │   │ │
│  │   │  │              POLICY ENGINE                             │  │   │ │
│  │   │  │  Refund Rules │ Approval Chains │ Business Logic         │  │   │ │
│  │   │  └────────────────────────────────────────────────────────┘  │   │ │
│  │   │                                                              │   │ │
│  │   │  ┌────────────────────────────────────────────────────────┐  │   │ │
│  │   │  │              AI TOOL REGISTRY                          │  │   │ │
│  │   │  │  50+ Structured Tools │ Versioned │ Auditable          │  │   │ │
│  │   │  └────────────────────────────────────────────────────────┘  │   │ │
│  │   └──────────────────────────────────────────────────────────────┘   │ │
│  │                                    │                               │ │
│  └────────────────────────────────────┼───────────────────────────────┘ │
│                                       │                                   │
│  ┌────────────────────────────────────┼───────────────────────────────┐ │
│  │                                    ▼                               │ │
│  │   ┌─────────────────────────────────────────────────────────────┐ │ │
│  │   │                      AGENT COPILOT                           │ │ │
│  │   │                                                              │ │ │
│  │   │  Draft Replies  │  Summarize  │  Predict CSAT  │  KB Links   │ │ │
│  │   │  Auto-Fill      │  Translate  │  SLA Alerts    │  Macros     │ │ │
│  │   │                                                              │ │ │
│  │   └─────────────────────────────────────────────────────────────┘ │ │
│  │                                    │                               │ │
│  └────────────────────────────────────┼───────────────────────────────┘ │
│                                       │                                   │
│  ┌────────────────────────────────────┼───────────────────────────────┐ │
│  │                                    ▼                               │ │
│  │   ┌─────────────────────────────────────────────────────────────┐ │ │
│  │   │                   WORKFLOW ENGINE                            │ │ │
│  │   │                                                              │ │ │
│  │   │  Trigger → Conditions → Approval Chain → Actions → Notify   │ │ │
│  │   │                                                              │ │ │
│  │   └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │ │
│  │   │ ACTION REGISTRY │  │NOTIFICATION SVC │  │  INTEGRATION    │     │ │
│  │   │                 │  │                 │  │     HUB        │     │ │
│  │   │ 50+ Business    │  │ Email │ SMS │    │  │                 │     │ │
│  │   │ Actions         │  │ Push │ WhatsApp│  │ 100+ Connectors │     │ │
│  │   │ (Safe, Audited)│  │ Slack│ Webhook│  │ (Standard API)  │     │ │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘     │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                       │                                   │
│  ┌────────────────────────────────────┼───────────────────────────────┐ │
│  │                                    ▼                               │ │
│  │   ┌─────────────────────────────────────────────────────────────┐ │ │
│  │   │                     DATA LAYER                              │ │ │
│  │   │                                                              │ │ │
│  │   │  Per-Service DBs │ S3 Storage │ Vector DB │ Redis Cache     │ │ │
│  │   │  MongoDB Per Tenant │ Encrypted │ Audit Logs │ Compliance     │ │ │
│  │   └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  │   ┌─────────────────────────────────────────────────────────────┐ │ │
│  │   │                   EVENT BUS (NATS)                          │ │ │
│  │   │                                                              │ │ │
│  │   │  support.ticket.*  │  customer.*  │  order.*  │  payment.*    │ │ │
│  │   └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 10: Service Registry

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE SERVICE REGISTRY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PORT   │ SERVICE                    │ PURPOSE                             │
│  ───────┼────────────────────────────┼────────────────────────────────────  │
│         │                            │                                      │
│  4001   │ API Gateway                │ Auth, Rate Limit, Routing           │
│  4702   │ CorpID (Identity)          │ JWT, SSO, Permissions               │
│  4703   │ MemoryOS                   │ Vector Memory                       │
│  4870   │ Unified Inbox              │ Multi-channel conversations          │
│  4871   │ Knowledge Base             │ Articles, FAQs                       │
│  4872   │ Ticket Service             │ Ticket lifecycle                     │
│  4873   │ SLA Service                │ SLA tracking                         │
│  4874   │ Support Analytics          │ Reporting, Dashboards                │
│  4878   │ Supporter AI               │ Customer-facing chatbot               │
│  4879   │ Customer Context            │ 360° customer view (deprecated)       │
│  4881   │ Hojai Intelligence         │ AI orchestration                     │
│  4882   │ Worker Queue               │ BullMQ async jobs                    │
│  4883   │ Search Service             │ Elasticsearch                        │
│  4885   │ Customer Intelligence (CDP) │ Customer Data Platform               │
│  4886   │ Workflow Engine            │ BPMN automation                      │
│  4887   │ Action Registry            │ Business action definitions          │
│  4890   │ Integration Hub             │ Connector framework                   │
│  4895   │ Agent Copilot              │ AI tools for agents                   │
│  4510   │ Event Bus (REZ)            │ Pub/Sub messaging                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 11: Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION PHASES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Foundation (Weeks 1-3)                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ API Gateway (4001)                                                      │
│  ☐ Event Bus integration (NATS)                                            │
│  ☐ Redis caching                                                           │
│  ☐ Per-tenant MongoDB isolation                                             │
│  ☐ Basic auth (CorpID integration)                                         │
│  ☐ Audit logging                                                            │
│                                                                             │
│  PHASE 2: Customer Data Platform (Weeks 4-6)                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Customer Intelligence Service (4885)                                      │
│  ☐ Identity Resolution                                                     │
│  ☐ Risk & Trust Scoring                                                    │
│  ☐ Context Composer API                                                     │
│  ☐ Basic integrations (Shopify, Stripe)                                     │
│                                                                             │
│  PHASE 3: AI Intelligence (Weeks 7-9)                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Hojai Intelligence Layer (4881)                                          │
│  ☐ AI Tool Registry                                                         │
│  ☐ Three Memory Layers                                                      │
│  ☐ Policy Engine                                                           │
│  ☐ Explainable AI                                                           │
│  ☐ Vector DB (Weaviate)                                                    │
│                                                                             │
│  PHASE 4: Workflow & Actions (Weeks 10-12)                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Workflow Engine (4886)                                                   │
│  ☐ Action Registry (4887)                                                  │
│  ☐ Notification Service (4880)                                              │
│  ☐ Integration Hub (4890)                                                   │
│  ☐ More connectors                                                          │
│                                                                             │
│  PHASE 5: Agent Experience (Weeks 13-15)                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Agent Copilot (4895)                                                     │
│  ☐ AI Feedback Loop                                                         │
│  ☐ Product Catalog Service                                                  │
│  ☐ Feature Flags Service                                                    │
│                                                                             │
│  PHASE 6: Enterprise Ready (Weeks 16-18)                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Data Governance (encryption, residency)                                  │
│  ☐ Advanced Audit Trail                                                     │
│  ☐ Multi-region deployment                                                 │
│  ☐ Load testing & optimization                                              │
│  ☐ Security audit                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Capability | Status | Priority |
|-----------|--------|----------|
| Customer Data Platform (CDP) | 🆕 New | 🔴 Critical |
| Identity Resolution | 🆕 New | 🔴 Critical |
| Integration Hub | 🆕 New | 🔴 Critical |
| Workflow Engine | 🆕 New | 🔴 Critical |
| Business Actions | 🆕 New | 🔴 Critical |
| AI Tool Registry | 🆕 New | 🔴 Critical |
| Three Memory Layers | 🆕 New | 🔴 Critical |
| Policy Engine | 🆕 New | 🔴 Critical |
| Explainable AI | 🆕 New | 🟠 High |
| AI Feedback Loop | 🆕 New | 🟠 High |
| Agent Copilot | 🆕 New | 🟠 High |
| Product Catalog | 🆕 New | 🟡 Medium |
| Feature Flags | 🆕 New | 🟡 Medium |
| Data Governance | 🆕 New | 🟡 Medium |

---

**Final Vision:**

> RTMN is not a support platform.
> 
> It is an AI-native Customer Operations Platform where:
> - Every customer interaction generates intelligence
> - Every insight drives automated action
> - Every action improves the AI
> - Every business operates on their own terms with their own policies
> - Agents are empowered, not overwhelmed
> - Customers feel understood, not processed

---

**Ready to implement? Which phase should we start with?**