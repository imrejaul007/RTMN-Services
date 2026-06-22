# HOJAI AI - COMPLETE AI EMPLOYEES & AGENTS
**Version:** 1.0 | **Date:** May 30, 2026 | **Status:** COMPLETE

---

# EXECUTIVE SUMMARY

| Category | Count |
|----------|-------|
| HOJAI Agents (Platform) | 9 Agent Types |
| REZ Agents (Services) | 14+ Agents |
| Industry Agents | 2+ |
| Genie Agents | 5+ |
| **Total** | **30+ Agents** |

---

# PART 1: HOJAI AGENTS PLATFORM (4550)

## Agent Types

| Type | Description | Capabilities |
|------|-------------|--------------|
| demand_signal | Detect market demand | predict, recommend |
| scarcity | Manage inventory scarcity | analyze, recommend |
| personalization | Personalize experiences | recommend, learn |
| attribution | Track conversions | analyze, report |
| adaptive_scoring | Dynamic scoring | predict, learn |
| feedback_loop | Process feedback | communicate, learn |
| network_effect | Grow networks | analyze, recommend |
| revenue_attribution | Track revenue | analyze, report |
| custom | Build your own | configurable |

## Agent Capabilities

| Capability | Description |
|-----------|-------------|
| PREDICT | Make predictions |
| RECOMMEND | Suggest actions |
| ACT | Execute tasks |
| LEARN | Improve over time |
| COMMUNICATE | Send messages |
| ANALYZE | Process data |

---

# PART 2: REZ AGENTS (Privileged Tenant)

## 2.1 Autonomous Agents (4062)

**REZ-autonomous-agents** - Main orchestration service

### 8 Core Agents

| Agent | Port | Purpose |
|-------|------|---------|
| Sales Agent | 4066 | Lead qualification, follow-up |
| Support Agent | - | FAQ, ticket routing |
| Fraud Agent | - | Anomaly detection |
| Info Agent | - | Knowledge retrieval |
| Consultant Agent | - | Business advice |
| Commerce Agents | - | E-commerce automation |
| Planning Agent | - | Scheduling, planning |
| Research Agent | - | Opportunity research |

### Agent Details

#### Sales Agent
```
Purpose: Automate sales process
Features:
- Lead qualification
- Follow-up automation
- Demo scheduling
- Proposal generation
- CRM updates
```

#### Support Agent
```
Purpose: Customer support automation
Features:
- FAQ responses
- Ticket routing
- Status updates
- Refund processing
```

#### Fraud Agent
```
Purpose: Detect fraud
Features:
- Transaction monitoring
- Anomaly detection
- Risk scoring
- Alert generation
```

#### Info Agent
```
Purpose: Answer questions
Features:
- Knowledge retrieval
- Document search
- FAQ answers
- Context provision
```

#### Consultant Agent
```
Purpose: Business advice
Features:
- Strategy recommendations
- Best practices
- Performance analysis
```

#### Commerce Agents
```
Purpose: E-commerce automation
Features:
- Order management
- Inventory updates
- Pricing optimization
```

#### Planning Agent
```
Purpose: Scheduling and planning
Features:
- Calendar management
- Meeting scheduling
- Task prioritization
```

#### Research Agent
```
Purpose: Research opportunities
Features:
- Market analysis
- Competitor tracking
- Trend detection
```

---

# PART 3: INDUSTRY AGENTS

## 3.1 Jewelry Intelligence (4750)

| Agent | Purpose |
|-------|---------|
| Bridal Advisor | Predict bridal conversions |
| Gold Cycle Agent | Predict gold buying patterns |
| Price Sensitivity Agent | Analyze price sensitivity |
| Inventory Optimizer | Manage jewelry inventory |

## 3.2 Healthcare Intelligence (4751)

| Agent | Purpose |
|-------|---------|
| No-Show Predictor | Predict appointment no-shows |
| Adherence Agent | Monitor treatment adherence |
| Patient Risk Agent | Stratify patient risk |
| Appointment Agent | Optimize scheduling |

---

# PART 4: GENIE AGENTS

## 4.1 Personal Agents

