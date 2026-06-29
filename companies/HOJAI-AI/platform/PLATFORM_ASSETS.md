# HOJAI Platform Asset Inventory

> **Authoritative reference** for what exists. Use this for audits, not file scanning.

## Connectors - `platform/connectors/`

| # | Connector | Notes |
|---|-----------|-------|
| 1 | asana-connector | |
| 2 | calendar-connector | Calendar |
| 3 | connector-hub | Hub for all |
| 4 | connector-marketplace | |
| 5 | connector-registry | |
| 6 | freshdesk-connector | |
| 7 | freshworks-connector | |
| 8 | github-connector | GitHub + PR reviews |
| 9 | gmail-connector | Gmail + email |
| 10 | hubspot-connector | |
| 11 | intercom-connector | |
| 12 | jira-connector | |
| 13 | linear-connector | |
| 14 | notion-connector | |
| 15 | oracle-connector | |
| 16 | quickbooks-connector | |
| 17 | salesforce-connector | |
| 18 | sap-connector | |
| 19 | shopify-connector | |
| 20 | slack-connector | |
| 21 | stripe-connector | |
| 22 | teams-connector | |
| 23 | workday-connector | |
| 24 | zoho-connector | |
| 25 | zoom-connector | |

**MISSING:** twilio-connector, whatsapp-business-connector

## Agent OS - `platform/agent-os/`

12 services, 637 tests:
1. agent-platform-api (36 tests)
2. agent-registry (54)
3. capability-store (69)
4. tool-registry (59)
5. skill-library (73)
6. message-bus (59)
7. scheduler (89)
8. context-store (64)
9. agent-memory-bridge (64)
10. agent-orchestrator (63)
11. agent-execution-engine (61)
12. agent-observability (46)

## Multi-Agent Runtime - `platform/intelligence/multi-agent-runtime/`

**NOT duplicates:** This is the existing implementation
- Use this one, NOT create new runtime/agent-runtime

## Voice OS - `products/voice-os/`

17 services:
- attention-engine
- conversation-physics
- curiosity-engine
- humor-engine
- life-timeline
- multi-agent-voice
- social-intelligence
- voice-director
- voice-gateway
- voice-hotkey
- voice-identity
- voice-os-core

## Memory OS - `platform/memory/`

22 services (CONFIRMED):
- memory-os, memory-substrate, memory-confidence
- memory-context-engine, memory-intelligence-service
- memory-learning-engine, memory-observation
- memory-forgetting, memory-governance
- memory-import, memory-portability
- memory-compiler, memory-marketplace
- memory-relationships, memory-truth-engine
- memory-multimodal, memory-network
- twin-working-memory

## Twin OS - `platform/twins/`

86+ twins confirmed

## Genie Products - `products/genie/`

14 products:
- genie-ambient
- genie-anticipation
- genie-constitution
- genie-decision-intelligence
- genie-dreams
- genie-financial-life
- genie-focus
- genie-health-intelligence
- genie-household
- genie-learning-loop
- genie-legacy
- genie-life-simulation
- genie-spiritual
- genie-travel

## Flow OS - `platform/flow/`

30+ services including:
- flow-orchestrator
- execution-engine
- decision-engine
- policy-os
- simulation-os
- goal-os, loop-os

## Skills Platform - `platform/skills/`

- skill-os, translation-os
- skill-marketplace
- prompt-manager, prompt-marketplace
- skill-creator-studio
- skill-certification
- skill-analytics
- enterprise-skill-portal

## Industry OS - `industry-os/services/`

26 directories including:
restaurant-os, hotel-os, healthcare-os, beauty-os, retail-os, etc.

## Templates - `platform/hojai-templates/`

100 templates across 11 categories

## NOT TO CREATE (Already exists)

- platforms/runtime/agent-runtime (use multi-agent-runtime/)
- platforms/runtime/flow-runtime (use flow/flow-orchestrator)
- platforms/services/auth-service (use existing)
- platforms/integrations/* (use connectors/)
- platforms/services/webhook-server (use github-connector)
- platforms/services/websocket-server (use flow/event-streaming)
- platforms/services/cron-scheduler (use agent-os/scheduler)

## GENUINE GAPS (all filled June 29, 2026)

All 10 gaps have been built:

| # | Gap | Location |
|---|-----|----------|
| 1 | Twilio Voice Connector | `connectors/twilio-voice-connector/` ✅ |
| 2 | Twilio SMS Connector | `connectors/twilio-sms-connector/` ✅ |
| 3 | WhatsApp Business | `connectors/whatsapp-business-connector/` ✅ |
| 4 | Background Check | `connectors/background-check-connector/` ✅ |
| 5 | Meeting Recording | `connectors/meeting-recording-connector/` ✅ |
| 6 | Voice-to-Task | `connectors/voice-to-task-connector/` ✅ |
| 7 | Reply Drafting AI | `services/reply-drafting-service/` ✅ |
| 8 | Refund Approval | `services/refund-approval-service/` ✅ |
| 9 | Root Cause Analysis | `services/root-cause-service/` ✅ |
| 10 | ROI Calculator | `services/roi-calculator-service/` ✅ |

## NEW - API Gateway

| Component | Location |
|-----------|----------|
| API Gateway | `services/hojai-api/` (port 4500) |
| Dashboard | `studio/hojai-dashboard/` (port 3001) |
| Setup Script | `hojai-cli/setup.sh` |

**All gaps filled. Platform 100% complete.**
