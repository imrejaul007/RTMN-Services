# 🧠 Employee Twin Ecosystem

> **Version:** 1.0.0
> **Date:** June 26, 2026
> **Status:** 🟢 Production Ready

A comprehensive AI-powered digital twin system that creates continuously learning digital representations of employees. Each twin observes, learns, and eventually assists—or autonomously executes—tasks on behalf of its human counterpart.

---

## 🎯 Vision

> **1 Human + 1 Twin = 10x Productivity, 24×7 Execution, Zero Knowledge Loss**

The Twin does not replace the employee. The Twin multiplies the employee.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Human Employee                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Employee Twin Ecosystem                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  CORE TWINS (9 Types)                    │   │
│  │                                                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │   │
│  │  │Identity │ │ Memory  │ │Knowledge│ │ Skill   │     │   │
│  │  │ Twin    │ │ Twin    │ │ Twin    │ │ Twin    │     │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │   │
│  │                                                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │   │
│  │  │Workflow │ │Decision │ │Comm.    │ │Relation │     │   │
│  │  │ Twin    │ │ Twin    │ │ Twin    │ │ Twin    │     │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │   │
│  │                                                          │   │
│  │  ┌─────────┐ ┌─────────┐                            │   │
│  │  │Behavior │ │Reputa- │                            │   │
│  │  │ Twin    │ │tion Twin│                            │   │
│  │  └─────────┘ └─────────┘                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  OBSERVATION LAYER                       │   │
│  │  Twin Observer │ Meeting Intelligence │ Skill Wallet       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION LAYER                         │   │
│  │  Autonomy Controller │ 24×7 Engine │ Shadow Mode          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  CONNECTOR ECOSYSTEM                      │   │
│  │  Slack │ GitHub │ Jira │ Gmail │ Calendar │ CRM          │   │
│  │  Salesforce │ Shopify │ Stripe │ Notion │ HubSpot         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Service Inventory

### Phase 1: Core Twins

| Service | Port | Description |
|---------|------|-------------|
| **Memory Twin** | 4738 | Personal memory storage |
| **Knowledge Twin** | 4739 | Knowledge nodes and expertise |
| **Workflow Twin** | 4741 | Workflow patterns and automation |
| **Decision Twin** | 4742 | Decision capture and prediction |
| **Communication Twin** | 4743 | Writing style and tone analysis |
| **Relationship Twin** | 4744 | Professional network graph |
| **Reputation Twin** | 4745 | Trust scores and reviews |
| **Behavioral Twin** | 4746 | Work style and productivity |

### Phase 2: Observation Layer

| Service | Port | Description |
|---------|------|-------------|
| **Twin Observer** | 4747 | Event ingestion and routing |
| **Meeting Intelligence** | 4749 | Transcription and decisions |
| **Skill Wallet** | 4750 | Personal skills and composition |

### Phase 3: Agent Runtimes

| Service | Port | Description |
|---------|------|-------------|
| **Browser Agent** | 4751 | Web automation for legacy software |
| **Desktop Agent** | 4752 | Windows application automation |

### Phase 4: Skill Economy

| Service | Port | Description |
|---------|------|-------------|
| **Skill Creator Studio** | 4754 | Create and publish skills |
| **Skill Certification** | 4755 | Badge levels and reviews |
| **Skill Analytics** | 4756 | Usage and effectiveness tracking |
| **Creator Payout** | 4757 | Revenue split (70/20/10) |
| **BAM Skill Adapter** | 4758 | BAM Marketplace integration |
| **Enterprise Skill Portal** | 4759 | Enterprise licensing |

### Phase 5: Autonomous Execution

| Service | Port | Description |
|---------|------|-------------|
| **Autonomy Controller** | 4760 | Modes: shadow/assist/delegate/autonomous |
| **24×7 Execution Engine** | 4761 | Continuous task execution |
| **Twin Shadow Mode** | 4762 | Watch and suggest |
| **Emergency Stop** | 4763 | Safety mechanism |
| **Notification Orchestrator** | 4764 | Multi-channel notifications |

### Phase 6: Polish

| Service | Port | Description |
|---------|------|-------------|
| **Twin Dashboard** | 4770 | Unified dashboard |
| **Twin Mobile** | 4771 | Mobile companion API |
| **Twin Analytics** | 4772 | Insights and trends |
| **Twin Health Monitor** | 4773 | Service health monitoring |

### Connectors

