# HOJAI AI — Service Classification Map

> **Date:** 2026-06-20
> **Status:** Source of truth for product reorganization
> **Goal:** Map every HOJAI AI service into a product that users recognize and buy.

## Products (11)

### 🧠 Personal AI Products

#### 1. Genie — Personal AI Assistant
Voice + chat + memory + personal twin. The flagship consumer product.

| Service | Port |
|---|---|
| genie-gateway | 4701 |
| genie-wake-word-service | 4767 |
| genie-listening-modes | 4768 |
| genie-device-integration | 4769 |
| genie-calendar-service | 4709 |
| genie-memory-inbox | 4710 |
| genie-briefing-service | 4712 |
| genie-universal-search | 4713 |
| genie-serendipity-service | 4714 |
| genie-smart-forgetting-service | 4715 |
| genie-shopping-agent | 4716 |
| genie-companion-service | — |
| genie-consultant-agent | — |
| genie-creation-os | — |
| genie-learning-os | — |
| genie-life-gps | — |
| genie-life-university | — |
| genie-memory-graph | — |
| genie-money-os | — |
| genie-relationship-os | — |
| genie-thinking-engine | — |
| genie-wellness-os | — |
| genie-execution-engine | — |

#### 2. Razo — Communication OS / Smart Keyboard
Intent detection, multi-channel messaging.

| Service | Port |
|---|---|
| razo-keyboard | 4725 |

### 🚀 Founder AI Products

#### 3. Founder OS Product — OKRs + journal
Founder's complete AI operating system (journaling, OKRs, daily rituals).

| Service | Port |
|---|---|
| (to be built — uses genie-thinking-engine, genie-calendar, genie-briefing) | 4266 |

#### 4. Board Intelligence — Meetings + resolutions
Board meeting prep, resolution drafting, minute-taking.

| Service | Port |
|---|---|
| meeting-os | 4264 |

#### 5. Investor Copilot — Rounds + cap-table
For VCs / angels. Round modeling, cap-table analysis, deal flow.

| Service | Port |
|---|---|
| (to be built — needs cap-table service, round-tracking) | 4265 |

#### 6. Startup Studio — Cohorts + mentors
AI-assisted startup creation. Cohort management, mentor matching.

| Service | Port |
|---|---|
| (to be built — uses genie-companion, pilot-onboarding) | 4267 |

#### 7. Company Builder Suite — Entity formation
Toolchain for company formation (legal docs, registrations, banking).

| Service | Port |
|---|---|
| (to be built — needs legal-doc-gen, banking-integration) | 4268 |

### 💼 Enterprise AI Products

#### 8. Bizora — Enterprise BI
Business intelligence for the AI era. Dashboards, analytics, insights.

| Service | Port |
|---|---|
| reports-dashboard | 4261 |
| customer-intelligence | 4885 |

#### 9. HIB — Human-in-the-Loop (HOJAI Intelligence Bureau)
Internal AI consulting layer. When AI needs human review/escalation.

| Service | Port |
|---|---|
| live-chat | 4262 |
| live-support-os | — |
| helpdesk-ticketing-service | — |
| support-escalation-service | — |
| support-sla-service | — |

#### 10. AI Workspace — Docs + threads
Unified work/personal OS. Threads, docs, search.

| Service | Port |
|---|---|
| email-os | 4263 |
| document-intelligence | — |
| context-engine | — |
| knowledge-base | — |
| knowledge-base-service | — |

#### 11. Copilots — Role-based AI assistants
Specialized copilots for each role.

| Service | Port |
|---|---|
| agent-copilot | 4920 |
| business-copilot | — |
| sales-copilot | 4928 |
| marketing-copilot | 4929 |
| finance-copilot | 4930 |
| executive-copilot | 4933 |
| support-copilot | 4895 |

### 🏗️ Infrastructure Products (cross-product platform)

#### Platform — Shared services used by every product

