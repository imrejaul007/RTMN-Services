# Demo Client: Acme Retail

**Company:** Acme Retail Pvt Ltd  
**Industry:** E-commerce / Retail  
**Plan:** Enterprise  
**Customers:** 50,000  
**Setup Date:** June 17, 2026

---

## Company Profile

```
ACME RETAIL
=============
Industry: E-commerce
Employees: 200
Annual Revenue: ₹50 Crore
Support Tickets: ~500/month
CSAT: 4.1/5
NPS: 38
```

---

## Connected Systems

| System | Integration | Status |
|--------|-------------|--------|
| Shopify | Orders, Products, Customers | ✅ Connected |
| Stripe | Payments, Refunds | ✅ Connected |
| Own WMS | Inventory | ✅ Connected |
| HubSpot | CRM | ✅ Connected |
| Twilio | SMS, Voice | ✅ Connected |
| WhatsApp Business | Messaging | ✅ Connected |

---

## Customer Twin - Example Customer

### John Doe (Customer ID: cust_acme_001)

```json
{
  "id": "cust_acme_001",
  "tenantId": "acme_retail",
  
  "identity": {
    "email": "john.doe@example.com",
    "phone": "+919876543210",
    "whatsapp": "+919876543210",
    "device": "iPhone 15 Pro",
    "location": "Mumbai, India"
  },
  
  "orders": {
    "total": 47,
    "totalSpent": 23450,
    "avgOrderValue": 499,
    "lastOrderDate": "2026-06-15",
    "pending": 2,
    "returned": 3,
    "cancelled": 1
  },
  
  "payments": {
    "successful": { "count": 45, "amount": 24500 },
    "failed": { "count": 2, "amount": 800 },
    "refunded": { "count": 3, "amount": 2100 },
    "chargebacks": 0,
    "preferred": ["UPI", "Card"]
  },
  
  "support": {
    "totalTickets": 8,
    "openTickets": 1,
    "resolvedTickets": 7,
    "avgResolutionTime": 4.2,
    "csatScore": 4.5,
    "escalatedCount": 1
  },
  
  "ai": {
    "genuinenessScore": 94,
    "churnRisk": "low",
    "csatProbability": 91,
    "escalationRisk": 8,
    "lifetimeValue": 120000,
    "nextBestAction": "Send birthday offer"
  }
}
```

---

## Order Twin - Example Order

### Order #3847

```json
{
  "id": "order_acme_3847",
  "tenantId": "acme_retail",
  "customerId": "cust_acme_001",
  
  "items": [
    {
      "productId": "prod_001",
      "name": "Tandoori Paneer Pizza",
      "quantity": 1,
      "price": 499,
      "discount": 50
    }
  ],
  
  "pricing": {
    "subtotal": 449,
    "tax": 81,
    "shipping": 0,
    "discount": 50,
    "total": 480
  },
  
  "status": "delivered",
  
  "shipping": {
    "address": "401, Linking Road, Bandra, Mumbai 400050",
    "method": "express",
    "carrier": "Delivery Partner A",
    "trackingNumber": "TRK3847001"
  },
  
  "timeline": [
    { "status": "pending", "timestamp": "2026-06-15T19:50:00" },
    { "status": "confirmed", "timestamp": "2026-06-15T19:55:00" },
    { "status": "processing", "timestamp": "2026-06-15T20:00:00" },
    { "status": "shipped", "timestamp": "2026-06-15T20:30:00" },
    { "status": "delivered", "timestamp": "2026-06-16T18:00:00" }
  ]
}
```

---

## Support Ticket - Example

### Ticket #3851

```json
{
  "id": "ticket_acme_3851",
  "tenantId": "acme_retail",
  "ticketNumber": "TKT-2606-0038",
  
  "customer": {
    "id": "cust_acme_001",
    "name": "John Doe",
    "tier": "gold",
    "genuinenessScore": 94
  },
  
  "context": {
    "order": "order_acme_3845",
    "product": "Tandoori Paneer Pizza",
    "issue": "Wrong item delivered"
  },
  
  "ai": {
    "intent": "refund_request",
    "sentiment": "frustrated",
    "csatPrediction": 3.2,
    "escalationRisk": 45,
    "genuinenessConcern": false
  },
  
  "agentView": {
    "customer360": {
      "totalOrders": 47,
      "totalSpent": 23450,
      "openTickets": 1,
      "csatScore": 4.5,
      "preferences": ["spicy food", "no nuts"]
    },
    
    "aiSuggestions": {
      "responseDraft": "Hi John, sincerely apologize for the wrong item. I've initiated full refund of ₹450 + ₹100 coupon.",
      "knowledgeArticles": [
        "How to process returns",
        "Refund policy for wrong items"
      ],
      "similarTickets": ["TKT-2606-0025", "TKT-2606-0018"]
    },
    
    "decisionRecommendation": {
      "action": "FULL_REFUND_WITH_COUPON",
      "confidence": 94,
      "reasoning": [
        "Customer trust score is high (94/100)",
        "First wrong item complaint",
        "Gold tier customer",
        "Issue clearly our fault"
      ]
    }
  },
  
  "outcome": {
    "revenueSaved": 550,
    "customerRetained": true,
    "couponUsed": true,
    "csatActual": 4.5
  }
}
```

