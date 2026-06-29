# HOJAI Platform

> **Version:** 1.0.0
> **Date:** June 29, 2026
> **Purpose:** Build AI companies in minutes with pre-built agents, workflows, and integrations

---

## 🎯 What is HOJAI Platform?

HOJAI is an **AI Workforce Platform** that lets anyone build a complete AI company in minutes — not just automations, but **AI employees + reusable playbooks + a marketplace**.

### The Stack

```
HOJAI Platform
├── Department Packs (5 departments)
│   ├── Sales Department (5 agents)
│   ├── Marketing Department (5 agents)
│   ├── Support Department (5 agents)
│   ├── Finance Department (5 agents)
│   └── HR Department (5 agents)
│
├── AI Agents (5 core agents)
│   ├── AI SDR Agent
│   ├── AI Support Agent
│   ├── Founder Briefing Agent
│   ├── Invoice Automation Agent
│   └── WhatsApp Commerce Agent
│
├── Workflow Templates (100 templates)
│   ├── Sales (15)
│   ├── Marketing (15)
│   ├── Support (10)
│   ├── HR (10)
│   ├── Finance (10)
│   ├── Founder (10)
│   ├── Restaurant (10)
│   ├── Healthcare (10)
│   └── Commerce (10)
│
├── SDKs
│   ├── @hojai/core - Core client & modules
│   ├── @hojai/flows - Workflow builder
│   └── @hojai/agents - AI agent framework
│
├── Visual Flow Builder
│   └── Drag-and-drop workflow editor
│
├── InternetOS (Actors)
│   ├── Actor Runtime
│   ├── Google Maps Actor
│   ├── LinkedIn Actor
│   ├── Zomato Actor
│   ├── News Actor
│   ├── Company Intel Actor
│   └── Watcher Runtime
│
└── CLI
    └── hojai init, generate, deploy
```

---

## 🚀 Quick Start

### 1. Install CLI

```bash
npm install -g @hojai/cli
```

### 2. Initialize Project

```bash
hojai init my-ai-company
cd my-ai-company
npm install
```

### 3. Add AI Agents

```bash
# Add a pre-built agent
hojai agents install sdr
hojai agents install support

# Or generate custom agent
hojai generate agent my-custom-agent
```

### 4. Install Workflow Templates

```bash
# Install from marketplace
hojai templates install lead-qualification-pipeline
hojai templates install ai-first-response
```

### 5. Deploy

```bash
hojai deploy
```

---

## 📦 Department Packs

### Sales Department

**5 AI Agents:**
- SDR Agent - Lead qualification, enrichment, outreach
- Account Executive - Discovery, demos, proposals, closing
- Sales Ops - Pipeline analytics, forecasting
- Outreach Agent - Cold emails, LinkedIn, sequences
- Proposal Agent - Document generation, pricing

**10 Workflows Included:**
- Lead Qualification Pipeline
- LinkedIn Outreach
- Email Campaigns
- Proposal Generator
- Pipeline Forecasting
- Competitor Monitoring
- Win/Loss Analysis
- Upsell Detection
- Renewal Alerts
- CRM Cleanup

**Pricing:** ₹45,000/month

### Marketing Department

**5 AI Agents:**
- Content Strategist - SEO, copywriting, blogs
- Campaign Manager - Ad campaigns, optimization
- Social Media Manager - Posting, engagement
- Marketing Analyst - Data, reporting
- SEO Specialist - Keywords, technical SEO

**10 Workflows Included:**
- Content Calendar Automation
- SEO Article Generator
- Review Collection
- Campaign Performance Reporter
- Newsletter Generator
- Blog → Social Automation
- Competitor Ad Tracker
- A/B Test Analyzer
- Influencer Outreach
- Lead Magnet Delivery

**Pricing:** ₹50,000/month

### Support Department

**5 AI Agents:**
- Ticket Agent - Classification, routing
- Chat Agent - Real-time chat support
- Escalation Manager - VIP, complex issues
- Knowledge Base Manager - KB updates
- Quality Assurance - CSAT, coaching

**10 Workflows Included:**
- Ticket Auto-Classification
- AI First Response
- Knowledge Base Auto-Update
- Sentiment Triage
- Escalation Rules
- SLA Breach Alert
- Refund Auto-Approval
- VIP Priority Routing
- CSAT Analysis
- Root Cause Analyzer

**Pricing:** ₹35,000/month

### Finance Department