| Service | Port | Why |
|---|---|---|
| corpid-service | 4702 | Universal identity — every product needs this |
| twinos-hub | 4705 | Digital twin platform |
| memory-os | 4703 | AI memory |
| twin-memory-bridge | 4704 | Binds twins to memory |
| event-bus | — | Service-to-service events |
| api-gateway | 4500 | Single entry point for HOJAI services |
| ai-intelligence | 4881 | AI brain, agent runtime |
| flow-orchestrator | 4244 | Orchestration layer |
| reasoning-runtime | 4253 | ReAct/CoT/ToT |
| policy-os | 4254 | Business rules |
| goal-os | — | Goal decomposition |
| goal-conflict-engine | — | Multi-goal coordination |
| skill-os | 4743 | Reusable capabilities |
| skill-marketplace | 4120 | Buy/sell skills |
| prompt-marketplace | 4130 | Buy/sell prompts |
| connector-hub | 4785 | 8 SaaS connectors |
| connector-marketplace | — | Connector directory |
| rag-platform | — | RAG infrastructure |
| vector-db | — | Embeddings storage |
| graph-database | — | Knowledge graph storage |
| semantic-cache | — | LLM response cache |
| knowledge-extraction | — | Extract entities/relations |
| knowledge-marketplace | — | Buy/sell knowledge packs |
| knowledge-network | — | Federated knowledge |
| inference-gateway | — | LLM routing |
| model-registry | — | Model versioning |
| gpu-cluster-manager | — | GPU allocation |
| fine-tuning-pipeline | — | Custom model training |
| rlhf-pipeline | — | RLHF training |
| synthetic-data-generation | — | Synthetic data |
| evaluation-harness | — | Model evaluation |
| feature-store | — | Feature engineering |
| data-catalog | — | Data discovery |
| workflow-marketplace | — | Buy/sell workflows |
| decision-engine | — | Policy decisions |
| decision-intelligence | — | Decision analytics |
| simulation-os | — | What-if scenarios |
| predictive-intelligence | — | Predictions |
| risk-intelligence | — | Risk scoring |
| trust-intelligence | — | Trust scoring |
| journey-intelligence | — | User journey analytics |
| translation-os | — | Multi-language |
| tenant-manager | — | Multi-tenant management |
| billing | — | Usage billing |
| usage-tracker | — | Track usage |
| secrets-manager | — | Secrets storage |
| sla-manager | — | SLA tracking |
| feature-flags | — | Feature toggles |
| sandbox | — | Test environment |
| webhook-bus | — | Webhook delivery |
| notification-service | — | Push/email/SMS |
| pilot-onboarding | — | Pilot customer onboarding |
| reports-dashboard | — | Reports UI |
| industry-packs | — | Industry-specific data |
| ai-safety | — | Safety guardrails |
| centralized-observability | — | Logs/metrics/traces |
| incident-management-service | — | Incident tracking |
| document-intelligence | — | Doc parsing |
| onboarding-portal | — | User onboarding |
| industry-twin | — | Industry aggregations |
| prompt-manager | — | Prompt versioning |
| memory-confidence | — | Memory quality scoring |
| micro-intelligence | — | Edge AI |
| graphql-federation | — | GraphQL gateway |

#### SUTAR OS — Autonomous Economic Infrastructure (sub-product)
AI marketplace, negotiation, trust, contracts, reputation. Used by products for monetization.

| Service | Port | Why |
|---|---|---|
| sutar-gateway | 4140 | SUTAR entry point |
| sutar-agent-id | 4145 | Agent identity |
| sutar-agent-network | 4155 | Agent discovery |
| sutar-identity | 4144 | Identity for agents |
| sutar-twin-os | 4142 | Twin for agents |
| sutar-memory-bridge | 4143 | Memory for agents |
| sutar-contracts | 4185 | Smart contracts |
| sutar-exploration | 4255 | Discovery |
| sutar-multi-agent-evaluator | 4257 | Agent scoring |
| sutar-reputation-aggregator | 4258 | Reputation |
| sutar-founder-os | 4260 | Founder AI |
| sutar-monitoring | 3100 | System monitoring |
| sutar-discovery-engine | (decision-engine shares logic) | Discovery |
| sutar-decision-engine | (decision-engine shares logic) | Decisions |
| sutar-goal-os | (goal-os shares logic) | Goals |
| sutar-policy-os | (policy-os shares logic) | Policy |
| sutar-trust-engine | (trust-intelligence shares logic) | Trust |
| sutar-negotiation-engine | (negotiation-ai shares logic) | Negotiation |
| sutar-usage-tracker | (usage-tracker shares logic) | Usage |
| sutar-flow-os | (flow-orchestrator shares logic) | Flow |
| sutar-marketplace | (sutar-gateway covers) | Marketplace |
| sutar-economy-os | (billing covers) | Economy |
| twin-marketplace | (sutar-gateway covers) | Twin marketplace |
| acp-protocol | 4800 | Agent messaging |
| acn-hub | 4800 | ACN entry |
| acn-network | 4801 | Agent registry |
| acn-integration | 4849 | RTMN bridge |
| merchant-agents | — | Merchant AI |
| agent-twin | — | Agent twin |
| agent-marketplace | 4845 | Agent marketplace |
| agent-reputation | 4820 | Agent reputation |
| agent-contracts | 4830 | Agent contracts |
| agent-wallets | 4840 | Agent wallets |
| agent-economy | — | Agent economy |
| agent-analytics | 4848 | Agent metrics |
| agent-learning | 4846 | Agent ML |
| agent-orchestration | 4851 | Agent coordination |
| negotiation-ai | 4850 | ML negotiation |
| dispute-resolution | 4847 | Disputes |
| discovery-engine | — | Universal discovery |

