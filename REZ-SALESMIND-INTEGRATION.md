# REZ SalesMind ↔ Customer Operations OS - Integration Guide

**Version:** 1.0  
**Date:** June 17, 2026

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    REZ SALESMIND                                     │   │
│  │                                                                      │   │
│  │   Leads ──────► Pipeline ──────► Deals ──────► Customers           │   │
│  │       │             │              │              │                 │   │
│  │       └─────────────┴──────────────┴──────────────┘                 │   │
│  │                          │                                           │   │
│  │                          ▼                                           │   │
│  │                   Sales Intelligence                                 │   │
│  │                   Sales Copilot                                      │   │
│  │                   Sales Forecasting                                   │   │
│  └──────────────────────────────┬────────────────────────────────────────┘   │
│                                 │                                              │
│                                 │ Sync                                         │
│                                 ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 CUSTOMER OPERATIONS OS                               │   │
│  │                                                                      │   │
│  │   Lead Twin ◄─────────────────────────────────────────────────────┐  │   │
│  │       │                                                             │  │   │
│  │       ├──► Customer Twin (converted leads become customers)        │  │   │
│  │       │                                                             │  │   │
│  │       ├──► Campaign Twin (sales campaigns tracked)                  │  │   │
│  │       │                                                             │  │   │
│  │       ├──► Journey Twin (full customer journey)                     │  │   │
│  │       │                                                             │  │   │
│  │       └──► AI Intelligence (lead scoring, CSAT prediction)         │  │   │
│  │                                                                     │  │   │
│  │   Customer Twin ───────────────────────────────────────────────┐  │  │   │
│  │       │                                                            │  │  │   │
│  │       ├──► Support Copilot (cross-sell, upsell)                  │  │  │   │
│  │       ├──► Sales Copilot (follow-up on support tickets)           │  │  │   │
│  │       ├──► Decision Engine (customer value decisions)             │  │  │   │
│  │       └──► Trust Intelligence (customer trust score)              │  │  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Bidirectional Sync

### 1. SalesMind → Customer Operations

```
REZ SALESMIND                           CUSTOMER OPERATIONS OS
─────────────────                       ───────────────────────

Lead Created
     │
     └───────────────────────────────────► Lead Twin
                                             │
                                             ├──► AI Intelligence (score lead)
                                             ├──► Campaign Twin (source tracked)
                                             └──► Journey Twin (touchpoint)

Lead Qualified
     │
     └───────────────────────────────────► Lead Twin (score updated)
                                             │
                                             ├──► AI Intelligence (CSAT prediction)
                                             └──► Journey Twin (touchpoint)

Deal Won
     │
     └───────────────────────────────────► Lead Twin (status: converted)
              │                              │
              │                              ├──► Customer Twin (new customer!)
              │                              ├──► Trust Intelligence (trust score)
              │                              ├──► Journey Twin (touchpoint)
              │                              └──► Sales Copilot (win recorded)

Deal Lost
     │
     └───────────────────────────────────► Lead Twin (status: lost)
                                             │
                                             ├──► Journey Twin (touchpoint)
                                             └──► AI Intelligence (loss reason)
```

### 2. Customer Operations → SalesMind

```
CUSTOMER OPERATIONS OS                  REZ SALESMIND
────────────────────────                 ─────────────────

Support Ticket Created
     │
     └───────────────────────────────────► Sales Copilot (alert: customer contacted)
                                             │
                                             └──► Deal (activity logged)

Support Issue Resolved (Happy Customer)
     │
     └───────────────────────────────────► Lead Twin (sentiment: positive)
                                             │
                                             └──► Deal (CSAT boost)

VIP Customer
     │
     └───────────────────────────────────► Lead Twin (tier: VIP)
                                             │
                                             └──► Pipeline (prioritize)

Churn Risk Detected
     │
     └───────────────────────────────────► Sales Copilot (alert: at-risk customer)
                                             │
                                             └──► Deal (immediate follow-up)
```

