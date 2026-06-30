# SUTAR OS + Human Intelligence Integration

> **Version:** 1.0.0
> **Last Updated:** June 30, 2026

---

## Overview

SUTAR OS (Autonomous Business OS) now integrates with Human Intelligence for emotionally-aware agent negotiations and trust-based commerce.

## Integration Architecture

```
SUTAR OS
    │
    ├── Trust Engine ──────► Trust Passport
    │
    ├── Negotiation Engine ──► Agent Trust Economy
    │
    ├── Contract OS ───────► Trust Scoring
    │
    └── Decision Engine ────► SimulationOS
```

---

## 1. Trust Passport Integration

### Before Any Transaction

```javascript
// In sutar-contract-os/negotiation.js

import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence();

async function beforeTransaction(fromEntity, toEntity, transactionType) {
  // Get trust passports
  const fromPassport = await hi.trustPassport.getPassport(`sutar:${fromEntity}`);
  const toPassport = await hi.trustPassport.getPassport(`sutar:${toEntity}`);

  // Check trust levels
  if (fromPassport.trustLevel === 'restricted') {
    return { allowed: false, reason: 'Trust level too low' };
  }

  if (toPassport.trustLevel === 'restricted') {
    return { allowed: false, reason: 'Counterparty trust level too low' };
  }

  // Apply trust multipliers
  const trustMultiplier = Math.min(fromPassport.multiplier, toPassport.multiplier);
  const adjustedValue = transaction.value * trustMultiplier;

  return { allowed: true, adjustedValue, trustMultiplier };
}
```

---

## 2. Agent Trust Economy Integration

### Agent Negotiation

```javascript
// In sutar-negotiation-engine/

async function negotiate(buyerAgent, sellerAgent, dealTerms) {
  // Get agent accounts
  const buyerAccount = await hi.agentEconomy.getAccount(buyerAgent);
  const sellerAccount = await hi.agentEconomy.getAccount(sellerAgent);

  // Check reputation
  if (buyerAccount.reputation < 30) {
    return { proceed: false, reason: 'Low reputation' };
  }

  // Calculate deal confidence based on trust
  const dealConfidence = calculateDealConfidence(
    buyerAccount.reputation,
    sellerAccount.reputation,
    buyerAccount.credits,
    sellerAccount.credits
  );

  // Transfer trust credits on completion
  if (dealTerms.accepted) {
    const commission = dealTerms.value * 0.01;
    await hi.agentEconomy.transfer({
      fromAgentId: buyerAgent,
      toAgentId: sellerAgent,
      amount: dealTerms.value,
      reason: 'Deal payment'
    });

    // Reward seller with bonus credits
    await hi.agentEconomy.transfer({
      fromAgentId: 'sutar_treasury',
      toAgentId: sellerAgent,
      amount: commission * 0.1,
      reason: 'Successful deal bonus'
    });
  }
}
```

---

## 3. Trust-Based Pricing

```javascript
// Dynamic pricing based on trust level

async function calculateDynamicPrice(basePrice, buyerId, sellerId) {
  const buyerPassport = await hi.trustPassport.getPassport(`sutar:${buyerId}`);
  const sellerPassport = await hi.trustPassport.getPassport(`sutar:${sellerId}`);

  // Trust-based discount
  const avgTrust = (buyerPassport.overallTrust + sellerPassport.overallTrust) / 2;

  let discount = 0;
  if (avgTrust >= 90) discount = 0.20;  // Platinum: 20% off
  else if (avgTrust >= 80) discount = 0.15; // Gold: 15% off
  else if (avgTrust >= 70) discount = 0.10; // Silver: 10% off
  else if (avgTrust >= 50) discount = 0.05; // Bronze: 5% off

  const dynamicPrice = basePrice * (1 - discount);

  return {
    basePrice,
    discount,
    dynamicPrice,
    avgTrust,
    trustLevel: avgTrust >= 90 ? 'platinum' : avgTrust >= 80 ? 'gold' : 'silver'
  };
}
```

