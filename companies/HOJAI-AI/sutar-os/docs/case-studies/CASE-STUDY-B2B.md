# Case Study: B2B SaaS Procurement — Nexha Network Auto-Negotiation

> **Company:** InnoCorp (mid-size manufacturing company)
> **Industry:** Industrial Manufacturing
> **SUTAR Services Used:** Nexha Discovery, Negotiation Engine, Contract OS, Trust Engine, HITL
> **Timeline:** June 2026

---

## The Challenge

InnoCorp spends $48M/year on B2B SaaS and services procurement:
- 200+ vendors, 600+ subscriptions
- Renewal management: completely manual, 60% auto-renew at higher prices
- Negotiation: sporadic, dependent on relationship of individual buyers
- Visibility: no unified view of spending or vendor performance

**Results:**
- 40% of subscriptions auto-renewed without review
- Average contract value increased 18% at renewal without negotiation
- 30% overlap in SaaS tools (e.g., 4 different CRM systems)

---

## What InnoCorp Built

InnoCorp deployed **InnoCorp SUTAR** — an autonomous procurement agent that:

1. **Discovers** vendors and alternatives via Nexha Discovery
2. **Assesses** vendor trust and reliability via Trust Engine
3. **Negotiates** contract terms automatically via Negotiation Engine
4. **Obtains** human approval for high-value deals via HITL
5. **Manages** renewals, auto-escalating when vendor behavior changes
6. **Consolidates** vendors and eliminates redundancies

---

## The Numbers

| Metric | Before SUTAR | After SUTAR | Change |
|--------|-------------|--------------|--------|
| Subscriptions under management | 600 | 620 | +3% |
| Auto-renewals without review | 40% | 0% | **-100%** |
| Renewal price increase | +18% avg | -4% avg | **-22%** |
| Contract negotiations/year | 12 | 156 | **13×** |
| Vendor consolidation | — | 23% overlap eliminated | **$380K savings** |
| Time per negotiation | 4-8 weeks | 1-3 days | **93% faster** |
| Procurement team | 6 FTE | 3 FTE | **-50%** |
| Average contract discount | 0% | 15% | **+15%** |

---

## How It Works

### Scenario: Annual Salesforce Renewal + Competitive Bid

**Current:** Salesforce Enterprise @ $36,000/year (auto-renewal in 60 days)
**SUTAR Action:** Auto-negotiate renewal + run competitive process

### Step 1: Renewal Detection + Market Scan
```
InnoCorp SUTAR ──► Nexha Discovery ──► Find Salesforce alternatives
├── HubSpot (score: 0.87) — $28,000/year
├── Zoho CRM (score: 0.82) — $12,000/year
├── Freshsales (score: 0.79) — $18,000/year
└── Salesforce (current, score: 0.95) — $36,000/year

InnoCorp SUTAR sends RFQ to all 4 vendors simultaneously via ACP.
```

### Step 2: Multi-Vendor Negotiation (8 rounds total)

**Round 1-2:** InnoCorp SUTAR → All vendors: "We're evaluating annual CRM contracts. Our budget: $25,000. Please provide best pricing for 50 users."

```
HubSpot:    $26,400/year (12% discount) → "We can offer premier support"
Zoho:       $12,000/year → "We include unlimited users"
Freshsales: $16,200/year → "We offer dedicated CSM"
Salesforce: $34,200/year (5% off) → "We're InnoCorp's long-term partner"
```

**Round 3-4:** InnoCorp SUTAR → Top 2 (HubSpot, Freshsales): "We need 50 users + API access + custom reporting."

```
HubSpot:    $24,000/year + free implementation → "Can start in 2 weeks"
Freshsales: $15,000/year → "We include 24/7 support"
```

**Round 5-6:** InnoCorp SUTAR → HubSpot: "We have competing offer. Can you match $22,000?"

```
HubSpot:    $22,800/year + 3 months free → "Best we can do. You also get co-marketing."
```