---

## Data Sync Points

### Lead Data

```typescript
// REZ SalesMind Lead
interface SalesLead {
  leadId: string;
  name: string;
  email: string;
  company: string;
  source: 'web' | 'referral' | 'ad' | 'social';
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
  score: number;
  owner: string;
}

// → Customer Operations Lead Twin
interface CustomerOpsLead {
  leadId: string;
  
  // From SalesMind
  salesData: {
    source: string;
    stage: string;
    score: number;
    owner: string;
    lastActivity: Date;
  };
  
  // Enriched by Customer Operations
  enrichedData: {
    aiScore: number;           // AI predicted conversion
    csatPrediction: number;    // Will they be happy customer?
    churnRisk: 'low' | 'medium' | 'high';
    lifetimeValue: number;     // Predicted LTV
    crossSellOpportunities: string[];
  };
}
```

### Customer Data (After Conversion)

```typescript
// Customer Operations Customer Twin
interface Customer360 {
  customerId: string;
  
  // From SalesMind (via Lead conversion)
  salesHistory: {
    leadSource: string;
    dealValue: number;
    dealDate: Date;
    salesOwner: string;
    salesNotes: string[];
  };
  
  // Enriched by Customer Operations
  operationsData: {
    totalOrders: number;
    totalSpent: number;
    supportTickets: number;
    csatScore: number;
    npsScore: number;
    lastOrderDate: Date;
  };
  
  // AI Predictions
  ai: {
    genuinenessScore: number;
    churnRisk: string;
    csatProbability: number;
    nextBestAction: string;
  };
}
```

---

## Sync Mechanisms

### 1. Real-time Webhook Sync

```typescript
// SalesMind emits events
POST /api/webhooks/salesmind

// Events:
// - lead.created
// - lead.updated
// - lead.qualified
// - lead.converted
// - deal.won
// - deal.lost

{
  event: 'lead.converted',
  data: {
    leadId: 'lead_001',
    customerId: 'cust_new_001',
    dealValue: 50000,
    conversionDate: '2026-06-17'
  }
}
```

### 2. Batch Sync (Nightly)

```typescript
// Nightly sync job
cron: '0 2 * * *' // 2 AM daily

// Sync all leads/customers
await syncLeads();
await syncCustomers();
await syncDeals();
await syncActivities();
```

### 3. On-Demand Sync (API)

```typescript
// Any service can request sync
POST /api/integration/sync
{
  type: 'lead' | 'customer' | 'deal',
  id: string,
  direction: 'to-customer-ops' | 'from-customer-ops'
}
```

---

## Integration Service

### REZ SalesMind Integration Bridge

**Location:** `services/rez-salesmind-integration/`  
**Port:** 4961 (already built)

```typescript
// src/services/sync.ts
class SalesMindSync {
  
  // Lead Sync
  async syncLead(lead: SalesLead) {
    // Update Lead Twin
    await LeadTwin.update(lead.leadId, {
      salesData: lead,
      lastSynced: new Date()
    });
    
    // Trigger AI enrichment
    await AIIntelligence.enrichLead(lead.leadId);
    
    // Update Journey Twin
    await JourneyTwin.addTouchpoint({
      type: 'sales',
      action: 'lead_' + lead.stage,
      leadId: lead.leadId
    });
  }
  
  // Customer Conversion
  async onLeadConverted(leadId: string, customerId: string) {
    // Create customer in Customer Twin
    await CustomerTwin.create({
      customerId,
      convertedFrom: leadId
    });
    
    // Sync sales history
    await CustomerTwin.update(customerId, {
      salesHistory: await SalesMind.getDealHistory(leadId)
    });
    
    // Initialize trust score
    await TrustIntelligence.initializeScore(customerId);
    
    // Update Lead Twin
    await LeadTwin.update(leadId, {
      status: 'converted',
      customerId
    });
  }
  
  // Customer → Sales (cross-pollination)
  async onSupportTicketCreated(ticket: Ticket) {
    // Alert Sales Copilot
    await SalesCopilot.alert({
      type: 'support_contact',
      customerId: ticket.customerId,
      ticketId: ticket.id,
      priority: ticket.priority
    });
    
    // Log activity on related deal
    if (ticket.dealId) {
      await SalesMind.logActivity({
        dealId: ticket.dealId,
        type: 'support_interaction',
        note: 'Customer raised support ticket'
      });
    }
  }
}
```

