# REZ Copilot Dashboard Implementation

## Overview

The Copilot Dashboard connects the REZ Merchant App to the REZ Intent Graph AI agents, providing real-time intelligence and actionable insights for merchants.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REZ Intent Graph                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Demand     │ │  Scarcity   │ │ Personalize │ │ Attribution │          │
│  │  Signal     │ │  Agent      │ │  Agent      │ │  Agent      │          │
│  │  Agent      │ │             │ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Churn     │ │   Margin    │ │  Inventory  │ │   Revenue   │          │
│  │  Signal     │ │   Alert     │ │  Forecast   │ │ Optimizer   │          │
│  │  Agent      │ │   Agent     │ │   Agent     │ │   Agent     │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Merchant Service (API Layer)                          │
│                     app/merchant/copilot/* routes                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Client
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Merchant App (Expo/React Native)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  CopilotContext │◄─│ useCopilot      │◄─│ CopilotDashboard │             │
│  │                 │  │ Insights Hooks  │  │      Screen     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## The 8 AI Agents

### 1. DemandSignal Agent
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/demand-signal-agent.ts`

**Purpose:** Real-time demand aggregation across all apps

**Data Provided:**
- `demandCount`: Current demand level
- `unmetDemandPct`: Percentage of unmet demand
- `topCities`: Geographic demand distribution
- `trend`: Demand direction (rising/stable/declining)
- `spikeDetected`: Alert flag for demand spikes

**Interval:** Every 5 minutes

### 2. Scarcity Agent
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/scarcity-agent.ts`

**Purpose:** Real-time supply/demand ratio engine

**Data Provided:**
- `scarcityScore`: 0-100 scarcity indicator
- `urgencyLevel`: none/low/medium/high/critical
- `supplyCount`: Current inventory level
- `demandCount`: Current demand level
- `recommendations`: Actionable suggestions

**Interval:** Every 1 minute

### 3. Personalization Agent
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/personalization-agent.ts`

**Purpose:** Learn from user response patterns

**Data Provided:**
- `preferredChannels`: Best performing channels (push/email/sms)
- `optimalSendTimes`: Best times to send nudges
- `openRates`: Per-channel open rates
- `convertRates`: Per-channel conversion rates
- `tonePreferences`: Best messaging tone

**Interval:** Event-driven + every 1 minute

### 4. Attribution Agent
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/attribution-agent.ts`

**Purpose:** Full-funnel attribution tracking

**Data Provided:**
- `organicGMV`: Revenue without nudge influence
- `nudgeGMV`: Revenue with nudge influence
- `incrementality`: Revenue attributable to nudges
- `lift`: Conversion lift percentage
- `roiByChannel`: Return on investment per channel

**Interval:** Every 1 minute

### 5. ChurnSignal Agent (Adaptive Scoring)
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/adaptive-scoring-agent.ts`

**Purpose:** ML-based confidence scoring and churn prediction

**Data Provided:**
- `predictedConversionProb`: 0-1 conversion likelihood
- `confidence`: Model confidence level
- `factors`: Breakdown by user history, time, category, price, velocity
- `churnRisk`: high/medium/low risk level

**Interval:** Every 1 hour

### 6. MarginAlert Agent (Feedback Loop)
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/feedback-loop-agent.ts`

**Purpose:** Closed-loop optimization and margin monitoring

**Data Provided:**
- `currentMargin`: Current profit margin
- `targetMargin`: Target margin
- `change`: Margin change percentage
- `severity`: critical/high/medium/low
- `affectedProducts`: Products impacted

**Interval:** Every 1 hour

### 7. InventoryForecast Agent (Network Effect)
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/network-effect-agent.ts`

**Purpose:** Collaborative filtering and inventory predictions

**Data Provided:**
- `daysUntilStockout`: Estimated days until inventory runs out
- `dailyBurnRate`: Average daily consumption
- `predictedDemand`: Forecasted demand
- `restockRecommendation`: Suggested restock quantity

**Interval:** Every 24 hours

### 8. RevenueOptimizer Agent
**File:** `/Users/rejaulkarim/Documents/rez-intent-graph/src/agents/revenue-attribution-agent.ts`

**Purpose:** P&L impact measurement and revenue optimization

**Data Provided:**
- `totalGMV`: Total gross merchandise value
- `nudgeInfluencedGMV`: Nudge-attributed revenue
- `nudgeLiftPct`: Percentage lift from nudges
- `conversionLift`: Conversion rate improvement
- `topPerformingNudges`: Best performing campaigns
- `optimizationRecommendations`: Suggested improvements

**Interval:** Every 15 minutes

## Files Created

### API Service
**Path:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-marchant/services/api/copilotInsights.ts`

Provides typed interfaces and methods for all 8 agents:
- `getDashboard()` - Full dashboard data
- `getAgentStatuses()` - Agent health status
- `getDemandSignals()` - DemandSignal data
- `getScarcitySignals()` - Scarcity data
- `getPersonalizationData()` - Personalization profiles
- `getAttributionData()` - Attribution metrics
- `getChurnSignals()` - Churn predictions
- `getMarginAlerts()` - Margin alerts
- `getInventoryForecasts()` - Inventory predictions
- `getRevenueOptimizer()` - Revenue optimization data

### Context
**Path:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-marchant/contexts/CopilotContext.tsx`

React Context providing:
- Connection state management
- Auto-refresh every 5 minutes
- Unified data access
- Insight acknowledgment

### Hooks
**Path:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-marchant/hooks/useCopilotInsights.ts`

React Query hooks including:
- Individual data hooks per agent
- Derived summary hooks
- Mutation hooks for actions
- Optimistic updates

### Dashboard UI
**Path:** `/Users/rejaulkarim/Documents/ReZ Full App/rez-app-marchant/app/copilot/index.tsx`

React Native screen with:
- Overview tab with key metrics
- Demand tab with trends
- Inventory tab with forecasts
- Revenue tab with optimization data
- Agents tab with health status

## Navigation

The Copilot Dashboard is accessible at `/copilot` route in the merchant app.

To add a navigation button, use:
```typescript
import { router } from 'expo-router';
router.push('/copilot');
```

## API Endpoints Required

The merchant-service needs these endpoints:

### GET /merchant/copilot/dashboard
Returns full dashboard data including all agent statuses and insights.

### GET /merchant/copilot/agents
Returns agent health status array.

### GET /merchant/copilot/demand/:merchantId
Returns demand signals for a merchant.

### GET /merchant/copilot/scarcity/:merchantId
Returns scarcity signals for a merchant.

### GET /merchant/copilot/personalization/:merchantId
Returns personalization profiles.

### GET /merchant/copilot/segments/:merchantId
Returns audience segments.

### GET /merchant/copilot/attribution/:merchantId
Returns attribution data.

### GET /merchant/copilot/churn/:merchantId
Returns churn signals.

### GET /merchant/copilot/margin/:merchantId
Returns margin alerts.

### GET /merchant/copilot/inventory/:merchantId
Returns inventory forecasts.

### GET /merchant/copilot/revenue/:merchantId
Returns revenue optimization data.

### GET /merchant/copilot/insights/:merchantId
Returns aggregated insights.

### POST /merchant/copilot/insights/:id/acknowledge
Acknowledges/dismisses an insight.

### POST /merchant/copilot/refresh
Triggers manual refresh of all agents.

## Environment Variables

No new environment variables are required. The app uses the existing `EXPO_PUBLIC_API_BASE_URL` configuration.

## Dependencies

No new dependencies required. Uses existing:
- `@tanstack/react-query` for data fetching
- `expo-router` for navigation
- `react-native-reanimated` for animations

## Future Enhancements

1. **Push Notifications:** Add real-time alerts when agents detect critical conditions
2. **Deep Links:** Allow sharing specific insights via deep links
3. **Export:** Export insights and reports as PDF/CSV
4. **Preferences:** Allow merchants to customize which agents they want to see
5. **Historical Data:** Add time-series charts for trending data over time
