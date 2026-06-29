# HOJAI Templates

> **Version:** 1.0.0
> **Purpose:** Ready-to-deploy workflow templates for HOJAI Studio

---

## Overview

This directory contains 100 pre-built workflow templates across 10 categories. Each template is a JSON file that can be deployed directly to HOJAI Studio.

## Template Categories

| Category | Count | Directory |
|----------|-------|-----------|
| Sales | 15 | [sales/](sales/) |
| Marketing | 15 | [marketing/](marketing/) |
| Customer Support | 10 | [support/](support/) |
| HR | 10 | [hr/](hr/) |
| Finance | 10 | [finance/](finance/) |
| Founder Office | 10 | [founder/](founder/) |
| Restaurant | 10 | [restaurant/](restaurant/) |
| Healthcare | 5 | [healthcare/](healthcare/) |
| Real Estate | 5 | [real-estate/](real-estate/) |
| Commerce/Procurement | 10 | [commerce/](commerce/) |

---

## Template Schema

Each template follows this schema:

```json
{
  "id": "unique-template-id",
  "name": "Human Readable Name",
  "category": "category-name",
  "description": "What this template does",
  "version": "1.0.0",
  
  "triggers": [
    {
      "type": "webhook|schedule|event|api",
      "source": "source_name",
      "event": "event_name"
    }
  ],
  
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "trigger|action|ai_agent|crm|email|...",
      "name": "Node Name",
      "config": { ... }
    }
  ],
  
  "connections": [
    {"from": "node1", "to": "node2"},
    {"from": "node2", "to": "node3", "condition": "field > value"}
  ],
  
  "memory": {
    "required": ["memory_types"],
    "update_on": ["events"]
  },
  
  "twins": {
    "creates": ["twin_names"],
    "updates": ["twin_names"]
  },
  
  "agents": ["agent_names"],
  "integrations": ["integration_names"],
  
  "price": {
    "subscription": 999,
    "currency": "INR",
    "period": "month"
  },
  
  "tags": ["tag1", "tag2"]
}
```

---

## Node Types

| Type | Description |
|------|-------------|
| `trigger` | Flow start point |
| `actor` | Web data extraction |
| `ai_agent` | AI-powered processing |
| `condition` | Branch logic |
| `action` | System actions |
| `crm` | CRM operations |
| `email` | Email sending |
| `sms` | SMS sending |
| `slack` | Slack notifications |
| `calendar` | Calendar operations |
| `document` | Document generation |
| `approval` | Human approval |
| `memory` | Memory operations |
| `twin` | Twin operations |
| `webhook` | Webhook triggers |
| `schedule` | Scheduled triggers |
| `filter` | Data filtering |
| `transform` | Data transformation |

---

## Deployment

### Via HOJAI CLI

```bash
# Install a template
hojai templates install sales-lead-qualification

# List available templates
hojai templates list

# Search templates
hojai templates search "lead qualification"
```

### Via API

```bash
curl -X POST http://localhost:4570/api/v1/templates/install \
  -d '{"templateId": "sales-lead-qualification"}'
```

---

## Sales Templates (15)

| # | Template | Price | Description |
|---|---------|-------|-------------|
| 1 | Lead Qualification Pipeline | ₹999/mo | Auto-qualify leads with scoring |
| 2 | LinkedIn AI Outreach | ₹1,499/mo | Scrape & personalize LinkedIn |
| 3 | AI Cold Email Campaign | ₹1,999/mo | Personalized email at scale |
| 4 | AI Proposal Generator | ₹2,499/mo | Generate proposals automatically |
| 5 | Automated Follow-ups | ₹999/mo | Multi-channel follow-up sequences |
| 6 | AI Meeting Booking | ₹799/mo | Calendly-powered scheduling |
| 7 | Competitor Monitoring | ₹1,999/mo | Track competitor changes |
| 8 | Pipeline Forecasting | ₹2,499/mo | AI-powered revenue forecast |
| 9 | Win/Loss Analysis | ₹1,499/mo | Analyze deal outcomes |
| 10 | Upsell Detection | ₹1,499/mo | Find upsell opportunities |
| 11 | Renewal Alerts | ₹999/mo | Proactive renewal reminders |
| 12 | Daily Dashboard | ₹499/mo | AI-powered daily summary |
| 13 | Higher Ticket Targeting | ₹2,999/mo | Enterprise prospect targeting |
| 14 | Objection Handler | ₹1,999/mo | Real-time objection AI |
| 15 | CRM Cleanup | ₹999/mo | Auto-clean CRM data |