#### Twins — Digital twins (foundation for products)
Every product uses these.

| Service | Port | Why |
|---|---|---|
| organization-twin | 4710 | Org aggregate |
| employee-twin | 4730 | Per-employee |
| product-twin | 4720 | Product catalog |
| asset-twin | 4890 | Assets |
| partner-twin | 4892 | Partners |
| lead-twin | 4894 | Leads |
| customer-twin | 4895 | Customers |
| order-twin | 4885 | Orders |
| wallet-twin | 4896 | Wallets |
| voice-twin | 4876 | Voice profiles |
| user-twin | 4889 | Platform users |
| area-twin | — | Geographic |
| buyer-twin | — | Buyers |
| deal-twin | — | Deals |
| inventory-twin | — | Inventory |
| merchant-twin | — | Merchants |
| payment-twin | — | Payments |
| property-twin | — | Real estate |
| referral-twin | — | Referrals |
| twin-capability-profile | — | Capability profiles |
| twinos-shared | — | Twin lib |

#### Legacy / To-Classify
| Service | Port | Note |
|---|---|---|
| unified-os-hub | 4399 | RTMN hub, not HOJAI |
| REZ-support-tools-hub | — | Should move to REZ-Merchant |
| customer-support-service | 4055 | HOJAI-owned, used by Copilots |
| industry-packs | — | Industry data |
| merchant-agents | — | SUTAR |

## Final Structure

```
companies/HOJAI-AI/
├── products/
│   ├── genie/                # Personal AI
│   ├── razo/                 # Smart keyboard
│   ├── founder-os/           # Founder OKRs+journal
│   ├── board-intelligence/   # Meetings+resolutions
│   ├── investor-copilot/     # Rounds+cap-table
│   ├── startup-studio/       # Cohorts+mentors
│   ├── company-builder/      # Entity formation
│   ├── bizora/               # Enterprise BI
│   ├── hib/                  # Human-in-the-Loop
│   ├── ai-workspace/         # Docs+threads
│   └── copilots/             # All role copilots
│
├── platform/                 # Cross-product platform (foundation)
│   ├── identity/             # corpid-service
│   ├── twins/                # twinos-hub + 21 twins
│   ├── memory/               # memory-os + bridges
│   ├── intelligence/         # ai-intelligence, reasoning, rag
│   ├── flow/                 # orchestrator, policy, goals
│   ├── skills/               # skill-os, marketplace, prompts
│   ├── connectors/           # connector-hub
│   ├── training/             # fine-tuning, rlhf, gpu
│   ├── observability/        # logs, metrics, incidents
│   └── infra/                # secrets, billing, sla, feature-flags, sandbox
│
├── sutar-os/                 # Autonomous Economic Infrastructure
│   ├── core/                 # gateway, agent-id, identity, twin
│   ├── marketplace/          # marketplace, discovery, reputation
│   ├── contracts/            # contracts, negotiation, disputes
│   ├── agents/               # merchant-agents, agent-*, acn-*
│   └── economy/              # wallet, billing-share, usage
│
├── shared/                   # @rtmn/shared library (unchanged)
├── divisions/                # Architecture docs (unchanged)
├── docs/                     # Public docs (unchanged)
├── leverge/                  # EXTERNAL CLIENT (DO NOT TOUCH)
└── services/                 # LEGACY - empty after migration
```

## Migration Strategy

Phase A: Create new directory structure
Phase B: `git mv` services into products/platform/sutar-os
Phase C: Update import paths
Phase D: Test smoke
Phase E: Update docs + RTMN hub routes
Phase F: Remove empty `services/` dir