| Agent | Purpose | Port |
|-------|---------|------|
| Executive Genie | Meetings, priorities | 4561 |
| Research Genie | Information gathering | - |
| Travel Genie | Flights, hotels, rides | - |
| Health Genie | Reports, wellness | - |
| Finance Genie | Bills, subscriptions | - |
| Relationship Genie | Follow-ups, networking | - |

## 4.2 Agent Capabilities

### Executive Genie
```
Purpose: Manage your schedule and priorities
Features:
- Calendar management
- Task prioritization
- Meeting preparation
- Email drafting
```

### Research Genie
```
Purpose: Find and organize information
Features:
- Web search
- Document analysis
- Note taking
- Summarization
```

### Travel Genie
```
Purpose: Handle travel planning
Features:
- Flight booking
- Hotel reservation
- Ride scheduling
- Itinerary management
```

### Health Genie
```
Purpose: Health management
Features:
- Medical report analysis
- Appointment reminders
- Medication tracking
- Wellness recommendations
```

### Finance Genie
```
Purpose: Financial management
Features:
- Bill tracking
- Subscription management
- Spending analysis
- Budget recommendations
```

### Relationship Genie
```
Purpose: Maintain relationships
Features:
- Follow-up reminders
- Birthday tracking
- Interaction logging
- Contact prioritization
```

---

# PART 5: LLM-POWERED AGENTS

## 5.1 Via HOJAI LLM Providers (4730)

| Agent | LLM | Purpose |
|-------|-----|---------|
| Support Chat | GPT-4o-mini | Customer support |
| Sales Chat | Claude 3.5 | Sales conversations |
| Analysis | Claude 3.5 | Deep analysis |
| Creative | GPT-4o | Content generation |
| Code | GPT-4o | Code assistance |

## 5.2 Via RAG (4731)

| Agent | Purpose |
|-------|---------|
| Knowledge Agent | Answer from docs |
| Support Agent | Technical support |
| Sales Agent | Product info |
| Onboarding Agent | New user help |

---

# PART 6: AGENT COMPARISON TABLE

| Agent | Type | Domain | Port | Status |
|-------|------|--------|------|--------|
| Sales Agent | REZ | Commerce | 4066 | Built |
| Support Agent | REZ | Support | - | Built |
| Fraud Agent | REZ | Security | - | Built |
| Info Agent | REZ | Knowledge | - | Built |
| Consultant Agent | REZ | Business | - | Built |
| Commerce Agents | REZ | E-commerce | - | Built |
| Planning Agent | REZ | Scheduling | - | Built |
| Research Agent | REZ | Research | - | Built |
| Bridal Advisor | Jewelry | Retail | 4750 | Built |
| Gold Cycle Agent | Jewelry | Retail | 4750 | Built |
| No-Show Predictor | Healthcare | Medical | 4751 | Built |
| Adherence Agent | Healthcare | Medical | 4751 | Built |
| Executive Genie | Genie | Personal | 4561 | Built |
| Research Genie | Genie | Personal | - | Planned |
| Travel Genie | Genie | Personal | - | Planned |
| Health Genie | Genie | Personal | - | Planned |
| Finance Genie | Genie | Personal | - | Planned |
| Relationship Genie | Genie | Personal | - | Planned |

---

# PART 7: AGENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│              HOJAI AGENTS PLATFORM                  │
├─────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────┐  │
│  │           AGENT ORCHESTRATION                 │  │
│  │  ├── LangGraph / ReAct                      │  │
│  │  ├── Tool definitions                         │  │
│  │  └── Memory integration                       │  │
│  └─────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─────────────────────────────────────────────┐  │
│  │           LLM PROVIDERS                       │  │
│  │  ├── OpenAI (GPT-4o-mini)                 │  │
│  │  ├── Anthropic (Claude 3.5)               │  │
│  │  ├── Google (Gemini)                       │  │
│  │  └── Local (Llama 3)                       │  │
│  └─────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─────────────────────────────────────────────┐  │
│  │           TOOLS & ACTIONS                     │  │
│  │  ├── Search                                 │  │
│  │  ├── Database                             │  │
│  │  ├── API calls                             │  │
│  │  ├── Messaging                             │  │
│  │  └── Calendar                              │  │
│  └─────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─────────────────────────────────────────────┐  │
│  │           MEMORY & CONTEXT                   │  │
│  │  ├── HOJAI Memory (4520)                   │  │
│  │  ├── Vector DB (4721)                      │  │
│  │  └── Session (Redis)                       │  │
│  └─────────────────────────────────────────────┘  │
│                                                        │
└─────────────────────────────────────────────────────┘
```

---

# PART 8: HOW TO CREATE AN AGENT

## Step 1: Define Agent Type

```typescript
import { AgentType, AgentCapability } from '@hojai/agents';