**Round 7-8:** InnoCorp SUTAR → Salesforce: "We're switching to HubSpot unless you can match $22,000."

```
Salesforce: $27,000/year (25% off) → "We value InnoCorp. Also waiving exit fee."
```

### Step 3: Human Approval via HITL

```
InnoCorp SUTAR ──�� HITL Approval Gate
├── Action: "Renew Salesforce OR switch to HubSpot"
├── Options: [
│   { vendor: "Salesforce", price: "$27,000", change: "-25%", risk: "low" },
│   { vendor: "HubSpot", price: "$22,800", change: "-37%", risk: "medium" }
│ ]
├── Current: "$36,000/year"
└── Recommendation: "HubSpot — 37% savings, strong feature parity"
```

**Procurement VP reviews → Approves Salesforce at $27,000** (prefers continuity)

### Step 4: Contract Execution

```
InnoCorp SUTAR ──► Contract OS
├── Auto-generates contract with negotiated terms
├── Sets renewal alerts: 90 days before expiry
├── Sets price escalation caps: max 5%/year
├── Enables usage monitoring: alerts if under-utilized
└── Saves $9,000/year (25% reduction)
```

---

## Annual Procurement Results (Year 1)

| Category | Savings |
|---------|---------|
| Salesforce renewal (25% discount) | $9,000 |
| Eliminated 3 unused subscriptions | $18,000 |
| Negotiated 12 new contracts | $45,000 |
| Consolidated 4 duplicate tools | $38,000 |
| Vendor performance credits | $12,000 |
| **Total Year 1 Savings** | **$122,000** |

---

## Agent Architecture

```
InnoCorp SUTAR (orchestrator)
├── Renewal-Manager-Agent      ──► Tracks 620 subscriptions, alerts 90 days out
├── Vendor-Discovery-Agent    ──► Nexha Discovery for alternatives
├── Negotiation-Agent         ──► Auto-negotiates via ACP Protocol
├── Approval-Agent            ──► HITL integration for human sign-off
├── Contract-Manager-Agent   ──► Contract OS lifecycle management
├── Spend-Analytics-Agent    ──► Identifies waste, overlap, optimization
└── Vendor-Relationship-Agent ──► Monitors vendor health, flags issues
```

---

## Procurement Automation Levels

Not all decisions need human involvement. InnoCorp defines automation tiers:

| Tier | Value | Example | SUTAR Action | Human Action |
|------|-------|---------|--------------|--------------|
| **Tier 1** | < $5K | Minor SaaS tools | Auto-renew/negotiate | None |
| **Tier 2** | $5K-25K | Mid-tier subscriptions | Negotiate, propose | 1-click approve |
| **Tier 3** | $25K-100K | Major contracts | Negotiate, compare alternatives | Full HITL review |
| **Tier 4** | > $100K | Enterprise deals | Negotiate, structure | Multi-stakeholder approval |

---

## Customer Feedback

> "We had 4 different CRM subscriptions across departments. SUTAR identified $38K in overlap and consolidated everything to one vendor at a lower price. The agents negotiate continuously — we're saving $122K/year with a team half the size."
> — VP of Procurement, InnoCorp

> "SUTAR renegotiated our AWS contract while I was on vacation. By the time I was back, we had $180K in committed savings with 3-year rate locks. The agents don't sleep."
> — CFO, InnoCorp

---

## ROI

| Investment | Cost |
|-----------|------|
| SUTAR Enterprise tier | $39K/year |
| Integration (ERP, SSO, vendor portals) | $40K one-time |
| Training | $10K |

| Return | Value |
|--------|-------|
| Year 1 procurement savings | $122K |
| Ongoing annual savings | $180K |
| Procurement team reduction | $300K (3 FTE × $100K) |
| Contract dispute reduction | $25K |
| **Total Annual Return** | **$627K** |
| **ROI** | **14.7×** |
