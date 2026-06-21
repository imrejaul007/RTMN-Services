# SUTAR OS Integration Guide

**Version:** 3.0.0  
**Last Updated:** June 17, 2026

---

## Overview

This guide explains how to integrate SUTAR OS with your services, applications, and AI agents.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration with RTMN Services](#integration-with-rtmn-services)
3. [Integration with HOJAI AI](#integration-with-hojai-ai)
4. [Integration with Industry OS](#integration-with-industry-os)
5. [Building AI Agents](#building-ai-agents)
6. [SUTAR Client SDK](#sutar-client-sdk)

---

## Quick Start

### 1. Install SUTAR Client

```bash
npm install @hojai/sutar-client
```

### 2. Initialize Client

```javascript
import { SutarClient } from '@hojai/sutar-client';

const sutar = new SutarClient({
  gateway: 'http://localhost:4140',
  apiKey: 'your_api_key',
  environment: 'production' // or 'staging', 'development'
});
```

### 3. Make Your First Call

```javascript
// List services in the marketplace
const services = await sutar.marketplace.listServices({
  category: 'ai-agents',
  limit: 10
});

console.log('Available services:', services);
```

---

## Integration with RTMN Services

### Sales OS Integration

The Sales OS uses SUTAR for:
- **Deal Negotiation** - AI-powered deal closing
- **Lead Scoring** - Trust-based lead qualification
- **Contract Management** - Smart contracts for sales agreements
- **Performance Tracking** - Goal-based sales tracking

**File:** `services/sales-hub/src/services/sutarBridge.ts`

```typescript
import { SutarClient } from '@hojai/sutar-client';
import { SUTAR_CONFIG } from '../config/sutar';

const sutar = new SutarClient(SUTAR_CONFIG);

export class SutarBridge {
  // Negotiate a deal
  async negotiateDeal(dealData: DealData) {
    const negotiation = await sutar.negotiation.start({
      parties: [dealData.buyerId, dealData.sellerId],
      subject: 'sales-deal',
      initialOffer: {
        price: dealData.amount,
        terms: dealData.terms
      }
    });
    return negotiation;
  }

  // Score a lead using trust engine
  async scoreLead(leadId: string) {
    const trust = await sutar.trust.getAgentScore(leadId);
    return trust.trustScore;
  }

  // Create sales contract
  async createSalesContract(contractData: ContractData) {
    const contract = await sutar.contract.create({
      type: 'sales-agreement',
      parties: [contractData.buyerId, contractData.sellerId],
      terms: contractData.terms
    });
    return contract;
  }
}
```

### Restaurant OS Integration

The Restaurant OS uses SUTAR for:
- **Ingredient Sourcing** - Marketplace for suppliers
- **Dynamic Pricing** - Decision engine for menu pricing
- **Reservation Negotiation** - Negotiation engine for special bookings

**File:** `industry-os/services/restaurant-os/src/industry-integration.js`

```javascript
const sutar = require('@hojai/sutar-client');

class RestaurantSutarIntegration {
  async findBestSupplier(requirements) {
    // Search marketplace for ingredient suppliers
    const suppliers = await sutar.marketplace.search({
      query: requirements.ingredient,
      filters: {
        category: 'food-suppliers',
        location: requirements.location,
        minTrustScore: 80
      }
    });
    return suppliers[0]; // Return best match
  }

  async optimizeMenuPrice(menuItem) {
    // Use decision engine for dynamic pricing
    const decision = await sutar.decision.evaluate({
      context: 'menu-pricing',
      data: {
        item: menuItem.name,
        cost: menuItem.cost,
        demand: menuItem.demand,
        competition: menuItem.competitorPrices
      },
      options: ['increase', 'decrease', 'maintain']
    });
    return decision;
  }
}
```

---

## Integration with HOJAI AI

### BLR AI Marketplace Integration

The BLR AI Marketplace (flagship HOJAI product) integrates with SUTAR Marketplace to list and sell AI services.

**Location:** `companies/hojai-ai/blr-ai-marketplace/`

```javascript
// In BLR AI Marketplace
import { sutarMarketplace } from '@hojai/sutar-client';

// List an AI service on SUTAR marketplace
const listing = await sutarMarketplace.createListing({
  name: 'My AI Service',
  category: 'ai-agents',
  price: 99.99,
  capabilities: ['nlp', 'vision'],
  provider: 'blr-ai-marketplace'
});
```

### Genie Personal AI Integration

Genie uses SUTAR for:
- **Personal Goal Tracking** - Goal OS
- **Decision Support** - Decision Engine
- **Service Discovery** - Discovery Engine

**Location:** `companies/hojai-ai/genie-voice/`

```javascript
// In Genie
const sutar = require('@hojai/sutar-client');

class GenieSutarIntegration {
  async setPersonalGoal(goalData) {
    return await sutar.goals.create(goalData);
  }

  async getDecisionSupport(context, options) {
    return await sutar.decision.evaluate({
      context,
      data: context,
      options
    });
  }
}
```

---

## Integration with Industry OS

### All 24 Industry OS Services

Each Industry OS can integrate with SUTAR through the **unified-os-hub**:

**File:** `services/unified-os-hub/src/integrations.js`

```javascript
// Unified hub provides SUTAR integration to all services
export const sutarIntegrations = {
  // Sales OS
  sales: {
    negotiation: 'sutar-negotiation-engine',
    contracts: 'sutar-contract-os',
    trust: 'sutar-trust-engine'
  },
  
  // Restaurant OS
  restaurant: {
    marketplace: 'sutar-marketplace',
    pricing: 'sutar-decision-engine',
    sourcing: 'sutar-marketplace'
  },
  
  // Hotel OS
  hotel: {
    booking: 'sutar-negotiation-engine',
    pricing: 'sutar-decision-engine',
    reviews: 'sutar-trust-engine'
  },
  
  // Healthcare OS
  healthcare: {
    appointments: 'sutar-scheduling',
    contracts: 'sutar-contract-os',
    trust: 'sutar-trust-engine'
  },
  
  // ... all 24 industries
};
```

### Industry-Specific Use Cases

| Industry | SUTAR Use Case |
|----------|----------------|
| **Sales** | Deal negotiation, lead scoring, contracts |
| **Restaurant** | Supplier sourcing, dynamic pricing |
| **Hotel** | Booking negotiation, pricing optimization |
| **Healthcare** | Appointment scheduling, patient contracts |
| **Real Estate** | Property negotiation, lease contracts |
| **Legal** | Contract drafting, compliance checking |
| **Finance** | Loan approval, risk assessment |
| **Education** | Course pricing, enrollment contracts |
| **Retail** | Inventory sourcing, dynamic pricing |
| **Travel** | Booking negotiation, price optimization |
| **Manufacturing** | Supplier contracts, quality contracts |
| **Construction** | Project contracts, vendor management |

---

## Building AI Agents

### Register an AI Agent

```javascript
import { SutarClient } from '@hojai/sutar-client';

const sutar = new SutarClient({ gateway: 'http://localhost:4140' });

// Step 1: Register agent identity
const agent = await sutar.identity.register({
  name: 'My AI Agent',
  type: 'service-provider',
  capabilities: ['nlp', 'vision', 'translation'],
  owner: 'agent_owner_123'
});

console.log('Agent ID:', agent.id);
```

### List Services on Marketplace

```javascript
// Step 2: List services on the marketplace
const listing = await sutar.marketplace.createListing({
  agentId: agent.id,
  name: 'Translation Service',
  description: 'AI-powered translation in 50+ languages',
  category: 'ai-services',
  price: 49.99,
  currency: 'USD',
  pricingModel: 'subscription',
  capabilities: ['translation', 'nlp']
});

console.log('Listing ID:', listing.id);
```

### Negotiate with Other Agents

```javascript
// Step 3: Negotiate with other agents
const negotiation = await sutar.negotiation.start({
  parties: [agent.id, 'other_agent_id'],
  subject: 'service-exchange',
  initialOffer: {
    service: 'translation',
    quantity: 1000,
    price: 30.00
  }
});

// Listen for negotiation events
sutar.negotiation.on(`negotiation.${negotiation.id}`, (event) => {
  if (event.type === 'offer') {
    console.log('New offer:', event.offer);
  }
});
```

### Build Trust Score

```javascript
// Step 4: Build trust through successful transactions
for (let i = 0; i < 10; i++) {
  await sutar.contract.execute({
    type: 'service-delivery',
    parties: [agent.id, 'client_id'],
    terms: { service: 'translation', quantity: 100 }
  });
}

// Get trust score
const trust = await sutar.trust.getAgentScore(agent.id);
console.log('Trust score:', trust.trustScore); // Should be high
```

---

## SUTAR Client SDK

### Installation

```bash
npm install @hojai/sutar-client
# or
yarn add @hojai/sutar-client
```

### Configuration

```javascript
import { SutarClient } from '@hojai/sutar-client';

const sutar = new SutarClient({
  gateway: 'https://sutar.hojai.ai',
  apiKey: process.env.SUTAR_API_KEY,
  environment: 'production',
  timeout: 30000,
  retries: 3
});
```

### Available Modules

```javascript
// Marketplace — MOVED to BLR AI Marketplace on 2026-06-21 (see companies/HOJAI-AI/blr-ai-marketplace/services/)
sutar.marketplace.listServices({ category, limit })
sutar.marketplace.search({ query, filters })
sutar.marketplace.createListing({ name, price, category })
sutar.marketplace.purchase({ serviceId, paymentMethodId })
sutar.marketplace.getService(serviceId)

// Decision Engine
sutar.decision.evaluate({ context, data, options })
sutar.decision.checkPolicy({ policy, action, context })
sutar.decision.getHistory({ limit, offset })

// Negotiation Engine
sutar.negotiation.start({ parties, subject, initialOffer })
sutar.negotiation.getStatus(negotiationId)
sutar.negotiation.submitOffer(negotiationId, offer)
sutar.negotiation.acceptOffer(negotiationId)
sutar.negotiation.rejectOffer(negotiationId, reason)

// Trust Engine
sutar.trust.getAgentScore(agentId)
sutar.trust.submitFeedback({ agentId, rating, comment })
sutar.trust.getReputation(agentId)

// Discovery Engine
sutar.discovery.listOpportunities({ category, minValue })
sutar.discovery.match({ agentId, capabilities, budget })
sutar.discovery.getRecommendations(agentId)

// Goal OS
sutar.goals.create({ name, target, deadline })
sutar.goals.get(goalId)
sutar.goals.decompose(goalId)
sutar.goals.getProgress(goalId)

// Contract OS
sutar.contract.create({ type, parties, terms })
sutar.contract.get(contractId)
sutar.contract.execute(contractId)
sutar.contract.terminate(contractId, reason)

// Economy OS
sutar.economy.getBalance(agentId)
sutar.economy.transfer({ from, to, amount, currency })
sutar.economy.getTransactions({ agentId, limit })

// Simulation OS
sutar.simulation.run({ scenario, variables, iterations })
sutar.simulation.getResults(simulationId)

// Usage Tracker
sutar.usage.record({ agentId, serviceId, quantity, unit })
sutar.usage.getStats({ agentId, period })

// Flow OS
sutar.flow.create({ name, steps })
sutar.flow.execute(flowId)
sutar.flow.getStatus(flowId)
```

### Event Listeners

```javascript
// Listen to marketplace events
sutar.on('marketplace.listing.created', (listing) => {
  console.log('New listing:', listing);
});

sutar.on('marketplace.purchase.completed', (purchase) => {
  console.log('Purchase completed:', purchase);
});

// Listen to negotiation events
sutar.on('negotiation.started', (negotiation) => {
  console.log('Negotiation started:', negotiation);
});

sutar.on('negotiation.completed', (result) => {
  console.log('Negotiation completed:', result);
});

// Listen to contract events
sutar.on('contract.executed', (contract) => {
  console.log('Contract executed:', contract);
});

// Listen to trust events
sutar.on('trust.score.changed', (data) => {
  console.log('Trust score changed:', data);
});
```

---

## Best Practices

### 1. Authentication

Always use environment variables for API keys:
```javascript
const apiKey = process.env.SUTAR_API_KEY;
```

### 2. Error Handling

```javascript
try {
  const result = await sutar.marketplace.listServices();
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Implement exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Retry
  } else if (error.code === 'UNAUTHORIZED') {
    // Refresh API key
  } else {
    // Log and handle other errors
    console.error('SUTAR error:', error);
  }
}
```

### 3. Caching

Cache marketplace listings to reduce API calls:
```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedServices() {
  const cached = cache.get('services');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const services = await sutar.marketplace.listServices();
  cache.set('services', { data: services, timestamp: Date.now() });
  return services;
}
```

### 4. Batch Operations

Use batch endpoints when available:
```javascript
// Instead of multiple individual calls
const listings = await sutar.marketplace.batchGetListings(['id1', 'id2', 'id3']);
```

---

## Troubleshooting

### Common Issues

**1. Connection Refused**
- Check if SUTAR Gateway is running on port 4140
- Verify network connectivity

**2. Authentication Failed**
- Verify API key is correct
- Check if API key has expired

**3. Rate Limit Exceeded**
- Implement exponential backoff
- Consider upgrading your plan

**4. Service Unavailable**
- Check SUTAR status page
- Verify the specific service is running

---

## Support

- **Documentation:** https://docs.hojai.ai/sutar
- **Status Page:** https://status.hojai.ai
- **GitHub:** https://github.com/imrejaul007/hojai-ai
- **Email:** support@hojai.ai

---

*Last Updated: June 17, 2026*  
*SUTAR OS Integration Guide*