| Connector | Port | Description |
|-----------|------|-------------|
| **Slack** | 4790 | Workplace communication |
| **GitHub** | 4791 | Code and collaboration |
| **Gmail** | 4792 | Email integration |
| **Jira** | 4793 | Project management |
| **Notion** | 4794 | Documents and knowledge |
| **Calendar** | 4795 | Google Calendar / Outlook |
| **Salesforce** | 4786 | CRM integration |
| **Shopify** | 4787 | E-commerce |
| **Stripe** | 4788 | Payments |

---

## 🚀 Quick Start

### Start All Services

```bash
# Start all twin services
bash companies/HOJAI-AI/scripts/start-employee-twin.sh

# Check health of all services
curl http://localhost:4773/api/health/services
```

### Start Individual Services

```bash
# Communication Twin
cd companies/HOJAI-AI/platform/twins/communication-twin
npm run dev

# Workflow Twin
cd companies/HOJAI-AI/platform/twins/workflow-twin
npm run dev
```

### Test Services

```bash
# Health check
curl http://localhost:4743/health

# Analyze writing style
curl -X POST http://localhost:4743/api/twin/emp123/communication/style \
  -H "Content-Type: application/json" \
  -d '{"text": "Dear Sir, I am writing to inform you that we have received your request. Regards.", "channel": "email"}'

# Capture a decision
curl -X POST http://localhost:4742/api/twin/emp123/decision/capture \
  -H "Content-Type: application/json" \
  -d '{"type": "purchasing", "choice": "Supplier A", "reasoning": "Best price-quality ratio"}'
```

---

## 🔌 API Examples

### Communication Twin

```typescript
// Analyze writing style
POST /api/twin/:employeeId/communication/style
{
  "text": "Dear Sir, Thank you for your proposal...",
  "channel": "email"
}

// Get tone analysis
POST /api/twin/:employeeId/communication/tone
{
  "text": "URGENT: Need this ASAP!",
  "channel": "slack"
}

// Simulate response
POST /api/twin/:employeeId/communication/simulate
{
  "context": "follow-up email",
  "recipientType": "customer"
}
```

### Workflow Twin

```typescript
// Observe actions
POST /api/twin/:employeeId/workflow/observe
{
  "tool": "crm",
  "action": "create_lead",
  "target": "lead_form"
}

// Get patterns
GET /api/twin/:employeeId/workflow/patterns

// Simulate workflow
POST /api/twin/:employeeId/workflow/simulate
{
  "workflowId": "wf_123",
  "context": { "leadId": "lead_456" }
}
```

### Decision Twin

```typescript
// Capture decision
POST /api/twin/:employeeId/decision/capture
{
  "type": "purchasing",
  "choice": "Supplier B",
  "alternatives": ["Supplier A", "Supplier C"],
  "reasoning": {
    "factors": [
      { "name": "price", "weight": 0.3 },
      { "name": "quality", "weight": 0.5 }
    ]
  }
}

// Predict decision
POST /api/twin/:employeeId/decision/predict
{
  "context": { "type": "purchasing" },
  "options": ["A", "B", "C"]
}
```

### Autonomy Controller

```typescript
// Set mode
POST /api/autonomy/:employeeId/mode
{ "mode": "delegate" }

// Add boundary
POST /api/autonomy/:employeeId/boundaries
{
  "type": "amount",
  "condition": "purchases_under_1000",
  "allowed": true,
  "maxValue": 1000
}

// Check if approval needed
POST /api/autonomy/:employeeId/check-approval
{
  "confidence": 92,
  "type": "payment",
  "amount": 500
}
```

---

## 🧩 The Learning Pipeline

### Phase 1: Observer Mode (First 30-90 days)
- Twin only watches
- No autonomous actions
- Builds behavior graph

### Phase 2: Assistant Mode
- Twin suggests
- Human approves
- Productivity: 2-3x

### Phase 3: Co-Worker Mode
- Twin executes
- Human supervises
- Productivity: 5x

### Phase 4: Delegation Mode
- Human defines boundaries
- Twin operates within limits
- Productivity: 7-10x

### Phase 5: Autonomous Mode (24×7)
- Twin works while human sleeps
- Only escalates exceptions
- Productivity: 10x+

---

## 🔐 Security & Safety

### Confidence Thresholds

| Threshold | Score | Action |
|-----------|-------|--------|
| **Critical** | 99% | Always ask |
| **High** | 95% | Manager approval |
| **Medium** | 85% | Auto-execute |
| **Low** | 70% | Auto-execute |

### Emergency Stop

```typescript
// Trigger emergency stop
POST /api/emergency/stop
{ "employeeId": "emp123", "reason": "Suspicious activity detected" }

// Resume operations
POST /api/emergency/resume
```