---

## Marketing Templates (Coming Soon)

- [ ] Content Calendar Automation
- [ ] SEO Article Generator
- [ ] Social Media Scheduler
- [ ] Campaign Performance Reporter
- [ ] Lead Magnet Delivery
- [ ] Review Collection
- [ ] Competitor Ad Tracker
- [ ] Newsletter Generator
- [ ] Influencer Outreach
- [ ] Brand Mention Monitor
- [ ] A/B Test Analyzer
- [ ] SEO Keyword Research
- [ ] Blog → Social Automation
- [ ] Event Promotion
- [ ] Customer Journey Analyzer

---

## Support Templates (Coming Soon)

- [ ] Ticket Auto-Classification
- [ ] AI First Response
- [ ] Knowledge Base Auto-Update
- [ ] Sentiment Triage
- [ ] Escalation Rules
- [ ] Refund Auto-Approval
- [ ] VIP Priority Routing
- [ ] SLA Breach Alert
- [ ] CSAT Analysis
- [ ] Root Cause Analyzer

---

## HR Templates (Coming Soon)

- [ ] Employee Onboarding
- [ ] Resume Screening
- [ ] Interview Scheduler
- [ ] Offer Letter Generator
- [ ] Leave Approval
- [ ] Payroll Notification
- [ ] Performance Review
- [ ] Learning Recommendations
- [ ] Exit Workflow
- [ ] Policy Bot

---

## Finance Templates (Coming Soon)

- [ ] Invoice Processing
- [ ] Expense Approval
- [ ] Budget Alerts
- [ ] Cash Flow Forecast
- [ ] Vendor Payment
- [ ] Tax Reminder
- [ ] Monthly Close
- [ ] Fraud Detection
- [ ] Collections Follow-up
- [ ] Financial Report

---

## Founder Templates (Coming Soon)

- [ ] Daily Briefing
- [ ] Investor Update
- [ ] Board Deck Generator
- [ ] Goal Tracker
- [ ] Decision Journal
- [ ] Competitor Intel
- [ ] Weekly Summary
- [ ] Team Health Score
- [ ] Burn Rate Monitor
- [ ] Runway Calculator

---

## Restaurant Templates (Coming Soon)

- [ ] Order → Kitchen Flow
- [ ] Inventory Replenishment
- [ ] Supplier Auto-Order
- [ ] Staff Scheduling
- [ ] Loyalty Automation
- [ ] Review Response
- [ ] Daily Sales Report
- [ ] Waste Tracking
- [ ] Menu Optimization
- [ ] Customer Rebooking

---

## Healthcare Templates (Coming Soon)

- [ ] Appointment Reminder
- [ ] Patient Follow-up
- [ ] Prescription Renewal
- [ ] Insurance Verification
- [ ] Clinic Receptionist

---

## Real Estate Templates (Coming Soon)

- [ ] Lead Capture
- [ ] Site Visit Scheduler
- [ ] Property Recommender
- [ ] Document Collector
- [ ] Agent Prospector

---

## Commerce/Procurement Templates (Coming Soon)

- [ ] Purchase Request
- [ ] Supplier Discovery
- [ ] Price Comparison
- [ ] Contract Generator
- [ ] Delivery Tracker
- [ ] Inventory Forecast
- [ ] Supplier Performance
- [ ] Auto-Reorder
- [ ] Vendor Scorecard
- [ ] Procurement Approval

---

*Last Updated: June 29, 2026*