**5 AI Agents:**
- Accounts Payable - Invoice processing, payments
- Accounts Receivable - Collections, reminders
- Financial Reporter - Reports, dashboards
- Compliance Officer - Tax, audit
- FP&A Analyst - Budgeting, forecasting

**10 Workflows Included:**
- Invoice Processing
- Expense Approval
- Budget Alerts
- Cash Flow Forecasting
- Vendor Payment
- Tax Reminders
- Monthly Close
- Fraud Detection
- Collections Follow-up
- Financial Report

**Pricing:** ₹60,000/month

### HR Department

**5 AI Agents:**
- Recruiting Assistant - Resume screening, sourcing
- Onboarding Coordinator - Welcome, setup
- Leave Manager - Requests, approval
- Payroll Specialist - Processing, compliance
- L&D Agent - Training, certifications

**10 Workflows Included:**
- Employee Onboarding
- Resume Screening
- Interview Scheduler
- Offer Letter Generator
- Leave Approval
- Payroll Notification
- Performance Review
- Learning Recommendations
- Exit Workflow
- Policy Bot

**Pricing:** ₹30,000/month

---

## 🤖 Core AI Agents

### AI SDR Agent

Full-featured Sales Development Representative:

```typescript
import { AISDRAgent } from '@hojai/agents';

const sdr = new AISDRAgent({
  autoFollowUp: true,
  followUpDays: [3, 7, 14],
  meetingLink: 'https://cal.com/demo'
});

const result = await sdr.execute({
  input: {
    name: 'John Doe',
    email: 'john@company.com',
    company: 'Acme Corp',
    job_title: 'VP of Sales',
    source: 'linkedin'
  }
});
```

**Features:**
- Lead enrichment (company data, LinkedIn)
- BANT qualification scoring
- Email personalization
- Follow-up sequences
- Meeting booking
- CRM updates

### AI Support Agent

Intelligent customer support:

```typescript
import { AISupportAgent } from '@hojai/agents';

const support = new AISupportAgent({
  autoRespondConfidence: 0.8,
  slaHours: { P1: 1, P2: 4, P3: 24, P4: 72 }
});

const result = await support.execute({
  input: {
    subject: 'Cannot login to my account',
    description: 'Getting error when trying to login',
    customer_email: 'user@example.com',
    channel: 'email'
  }
});
```

**Features:**
- Ticket classification
- Sentiment analysis
- Knowledge retrieval
- Auto-response (80%+ confidence)
- Escalation routing
- SLA monitoring

### Founder Briefing Agent

Daily executive summary:

```typescript
import { FounderBriefingAgent } from '@hojai/agents';

const briefing = new FounderBriefingAgent({
  channels: ['slack', 'email'],
  recipients: ['founder@company.com'],
  time: '0 7 * * *' // Daily at 7 AM
});

const result = await briefing.execute({});
```

**Features:**
- Sales, marketing, ops, finance metrics
- Trend analysis vs yesterday
- Risk detection
- Opportunity identification
- AI recommendations
- Slack/email delivery

---

## 📋 Workflow Templates

### Structure

Each template is a JSON file with:

```json
{
  "id": "template-id",
  "name": "Template Name",
  "category": "sales",
  "description": "What this does",
  "version": "1.0.0",
  
  "triggers": [
    { "type": "webhook|schedule|event" }
  ],
  
  "nodes": [
    {
      "id": "1",
      "type": "ai_agent|condition|email|...",
      "name": "Node Name",
      "config": {}
    }
  ],
  
  "connections": [
    { "from": "1", "to": "2" }
  ],
  
  "agents": ["agent-ids"],
  "integrations": ["crm", "email"],
  "price": { "subscription": 999, "currency": "INR" }
}
```

### Node Types

| Type | Description |
|------|-------------|
| `trigger` | Start of flow |
| `ai_agent` | Run AI agent |
| `condition` | Branch logic |
| `email/sms/slack` | Send messages |
| `crm` | CRM operations |
| `memory` | Save/load memory |
| `twin` | Update digital twin |
| `approval` | Human approval |
| `actor` | Web scraping |

---

## 🌐 InternetOS (Actors)

### Actor Runtime

```typescript
import { actorRuntime } from '@hojai/actor-runtime';
import googleMapsActor from './actors/google-maps-actor';

actorRuntime.getRegistry().register(googleMapsActor);

const result = await actorRuntime.execute({
  actor: 'google_maps',
  action: 'search',
  params: {
    query: 'restaurants',
    location: 'Bangalore',
    maxResults: 10
  }
});
```

### Available Actors