### Boundaries

```typescript
// Amount boundaries
POST /api/autonomy/:employeeId/boundaries
{
  "type": "amount",
  "condition": "purchases",
  "maxValue": 10000,
  "allowed": true
}

// Vendor boundaries
POST /api/autonomy/:employeeId/boundaries
{
  "type": "vendor",
  "condition": "new_vendors",
  "allowed": false
}
```

---

## 📊 Skill Economy

### Revenue Split

| Party | Percentage |
|-------|------------|
| Creator | 70% |
| Platform (BAM) | 20% |
| Affiliates | 10% |

### Certification Levels

1. **Community** - Self-certified
2. **Verified** - ID verified
3. **Professional** - Expert reviewed
4. **Enterprise** - Used by major companies
5. **Official** - HOJAI certified

---

## 🔗 Dependencies

### External Services

| Service | Purpose |
|---------|---------|
| MemoryOS (4703) | Persistent storage |
| Memory Confidence (4152) | Fact reliability |
| Twin Memory Bridge (4704) | Twin-memory links |
| Skill Library (4806) | Global skills |
| AgentOS (12 services) | Agent management |

### External Integrations (Connectors)

| Integration | API Required |
|-------------|-------------|
| Slack | SLACK_BOT_TOKEN |
| GitHub | GITHUB_TOKEN |
| Gmail | GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET |
| Jira | JIRA_URL + JIRA_TOKEN |
| Notion | NOTION_TOKEN |
| Salesforce | SF_CLIENT_ID + SF_CLIENT_SECRET |
| Shopify | SHOPIFY_SHOP_DOMAIN + SHOPIFY_ACCESS_TOKEN |
| Stripe | STRIPE_SECRET_KEY |

---

## 📁 Project Structure

```
companies/HOJAI-AI/platform/
├── twins/
│   ├── communication-twin/       # Writing style, tone
│   ├── workflow-twin/          # Workflow patterns
│   ├── decision-twin/          # Decision capture
│   ├── relationship-twin/      # Network graph
│   ├── behavioral-twin/        # Work style
│   ├── knowledge-twin/         # Knowledge nodes
│   ├── reputation-twin/        # Trust scores
│   ├── memory-twin/           # Personal memory
│   ├── twin-observer/          # Event routing
│   ├── meeting-intelligence/   # Transcription
│   ├── skill-wallet/          # Personal skills
│   ├── twin-autonomy-controller/ # Modes & boundaries
│   ├── execution-engine-24x7/  # 24x7 execution
│   ├── twin-shadow-mode/      # Watch & suggest
│   ├── emergency-stop/        # Safety
│   ├── notification-orchestrator/ # Notifications
│   ├── twin-dashboard/        # Dashboard
│   ├── twin-mobile/           # Mobile API
│   ├── twin-analytics/        # Insights
│   └── twin-health-monitor/   # Health
├── agents/
│   ├── browser-agent/         # Web automation
│   └── desktop-agent/         # Windows automation
├── skills/
│   ├── skill-creator-studio/  # Create skills
│   ├── skill-certification/    # Badge levels
│   ├── skill-analytics/       # Usage tracking
│   ├── creator-payout/        # Revenue split
│   ├── bam-skill-adapter/    # BAM integration
│   └── enterprise-skill-portal/ # Enterprise
├── connectors/
│   ├── slack-connector/
│   ├── github-connector/
│   ├── gmail-connector/
│   ├── jira-connector/
│   ├── notion-connector/
│   ├── calendar-connector/
│   ├── salesforce-connector/
│   ├── shopify-connector/
│   └── stripe-connector/
└── packages/
    └── twin-types/            # Shared types
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific service tests
cd companies/HOJAI-AI/platform/twins/communication-twin
npm test

# Health check
curl http://localhost:4743/health
curl http://localhost:4773/api/health/services
```

---

## 📚 Documentation

- [Plan Document](./plans/employee-twin-ecosystem-complete-plan.md)
- [Port Registry](./CANONICAL-PORT-REGISTRY.md)
- [Twin Learning OS](./twin-learning-os/src/index.ts)
- [Twin Execution OS](./twin-execution-os/src/index.ts)
- [Twin Feedback OS](./twin-feedback-os/src/index.ts)

---

## 🤝 Contributing

1. Create a new twin service following the template
2. Add to `packages/twin-types/src/` with shared types
3. Update port registry
4. Add tests in `__tests__/` directory
5. Update this README

---

## 📄 License

MIT - HOJAI AI

---

**Last Updated:** June 26, 2026
**Version:** 1.0.0