---

## 4. Emotion-Aware Negotiation

```javascript
// Emotional context for agent negotiations

async function getNegotiationContext(agentId, counterpartId) {
  // Get emotional intelligence
  const context = await hi.agent.getEmotionalContext({
    agentId,
    counterpartId,
    negotiationType: 'price'
  });

  // Get trust history
  const trustHistory = await hi.trust.getRelationshipTrust({
    sourceId: agentId,
    targetId: counterpartId
  });

  // Get simulation for this deal
  const simulation = await hi.simulation.simulatePricing({
    currentPrice: deal.currentPrice,
    currentDemand: deal.expectedVolume,
    discount: deal.offeredDiscount
  });

  return {
    emotionalState: context.emotionalState,
    strategy: context.strategy,
    trustHistory,
    projectedOutcome: simulation.recommendation,
    recommendedTone: context.strategy.recommendedTone
  };
}
```

---

## 5. Reputation Badges

### Trust Passport Badges in SUTAR

| Badge | Trust Level | Benefits |
|-------|-------------|----------|
| 🏆 Platinum | 90-100 | 50% fee reduction, instant payouts |
| ⭐ Gold | 80-89 | 30% fee reduction, priority support |
| 🥈 Silver | 70-79 | 15% fee reduction |
| 🥉 Bronze | 50-69 | Standard rates |
| ⚙️ Iron | 30-49 | Higher fees, escrow required |
| ⚠️ Restricted | 0-29 | Manual review, hold on funds |

---

## 6. Staking for Better Deals

```javascript
// Stake trust credits for better rates

async function stakeForTrust(agentId, amount) {
  const stake = await hi.agentEconomy.stake({
    agentId,
    amount,
    duration: 30, // days
    purpose: 'improve_trust_score'
  });

  // Get updated account
  const account = await hi.agentEconomy.getAccount(agentId);

  return {
    stakedAmount: stake.amount,
    expectedReward: stake.reward,
    newReputation: account.reputation
  };
}
```

---

## 7. SUTAR Negotiation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 SUTAR NEGOTIATION FLOW                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │   Check Trust Passports   │
              │   (Trust Passport API)    │
              └────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │ Trust Level OK?  │
                  └────────┬────────┘
                   OK      │      Low
                    │      │        │
                    ▼      ▼        ▼
             ┌─────────┐ ┌─────────┐ ┌──────────┐
             │ Proceed │ │ Escrow  │ │ Manual   │
             │ Normal  │ │ Required│ │ Review   │
             └─────────┘ └─────────┘ └──────────┘
                    │      │        │
                    ▼      ▼        ▼
              ┌─────────────────────────┐
              │  Emotion-Aware         │
              │  Negotiation          │
              │  (Agent Economy)       │
              └─────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │   Deal Completion        │
              │   Trust Credits Awarded │
              └────────────────────────────┘
```

---

## Quick Test

```bash
# Test Trust Passport
curl -X POST http://localhost:4980/passport \
  -d '{"entityId":"merchant_1","entityType":"merchant","dimensions":{"reliability":95}}'

# Test Agent Economy
curl -X POST http://localhost:4985/account \
  -d '{"agentId":"sutar_procurement"}'

# Test Transfer
curl -X POST http://localhost:4985/transfer \
  -d '{"fromAgentId":"buyer","toAgentId":"seller","amount":100}'
```

---

## Files to Update

| File | Update |
|------|--------|
| `sutar-os/core/sutar-contract-os/src/index.js` | Add trust check before contract |
| `sutar-os/core/sutar-negotiation-engine/src/index.js` | Add emotional context |
| `sutar-os/core/sutar-trust-engine/src/index.js` | Integrate Trust Passport |
| `sutar-os/core/sutar-economy-os/src/index.js` | Add trust multipliers |