---

## Use Cases

### Use Case 1: Lead Becomes Customer

```
1. Sales creates lead in REZ SalesMind
   └─► Lead synced to Lead Twin

2. Lead goes through stages
   └─► Stage updates synced to Lead Twin + Journey Twin

3. Deal Won!
   └─► Lead Twin marks as 'converted'
   └─► Customer Twin created with sales data
   └─► Trust Intelligence initializes score
   └─► Journey Twin records conversion

4. Customer places order (REZ-Commerce)
   └─► Customer Twin updated
   └─► Order Twin created
   └─► Sales Copilot notified of first purchase

5. Customer has support issue
   └─► Support Copilot helps
   └─► Sales Copilot sees interaction
   └─► Can upsell during support
```

### Use Case 2: Customer Churn Risk → Sales Alert

```
1. AI Intelligence detects churn risk (Order Twin)
   └─► Churn risk: HIGH

2. Triggers:
   └─► Support Copilot: High priority handling
   └─► Sales Copilot: Alert to sales owner
   └─► Journey Twin: Records churn risk event

3. Sales reaches out proactively
   └─► Sales logs activity in REZ SalesMind
   └─► Deal updated with recovery attempt
   └─► Customer Twin: notes proactive contact

4. Customer retained!
   └─► Trust Intelligence: score improved
   └─► Journey Twin: records retention
   └─► Outcome Intelligence: tracks value saved
```

### Use Case 3: Support Ticket → Upsell Opportunity

```
1. Customer submits support ticket
   └─► Support Copilot responds
   └─► Customer Twin loaded

2. AI sees:
   └─► Customer has 3 orders, ₹15,000 spent
   └─► VIP tier
   └─► Never been offered premium

3. Support Copilot suggests:
   └─► "Would you like to upgrade to Premium? 
   └─► You'll get priority support + 20% discount"

4. Customer accepts!
   └─► Subscription Twin updated
   └─► Sales recorded in REZ SalesMind
   └─► Campaign Twin: upsell campaign
   └─► Outcome Intelligence: tracks upsell
```

---

## API Endpoints

### SalesMind → Customer Operations

```
POST /api/integration/salesmind/webhook
  → Receives SalesMind events

GET /api/integration/salesmind/leads
  → Sync all leads

POST /api/integration/salesmind/sync/:leadId
  → Sync single lead
```

### Customer Operations → SalesMind

```
POST /api/integration/salesmind/alert
  → Send alert to sales (churn risk, upsell)

GET /api/integration/salesmind/deal/:customerId
  → Get related deal

POST /api/integration/salesmind/activity
  → Log activity on deal
```

---

## Summary

| Sync Type | Direction | Trigger |
|-----------|-----------|---------|
| Lead Created | SalesMind → Customer Ops | Real-time webhook |
| Lead Updated | SalesMind → Customer Ops | Real-time webhook |
| Lead Converted | SalesMind → Customer Ops | Real-time webhook |
| Deal Won | SalesMind → Customer Ops | Real-time webhook |
| Support Ticket | Customer Ops → SalesMind | On ticket create |
| Churn Risk | Customer Ops → SalesMind | On risk detection |
| Upsell | Customer Ops → SalesMind | On opportunity |
| Daily Batch | Bidirectional | Nightly cron |

---

## Next Steps

1. ✅ Integration bridge built (Port 4961)
2. ⏳ Webhook endpoints configured in SalesMind
3. ⏳ Sync triggers tested
4. ⏳ Deploy to production

**Ready to configure?**
