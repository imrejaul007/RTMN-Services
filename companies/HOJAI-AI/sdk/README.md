# HOJAI SDKs

> **Version:** 1.0.0
> **Registry:** npm (coming soon: @hojai)
> **Purpose:** Complete SDK suite for building AI-native applications

---

## Quick Start

```bash
# Install SDKs
npm install @hojai/foundation
npm install @hojai/sutar
npm install @hojai/nexha

# Use in your app
import { createAgent } from '@hojai/foundation';
import { createSession } from '@hojai/sutar';
```

---

## Available SDKs (36)

### Foundation Layer

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| Foundation | `@hojai/foundation` | Core APIs (CorpID, Memory, Twin, Flow, Trust) | [CLAUDE.md](hojai-foundation/CLAUDE.md) |
| Gateway | `@hojai/gateway` | Model-agnostic AI router | [CLAUDE.md](hojai-gateway/CLAUDE.md) |
| Memory | `@hojai/memory` | Multi-tier memory system | [CLAUDE.md](hojai-memory/CLAUDE.md) |
| Twin | `@hojai/twin` | Digital twin framework | [CLAUDE.md](hojai-twin/CLAUDE.md) |

### Agent Layer

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| AgentOS | `@hojai/agentos` | Agent lifecycle management | [CLAUDE.md](hojai-agentos/CLAUDE.md) |
| Genie | `@hojai/genie` | Personal AI assistant SDK | [CLAUDE.md](hojai-genie/CLAUDE.md) |
| Skills | `@hojai/skills` | Executable capabilities | [CLAUDE.md](hojai-skills/CLAUDE.md) |
| SkillOS | `@hojai/skillos` | Skill registry + execution | [CLAUDE.md](hojai-skillos/CLAUDE.md) |

### Commerce Layer

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| Commerce | `@hojai/commerce` | E-commerce APIs | [CLAUDE.md](hojai-commerce/CLAUDE.md) |
| Payment | `@hojai/payment` | Payment processing | [CLAUDE.md](hojai-payment/CLAUDE.md) |
| Nexha | `@hojai/nexha` | Autonomous business network | [CLAUDE.md](hojai-nexha/CLAUDE.md) |
| Logistics | `@hojai/logistics` | Delivery + fulfillment | [CLAUDE.md](hojai-logistics/CLAUDE.md) |

### Platform Layer

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| SUTAR | `@hojai/sutar` | Autonomous business OS | [CLAUDE.md](hojai-sutar/CLAUDE.md) |
| Copilots | `@hojai/copilots` | AI copilots for departments | [CLAUDE.md](hojai-copilots/CLAUDE.md) |
| Department | `@hojai/department` | Department OS integration | [CLAUDE.md](hojai-department/CLAUDE.md) |
| Industry | `@hojai/industry` | Industry OS templates | [CLAUDE.md](hojai-industry/CLAUDE.md) |
| Marketplace | `@hojai/marketplace` | AI marketplace | [CLAUDE.md](hojai-marketplace/CLAUDE.md) |
| Reputation | `@hojai/reputation` | Trust + reputation scoring | [CLAUDE.md](hojai-reputation/CLAUDE.md) |

### Communication

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| WhatsApp | `@hojai/whatsapp` | WhatsApp Business integration | [CLAUDE.md](hojai-whatsapp/CLAUDE.md) |
| Media | `@hojai/media` | Content + streaming | [CLAUDE.md](hojai-media/CLAUDE.md) |

### Infrastructure

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| CLI | `@hojai/cli` | Developer CLI | [CLAUDE.md](hojai-cli/CLAUDE.md) |
| Cloud | `@hojai/cloud` | Cloud deployment | [CLAUDE.md](hojai-cloud/CLAUDE.md) |
| ACS | `@hojai/acs` | AI Commerce Score | [CLAUDE.md](hojai-acs/CLAUDE.md) |

### UI Components

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| Widget Core | `@hojai/widget-core` | 5KB embeddable widget | [CLAUDE.md](hojai-widget-core/CLAUDE.md) |
| Widget React | `@hojai/widget-react` | React wrapper | [CLAUDE.md](hojai-widget-react/CLAUDE.md) |
| AI Inspector | `@hojai/ai-inspector` | Visual debugger | [CLAUDE.md](../products/ai-inspector/CLAUDE.md) |

### Discovery & Routing

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| Discovery OS | `@hojai/discovery-os` | Capability discovery | [CLAUDE.md](hojai-discovery-os/CLAUDE.md) |
| Discovery | `@hojai/discovery` | Discovery helpers | [CLAUDE.md](hojai-discovery/CLAUDE.md) |
| Federation OS | `@hojai/federation-os` | Multi-tenant federation | [CLAUDE.md](hojai-federation-os/CLAUDE.md) |
| Reputation OS | `@hojai/reputation-os` | Network reputation | [CLAUDE.md](hojai-reputation-os/CLAUDE.md) |
| Capability OS | `@hojai/capability-os` | Capability registry | [CLAUDE.md](hojai-capability-os/CLAUDE.md) |
| Global Directory | `@hojai/global-directory` | Global business search | [CLAUDE.md](hojai-global-directory/CLAUDE.md) |
| Market OS | `@hojai/market-os` | Opportunity engine | [CLAUDE.md](hojai-market-os/CLAUDE.md) |
| Opportunity OS | `@hojai/opportunity-os` | Deal routing | [CLAUDE.md](hojai-opportunity-os/CLAUDE.md) |

### Special Purpose

| SDK | Package | Purpose | Docs |
|-----|---------|---------|------|
| Razor | `@hojai/razor` | Communication OS | [CLAUDE.md](hojai-razor/CLAUDE.md) |
| Bizora | `@hojai/bizora` | Business advisor | [CLAUDE.md](hojai-bizora/CLAUDE.md) |
| AI Spec | `@hojai/ai-spec` | AI-native spec format | [CLAUDE.md](hojai-ai-spec/CLAUDE.md) |

---

## Publishing

```bash
# Prerequisites
npm login
npm adduser --access public  # For @hojai scope

# Build all SDKs
for sdk in hojai-*/; do
  cd "$sdk"
  npm install
  npm run build
  cd ..
done

# Publish all
./publish-all.sh patch
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Your Application                  │
├─────────────────────────────────────────────────────┤
│  UI SDKs     │  Widget Core │ Widget React │ Inspector │
├─────────────────────────────────────────────────────┤
│  Agent SDKs  │  AgentOS │ Genie │ Skills │ SkillOS   │
├─────────────────────────────────────────────────────┤
│  Commerce    │  Commerce │ Payment │ Logistics │ Nexha  │
├─────────────────────────────────────────────────────┤
│  Platform    │  SUTAR │ Copilots │ Department │ Industry│
├─────────────────────────────────────────────────────┤
│  Foundation  │  Gateway │ Memory │ Twin │ Foundation  │
├─────────────────────────────────────────────────────┤
│  RTMN Hub (:4399) │ SUTAR OS │ Nexha │ Genie        │
└─────────────────────────────────────────────────────┘
```

---

*Last Updated: June 25, 2026*