| Actor | Capabilities |
|-------|-------------|
| Google Maps | Business search, reviews, details |
| LinkedIn | Companies, profiles, jobs |
| Zomato | Restaurants, menus, reviews |
| News | Headlines, trends, sentiment |
| Company Intel | Profiles, competitors, funding |
| Watcher | Continuous monitoring |

---

## 🔧 SDKs

### @hojai/core

```typescript
import { createClient } from '@hojai/core';

const hojai = createClient({
  apiKey: process.env.HOJAI_API_KEY
});

const memory = await hojai.memory();
await memory.save({ type: 'fact', content: 'Meeting at 3pm' });
```

### @hojai/flows

```typescript
import { createWorkflow } from '@hojai/flows';

const workflow = createWorkflow('my-flow', 'My Workflow')
  .addTrigger('webhook', 'New Lead')
  .addAgentNode('sdr-agent', 'qualify', 'Qualify Lead')
  .addCondition('check', 'Score >= 70')
  .connect('qualify', 'check')
  .build();
```

### @hojai/agents

```typescript
import { Agent } from '@hojai/agents';

const agent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  role: 'custom',
  skills: ['task1', 'task2'],
  
  async execute(context) {
    // Agent logic
    return { success: true };
  }
});
```

---

## 💰 Pricing

| Department | Agents | Workflows | Price |
|-----------|-------|-----------|-------|
| Sales | 5 | 10 | ₹45,000/mo |
| Marketing | 5 | 10 | ₹50,000/mo |
| Support | 5 | 10 | ₹35,000/mo |
| Finance | 5 | 10 | ₹60,000/mo |
| HR | 5 | 10 | ₹30,000/mo |
| **Full Suite** | **25** | **50** | **₹200,000/mo** |

Individual workflows: ₹999 - ₹2,999/month
Custom agents: Starting ₹15,000/month

---

## 📁 Project Structure

```
platform/
├── hojai-cli/                    # CLI tool
├── hojai-templates/              # 100 workflow templates
│   ├── sales/                    # 15 sales templates
│   ├── marketing/                # 15 marketing templates
│   ├── support/                  # 10 support templates
│   └── ...
│
├── agents/                       # AI agents
│   ├── ai-sdr-agent/
│   ├── ai-support-agent/
│   ├── founder-briefing-agent/
│   └── ...
│
├── department-packs/            # Pre-built teams
│   ├── sales-department-pack/
│   ├── marketing-department-pack/
│   └── ...
│
├── sdks/                        # TypeScript SDKs
│   ├── @hojai-core/
│   ├── @hojai-flows/
│   └── @hojai-agents/
│
├── studio/
│   └── flow-builder/             # Visual editor
│
├── internet-os/                 # Web data
│   ├── actor-runtime/
│   ├── actors/
│   │   ├── google-maps-actor/
│   │   ├── linkedin-actor/
│   │   ├── zomato-actor/
│   │   ├── news-actor/
│   │   └── company-intel-actor/
│   └── watcher-runtime/
│
└── integrations/
    └── rez-atlas-connector/
```

---

## 🔗 Integrations

### Built-in

- CRM: Salesforce, HubSpot, REZ CRM Hub
- Email: SMTP, SendGrid, Mailgun
- SMS: Twilio, MSG91
- Calendar: Google Calendar, Calendly
- Communication: Slack, WhatsApp
- Analytics: Google Analytics, Mixpanel
- Payments: Razorpay, Stripe
- HRIS: BambooHR, Gusto
- ERP: Tally, QuickBooks, Zoho

### How to Add

```typescript
import { Connector } from '@hojai/connectors';

export class MyIntegration extends Connector {
  // Implement your integration
}
```

---

## 📚 Documentation

- [HOJAI CLI Guide](platform/hojai-cli/README.md)
- [Workflow Templates](platform/hojai-templates/README.md)
- [SDK Documentation](platform/sdks/README.md)
- [Flow Builder Guide](platform/studio/flow-builder/README.md)
- [Actor Runtime](platform/internet-os/actor-runtime/README.md)

---

## 🚀 Roadmap

### Q3 2026
- Visual Flow Builder (UI)
- More Industry Templates (Restaurant, Healthcare)
- Agent Marketplace
- Multi-tenant support

### Q4 2026
- Mobile App (React Native)
- Voice Interface (Genie Integration)
- Advanced Analytics Dashboard
- Custom Model Training

### Q1 2027
- Multi-language Support
- Enterprise SSO
- Custom Domain Deployment
- White-label Options

---

*Built with ❤️ by HOJAI AI*
*Last Updated: June 29, 2026*