const agent = {
  name: 'My Sales Agent',
  type: AgentType.CUSTOM,
  capabilities: [
    AgentCapability.PREDICT,
    AgentCapability.RECOMMEND,
    AgentCapability.COMMUNICATE
  ]
};
```

## Step 2: Register Agent

```bash
curl -X POST http://localhost:4550/api/agents \
  -H "X-Tenant-Id: tenant_123" \
  -d '{
    "name": "Sales Agent",
    "type": "custom",
    "capabilities": ["predict", "recommend"]
  }'
```

## Step 3: Run Agent

```bash
curl -X POST http://localhost:4550/api/agents/sales_1/run \
  -H "X-Tenant-Id: tenant_123" \
  -d '{"input": "Qualify this lead", "context": {...}}'
```

---

# PART 9: AGENT CAPABILITIES MATRIX

| Agent | Predict | Recommend | Act | Learn | Communicate | Analyze |
|-------|---------|-----------|-----|-------|-------------|--------|
| Sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Support | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fraud | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Info | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Consultant | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Executive Genie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Research Genie | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Travel Genie | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Health Genie | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Finance Genie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# PART 10: USE CASES BY AGENT

## Sales

| Agent | Use Case |
|-------|---------|
| Sales Agent | Lead qualification, follow-up |
| Research Agent | Market research, competitor analysis |
| Consultant Agent | Deal strategy |

## Support

| Agent | Use Case |
|-------|---------|
| Support Agent | FAQ, ticket routing |
| Info Agent | Knowledge base answers |
| Fraud Agent | Issue detection |

## Operations

| Agent | Use Case |
|-------|---------|
| Planning Agent | Scheduling, calendar |
| Commerce Agents | Inventory, pricing |
| Attribution Agent | Revenue tracking |

## Personal (Genie)

| Agent | Use Case |
|-------|---------|
| Executive Genie | Daily priorities |
| Travel Genie | Trip planning |
| Health Genie | Wellness tracking |
| Finance Genie | Bill management |
| Relationship Genie | Contact follow-up |

---

# PART 11: DEPLOYMENT

## Start Agents Platform

```bash
cd hojai-ai/packages/hojai-agents
npm run dev  # Port 4550
```

## List Available Agents

```bash
curl http://localhost:4550/api/agents \
  -H "X-Tenant-Id: tenant_123"
```

## Run Specific Agent

```bash
curl -X POST http://localhost:4550/api/agents/{agent_id}/run \
  -H "X-Tenant-Id: tenant_123" \
  -d '{"input": "Your query here"}'
```

---

# PART 12: FUTURE AGENTS

## Planned

| Agent | Status | ETA |
|-------|--------|-----|
| Marketing Agent | Planned | Q3 2026 |
| HR Agent | Planned | Q3 2026 |
| Legal Agent | Planned | Q4 2026 |
| Creative Agent | Planned | Q4 2026 |
| Code Agent | Planned | Q4 2026 |

---

# SUMMARY

## All Agents by Category

### Commerce
1. Sales Agent
2. Commerce Agents
3. Consultant Agent

### Support
4. Support Agent
5. Info Agent
6. Fraud Agent

### Operations
7. Planning Agent
8. Research Agent
9. Attribution Agent

### Personal (Genie)
10. Executive Genie
11. Research Genie
12. Travel Genie
13. Health Genie
14. Finance Genie
15. Relationship Genie

### Industry
16. Bridal Advisor (Jewelry)
17. Gold Cycle Agent (Jewelry)
18. No-Show Predictor (Healthcare)
19. Adherence Agent (Healthcare)

**Total: 19+ Built Agents**

---

*Document Version: 1.0*
*Last Updated: May 30, 2026*