---

## Agent Dashboard - Day in Life

### Morning (9:00 AM)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT SARAH - Morning Queue                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Good morning Sarah! 👋                                              │
│                                                                     │
│  Your Queue:                                                        │
│  ├── 12 Open Tickets                                               │
│  ├── 3 High Priority                                              │
│  ├── 1 VIP Customer                                               │
│  └── 2 Predicted Escalation                                       │
│                                                                     │
│  🔴 URGENT:                                                        │
│  └── Ticket #3851 - VIP John Doe (Gold)                           │
│      Issue: Wrong item - AI recommends full refund + ₹100 coupon    │
│      [View & Respond]                                              │
│                                                                     │
│  📊 Your Stats:                                                    │
│  ├── Yesterday: 15 tickets resolved (avg 3.2h)                    │
│  ├── CSAT: 4.9 ⭐                                                 │
│  └── Escalations: 0                                                │
│                                                                     │
│  🤖 AI Insights:                                                   │
│  ├── 3 customers at high churn risk today                         │
│  └── Product A has 5 complaints this week                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### During Day (11:30 AM)

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CONVERSATION: John Doe                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  John: Hi, I received the wrong pizza! I ordered Tandoori Paneer │
│        but got Margherita. Very disappointed 😤                    │
│                                                                     │
│  ────────────────────────────────────────────────────────────────   │
│                                                                     │
│  🤖 AI Analysis:                                                  │
│  ├── Sentiment: Frustrated 😤                                     │
│  ├── Intent: Refund Request                                        │
│  ├── CSAT Prediction: 3.2/5                                        │
│  ├── Escalation Risk: 45% (HIGH)                                  │
│  └── Genuineness: 94/100 (Low risk)                              │
│                                                                     │
│  👤 Customer 360:                                                 │
│  ├── VIP Gold Tier                                               │
│  ├── 47 orders, ₹23,450 spent                                   │
│  ├── 8 tickets (7 resolved ✓)                                    │
│  └── Allergies: Nuts 🥜                                           │
│                                                                     │
│  ────────────────────────────────────────────────────────────────   │
│                                                                     │
│  💡 AI Suggested Response:                                         │
│                                                                     │
│  "Hi John, sincerely apologize for the wrong item in your order.    │
│   I've initiated:                                                   │
│   ✓ Full refund: ₹450 (processing now)                            │
│   ✓ ₹100 coupon for next order                                    │
│   ✓ Priority pickup for return                                     │
│                                                                     │
│   We value you as a Gold customer. Sorry for the inconvenience!"    │
│                                                                     │
│  [Send ✓]  [Edit]  [Write Own]  [Escalate]                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Afternoon (2:00 PM)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE DASHBOARD                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ACME RETAIL - June 17, 2026                                      │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ HEALTH      │  │ NPS         │  │ CSAT        │             │
│  │ 78/100      │  │ 42 (+5)    │  │ 4.2/5 (+0.2)│             │
│  │ ↑ 3%       │  │ ↑ Good     │  │ ↑ Good     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  🔥 TOP ISSUES TODAY                                               │
│  ├── Late Delivery: 23 (Mumbai monsoon)                           │
│  ├── Wrong Items: 5 (Kitchen accuracy)                            │
│  └── Quality: 8 (Temperature during rush)                         │
│                                                                     │
│  🤖 AI RECOMMENDATIONS                                            │
│  ├── HIGH: Add 30min buffer for Mumbai deliveries                │
│  │   Impact: Save ₹8K/month                                       │
│  │                                                               │
│  └── MEDIUM: Kitchen verification step before dispatch           │
│      Impact: Save ₹15K/month                                      │
│                                                                     │
│  ⚠️ AT-RISK CUSTOMERS (3)                                        │
│  ├── Priya S. - 7 days no order (35% churn risk)                 │
│  ├── Rahul M. - 3 complaints this week                           │
│  └── Neha K. - CSAT dropped from 5 to 2                          │
│                                                                     │
│  📊 OUTCOME INTELLIGENCE - June                                   │
│  ├── Revenue Saved: ₹12.45K                                      │
│  ├── Customers Retained: 45                                      │
│  ├── Churn Prevented: 12                                         │
│  └── Upsell Generated: ₹2.3K                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI Briefing - Tomorrow Morning (6:00 AM)

```
📊 ACME RETAIL - Daily Briefing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Good morning! Here's your daily intelligence brief.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 HEALTH: 78/100 (↑ 3% from yesterday)
CSAT: 4.2/5 | NPS: 42

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ TOP RISKS TODAY

1. LATE DELIVERY (23 tickets)
   Pincode 400xxx has 40% delay rate
   → AI recommends: Add 30min buffer
   → Expected fix: Save ₹8K/month

2. WRONG ITEMS (5 tickets)
   Kitchen accuracy issue - rush hour
   → AI recommends: Verification step
   → Expected fix: Save ₹15K/month

3. 3 VIP CUSTOMERS AT RISK
   • Priya S. - No order in 7 days
   • Rahul M. - Multiple complaints
   • Neha K. - CSAT dropped to 2/5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 OPPORTUNITIES

1. 45 customers ready for upsell
   Potential: ₹2.5L
   → AI suggests: Premium membership offer

2. 12 VIP customers birthday this week
   → AI suggests: Personalized offers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ YESTERDAY'S OUTCOMES

• 15 tickets resolved
• ₹12,450 revenue saved
• 3 customers retained
• 1 churn prevented
• CSAT: 4.9 ⭐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 RECOMMENDED ACTIONS

1. [HIGH] Mumbai delivery buffer - Approve?
2. [MEDIUM] VIP outreach - Priya, Rahul, Neha
3. [LOW] Kitchen verification step

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated by RTMN Business Operations OS
```

---

## API Example - Support Ticket Creation

```bash
# Create ticket
curl -X POST https://api.acme.support/v1/tickets \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: acme_retail" \
  -d '{
    "customerId": "cust_acme_001",
    "type": "support",
    "priority": "high",
    "subject": "Wrong item delivered",
    "description": "Ordered Tandoori Paneer Pizza, got Margherita",
    "orderId": "order_acme_3845",
    "channel": "whatsapp"
  }'

# Response
{
  "ticketId": "ticket_acme_3852",
  "ticketNumber": "TKT-2606-0039",
  "ai": {
    "intent": "refund_request",
    "sentiment": "frustrated",
    "customer360": { ... },
    "suggestedResponses": [ ... ],
    "decisionRecommendation": { ... }
  }
}
```

---

## Flow Diagram

```
CUSTOMER CONTACTS
        │
        ▼
┌───────────────────┐
│   WhatsApp/Web   │
│   Email/Phone    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Universal Inbox   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌─────────────────┐
│  AI Intelligence  │────▶│  Customer Twin   │
│  (Intent, Sentiment) │     │  (John Doe)     │
└────────┬──────────┘     └─────────────────┘
         │
         ▼
┌───────────────────┐     ┌─────────────────┐
│  Decision Engine   │────▶│  Order Twin     │
│  (Should refund?) │     │  (Order #3845)  │
└────────┬──────────┘     └─────────────────┘
         │
         ▼
┌───────────────────┐     ┌─────────────────┐
│  Agent Dashboard   │────▶│  Product Twin   │
│  (Sarah sees AI   │     │  (Pizza specs)  │
│   suggestions)     │     └─────────────────┘
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   Auto-Execute or  │
│   Agent approves  │
│                   │
│   • Refund        │
│   • Send coupon   │
│   • Update KB     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Outcome Tracking │
│                   │
│  • Revenue saved  │
│  • Customer kept  │
│  • AI learns     │
└───────────────────┘
```

---

## Success Metrics

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| CSAT | 4.2 | 4.4 | 4.6 |
| NPS | 38 | 45 | 52 |
| Avg Resolution Time | 4.2h | 3.0h | 2.0h |
| AI Resolution Rate | 60% | 70% | 80% |
| Revenue Saved/Month | ₹12K | ₹25K | ₹50K |
| Customer Retention | 92% | 95% | 97% |
| Agent Productivity | Baseline | +30% | +50% |

---

**This is how Acme Retail uses RTMN Business Operations OS.**
