# Salar OS - Integration Guide

**Version:** 3.0.0  
**Last Updated:** June 17, 2026  
**Component:** SUTAR OS (Layer 14)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Integration with RTMN Hub](#integration-with-rtmn-hub)
3. [Integration with SUTAR Services](#integration-with-sutar-services)
4. [Integration with HOJAI AI](#integration-with-hojai-ai)
5. [Integration with Industry OS](#integration-with-industry-os)
6. [ACP Protocol Setup](#acp-protocol-setup)
7. [Web App Integration](#web-app-integration)
8. [Mobile App Integration](#mobile-app-integration)
9. [Testing](#testing)

---

## Quick Start

### 1. Install Salar OS Client SDK

```bash
npm install @hojai/salar-client
# or
yarn add @hojai/salar-client
```

### 2. Initialize Client

```javascript
import { SalarMarketplace } from '@hojai/salar-client';

const marketplace = new SalarMarketplace({
  apiKey: process.env.SALAR_API_KEY,
  environment: 'production', // 'production' | 'staging' | 'local'
  baseUrl: 'https://sutar.hojai.ai/api/marketplace'
});
```

### 3. Search & Purchase

```javascript
// Search for AI agents
const results = await marketplace.search({
  query: 'restaurant AI agent',
  filters: { category: 'ai-agents', minRating: 4.0 }
});

// Purchase a service
const purchase = await marketplace.purchase({
  listingId: results[0].id,
  planId: 'plan_pro'
});

console.log('API Key:', purchase.apiKey);
console.log('Access URL:', purchase.accessUrl);
```

### 4. List Your Service

```javascript
// Register as a provider
const provider = await marketplace.registerProvider({
  name: 'My AI Company',
  email: 'me@myai.com',
  website: 'https://myai.com'
});

// Create a listing
const listing = await marketplace.createListing({
  providerId: provider.id,
  name: 'My AI Service',
  category: 'ai-agents',
  pricing: {
    plans: [
      { name: 'Basic', price: 9.99, interval: 'monthly' }
    ]
  }
});

// Publish the listing
await marketplace.publishListing(listing.id);
```

---

## Integration with RTMN Hub

Salar OS is accessible through the RTMN Unified Hub at port 4399.

### Hub Configuration

The RTMN Hub proxies requests to Salar OS:

```javascript
// unified-os-hub/src/routes/salar.js
router.use('/api/salar', createProxyMiddleware({
  target: 'http://localhost:4250',
  changeOrigin: true,
  pathRewrite: { '^/api/salar': '/api/marketplace' }
}));
```

### Access via Hub

```bash
# Via RTMN Hub
curl https://rtmn.hojai.ai/api/salar/listings \
  -H "Authorization: Bearer <token>"

# Direct to Salar OS
curl https://sutar.hojai.ai/api/marketplace/listings \
  -H "Authorization: Bearer <token>"
```

### Service Registration

Salar OS is registered in the RTMN Hub's service registry:

```javascript
{
  "id": "salar-os",
  "name": "Salar OS",
  "port": 4250,
  "type": "marketplace",
  "layer": "sutar",
  "endpoints": {
    "listings": "/api/marketplace/listings",
    "search": "/api/marketplace/search",
    "purchase": "/api/marketplace/purchases"
  }
}
```

---

## Integration with SUTAR Services

Salar OS works seamlessly with all 25 SUTAR OS services.

### 1. Decision Engine Integration

Use Decision Engine to help buyers choose the right service.

```javascript
import { DecisionEngineClient } from '@hojai/sutar-decision';

const decision = new DecisionEngineClient({ apiKey: 'xxx' });

// Get AI-powered recommendation
const recommendation = await decision.recommend({
  userId: 'user_123',
  context: {
    industry: 'restaurant',
    budget: 100,
    requirements: ['nlp', 'recommendations']
  },
  marketplace: 'salar'
});
```

### 2. Negotiation Engine Integration

Allow AI agents to negotiate prices.

```javascript
import { NegotiationEngineClient } from '@hojai/sutar-negotiation';

const negotiation = new NegotiationEngineClient({ apiKey: 'xxx' });

// Start negotiation
const session = await negotiation.start({
  listingId: 'lst_abc123',
  buyerId: 'user_123',
  initialOffer: { price: 50 },
  constraints: { maxPrice: 100 }
});

// Process negotiation rounds
while (session.status === 'active') {
  const counterOffer = await negotiation.counterOffer({
    sessionId: session.id,
    price: session.currentOffer.price * 0.9
  });
  session.currentOffer = counterOffer;
}

// Finalize purchase when agreed
if (session.status === 'agreed') {
  const purchase = await marketplace.purchase({
    listingId: 'lst_abc123',
    planId: 'plan_pro',
    negotiatedPrice: session.currentOffer.price,
    negotiationSessionId: session.id
  });
}
```

### 3. Trust Engine Integration

Verify provider and buyer trust before transactions.

```javascript
import { TrustEngineClient } from '@hojai/sutar-trust';

const trust = new TrustEngineClient({ apiKey: 'xxx' });

// Check provider trust
const providerScore = await trust.getProviderScore('prv_xyz789');

if (providerScore.score < 70) {
  throw new Error('Provider trust score too low');
}

// Check buyer trust (for high-value transactions)
const buyerScore = await trust.getBuyerScore('user_123');

if (purchase.amount > 1000 && buyerScore.score < 60) {
  throw new Error('Buyer verification required');
}
```

### 4. Contract OS Integration

Create smart contracts for marketplace transactions.

```javascript
import { ContractOSClient } from '@hojai/sutar-contract';

const contracts = new ContractOSClient({ apiKey: 'xxx' });

// Create purchase contract
const contract = await contracts.create({
  type: 'service_purchase',
  parties: {
    buyer: 'user_123',
    provider: 'prv_xyz789'
  },
  terms: {
    listingId: 'lst_abc123',
    planId: 'plan_pro',
    duration: 'monthly',
    autoRenew: true,
    sla: {
      uptime: '99.9%',
      responseTime: '24 hours',
      refundPolicy: '30 days'
    }
  },
  payment: {
    amount: 99.99,
    currency: 'USD',
    escrow: true
  }
});
```

### 5. Economy OS Integration

Process payments via Economy OS.

```javascript
import { EconomyOSClient } from '@hojai/sutar-economy';

const economy = new EconomyOSClient({ apiKey: 'xxx' });

// Process marketplace payment
const payment = await economy.processPayment({
  purchaseId: 'pur_abc123',
  amount: 99.99,
  currency: 'USD',
  paymentMethod: 'credit_card',
  splitPayment: {
    platform: { percentage: 15 }, // 15% to platform
    provider: { percentage: 85 }  // 85% to provider
  }
});
```

### 6. Goal OS Integration

Track goals and outcomes for marketplace purchases.

```javascript
import { GoalOSClient } from '@hojai/sutar-goal';

const goals = new GoalOSClient({ apiKey: 'xxx' });

// Create goal for purchased service
const goal = await goals.create({
  userId: 'user_123',
  purchaseId: 'pur_abc123',
  listingId: 'lst_abc123',
  type: 'service_optimization',
  target: {
    metric: 'customer_satisfaction',
    value: 4.5,
    timeframe: '30 days'
  },
  tracking: {
    metric: 'csat_score',
    frequency: 'weekly'
  }
});
```

### 7. Discovery Engine Integration

Cross-search between marketplace and other SUTAR services.

```javascript
import { DiscoveryEngineClient } from '@hojai/sutar-discovery';

const discovery = new DiscoveryEngineClient({ apiKey: 'xxx' });

// Universal search across all SUTAR services
const results = await discovery.universalSearch({
  query: 'restaurant optimization',
  sources: ['marketplace', 'agents', 'twins', 'industry-os'],
  filters: { industry: 'restaurant' }
});
```

---

## Integration with HOJAI AI

Leverage HOJAI AI models for enhanced marketplace features.

### AI-Powered Recommendations

```javascript
import { HojaiAI } from '@hojai/ai-sdk';

const ai = new HojaiAI({ apiKey: process.env.HOJAI_API_KEY });

// Get personalized recommendations
const recommendations = await ai.recommend({
  userId: 'user_123',
  context: {
    recentPurchases: ['lst_xxx', 'lst_yyy'],
    searchHistory: ['restaurant AI', 'translation'],
    preferences: { categories: ['ai-agents'], budget: 100 }
  },
  candidates: marketplaceListings,
  topK: 10
});
```

### Smart Pricing

```javascript
// Get optimal pricing for your listing
const pricing = await ai.optimizePricing({
  listingId: 'lst_abc123',
  market: 'restaurant-ai',
  competitorData: true,
  demandForecast: true,
  elasticityModel: true
});

console.log('Recommended price:', pricing.recommended);
console.log('Expected demand:', pricing.expectedDemand);
console.log('Expected revenue:', pricing.expectedRevenue);
```

### Fraud Detection

```javascript
// Detect fraudulent reviews
const fraudCheck = await ai.detectFraud({
  review: {
    rating: 5,
    comment: 'Amazing service!',
    userId: 'user_xxx'
  },
  context: {
    userHistory: await marketplace.getUserHistory('user_xxx'),
    listingHistory: await marketplace.getListingReviews('lst_abc123')
  }
});

if (fraudCheck.isFraudulent) {
  console.log('Suspicious review:', fraudCheck.reasons);
}
```

### Sentiment Analysis

```javascript
// Analyze review sentiment
const sentiment = await ai.analyzeSentiment({
  text: 'This service transformed our operations!',
  language: 'auto' // Auto-detect
});

console.log('Sentiment:', sentiment.sentiment); // 'positive'
console.log('Score:', sentiment.score); // 0.95
```

---

## Integration with Industry OS

Industry OS can pull AI agents and services from Salar OS marketplace.

### Restaurant OS Integration

```javascript
import { RestaurantOSClient } from '@hojai/restaurant-os';
import { SalarMarketplace } from '@hojai/salar-client';

const restaurant = new RestaurantOSClient({ apiKey: 'xxx' });
const marketplace = new SalarMarketplace({ apiKey: 'xxx' });

// Discover restaurant-specific AI agents
const agents = await marketplace.search({
  filters: {
    category: 'ai-agents',
    tags: ['restaurant'],
    minTrustScore: 80
  }
});

// Install an agent in Restaurant OS
const installation = await restaurant.installAgent({
  agentId: agents[0].id,
  subscriptionId: agents[0].subscriptionId,
  config: {
    autoOptimize: true,
    notifyOnAction: true
  }
});
```

### Hotel OS Integration

```javascript
import { HotelOSClient } from '@hojai/hotel-os';

const hotel = new HotelOSClient({ apiKey: 'xxx' });

// Discover hotel-specific services
const services = await marketplace.search({
  filters: {
    category: ['ai-agents', 'services'],
    tags: ['hotel', 'hospitality']
  }
});

// Auto-purchase top-rated service
if (services[0].rating >= 4.5) {
  await marketplace.purchase({
    listingId: services[0].id,
    planId: 'plan_pro'
  });
}
```

---

## ACP Protocol Setup

Enable AI agents to autonomously purchase from Salar OS.

### 1. Register AI Agent

```javascript
// Register your AI agent
const agent = await marketplace.registerAgent({
  name: 'My Restaurant Genie',
  type: 'GENIE', // or 'MERCHANT'
  ownerId: 'user_123',
  capabilities: ['shopping', 'negotiation', 'budgeting'],
  walletId: 'wlt_xxx',
  trustScore: 85
});
```

### 2. Configure Agent Permissions

```javascript
await marketplace.setAgentPermissions({
  agentId: agent.id,
  permissions: {
    canSearch: true,
    canPurchase: true,
    maxAutoPurchaseAmount: 100,
    requireApprovalAbove: 500,
    allowedCategories: ['ai-agents', 'services']
  }
});
```

### 3. Enable Auto-Purchase

```javascript
// AI agent can now autonomously purchase
const autoPurchase = await marketplace.agentPurchase({
  agentId: agent.id,
  requirements: {
    category: 'ai-agents',
    capabilities: ['translation'],
    maxPrice: 50,
    minRating: 4.5
  },
  autoApprove: true
});
```

### 4. Monitor Agent Activity

```javascript
// Get agent purchase history
const history = await marketplace.getAgentPurchases(agent.id);

// Set up alerts
await marketplace.setAgentAlerts({
  agentId: agent.id,
  alerts: {
    onPurchase: true,
    onHighSpend: { threshold: 100, notify: 'email' },
    onFraudDetected: true
  }
});
```

---

## Web App Integration

### Embed via iframe

```html
<iframe 
  src="https://marketplace.salar.os/embed?category=ai-agents&theme=light"
  width="100%" 
  height="800px"
  frameborder="0"
  allow="payment">
</iframe>
```

### Use Salar Widget

```html
<!-- Include Salar Widget -->
<script src="https://cdn.salar.os/widget.js"></script>

<!-- Mount point -->
<div id="salar-marketplace"></div>

<!-- Initialize -->
<script>
  SalarWidget.init({
    containerId: 'salar-marketplace',
    apiKey: 'your_api_key',
    category: 'ai-agents',
    layout: 'grid', // 'grid' | 'list' | 'carousel'
    theme: 'auto', // 'light' | 'dark' | 'auto'
    onPurchase: (purchase) => {
      console.log('Purchase completed:', purchase);
      // Redirect to success page
      window.location.href = '/success';
    }
  });
</script>
```

### React Component

```jsx
import { SalarMarketplace } from '@hojai/salar-react';

function MarketplacePage() {
  return (
    <SalarMarketplace
      apiKey={process.env.REACT_APP_SALAR_API_KEY}
      category="ai-agents"
      onPurchase={(purchase) => {
        console.log('Purchased:', purchase);
        // Handle successful purchase
      }}
      theme="light"
      layout="grid"
    />
  );
}
```

### Custom Integration

```javascript
import { SalarMarketplace } from '@hojai/salar-client';

function customMarketplace() {
  const marketplace = new SalarMarketplace({ apiKey: 'xxx' });
  
  // Search
  const results = await marketplace.search({
    query: 'restaurant AI',
    limit: 12
  });
  
  // Render your custom UI
  return (
    <div className="marketplace-grid">
      {results.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

---

## Mobile App Integration

### React Native

```javascript
import { SalarMarketplace } from '@hojai/salar-react-native';

const marketplace = new SalarMarketplace({
  apiKey: 'your_api_key',
  platform: 'mobile'
});

// Browse marketplace
const listings = await marketplace.search({
  category: 'ai-agents'
});

// Purchase with Apple Pay / Google Pay
const purchase = await marketplace.purchase({
  listingId: listings[0].id,
  planId: 'plan_pro',
  paymentMethod: 'apple_pay' // or 'google_pay'
});
```

### iOS (Swift)

```swift
import SalarOS

let client = SalarClient(apiKey: "your_api_key")

// Search
client.search(query: "restaurant AI", category: "ai-agents") { result in
    switch result {
    case .success(let listings):
        print("Found \(listings.count) listings")
    case .failure(let error):
        print("Error: \(error)")
    }
}

// Purchase
let purchase = PurchaseRequest(
    listingId: "lst_abc123",
    planId: "plan_pro",
    paymentMethod: .applePay
)

client.purchase(request: purchase) { result in
    // Handle result
}
```

### Android (Kotlin)

```kotlin
import com.hojai.salar.SalarClient

val client = SalarClient(apiKey = "your_api_key")

// Search
client.search(query = "restaurant AI", category = "ai-agents") { result ->
    result.onSuccess { listings ->
        println("Found ${listings.size} listings")
    }
    result.onFailure { error ->
        println("Error: $error")
    }
}

// Purchase
val request = PurchaseRequest(
    listingId = "lst_abc123",
    planId = "plan_pro",
    paymentMethod = PaymentMethod.GOOGLE_PAY
)

client.purchase(request)
```

---

## Testing

### Test Environment

```javascript
const marketplace = new SalarMarketplace({
  apiKey: 'test_key',
  environment: 'staging',
  baseUrl: 'https://sutar-staging.hojai.ai/api/marketplace'
});
```

### Mock Mode

```javascript
// Enable mock mode for testing
const marketplace = new SalarMarketplace({
  apiKey: 'test_key',
  mock: true // Returns mock data without API calls
});

// All API calls return mock data
const results = await marketplace.search({ query: 'restaurant' });
// Returns: mock listings array
```

### Integration Tests

```javascript
import { describe, it, expect } from 'vitest';
import { SalarMarketplace } from '@hojai/salar-client';

describe('Salar Marketplace', () => {
  const marketplace = new SalarMarketplace({
    apiKey: process.env.SALAR_TEST_KEY,
    environment: 'staging'
  });

  it('should list AI agents', async () => {
    const results = await marketplace.search({
      filters: { category: 'ai-agents' }
    });
    
    expect(results.listings).toBeInstanceOf(Array);
    expect(results.listings.length).toBeGreaterThan(0);
  });

  it('should purchase a service', async () => {
    const purchase = await marketplace.purchase({
      listingId: 'test_lst_123',
      planId: 'plan_basic'
    });
    
    expect(purchase.status).toBe('active');
    expect(purchase.apiKey).toBeDefined();
  });

  it('should submit a review', async () => {
    const review = await marketplace.submitReview({
      listingId: 'test_lst_123',
      rating: 5,
      comment: 'Great service!'
    });
    
    expect(review.id).toBeDefined();
    expect(review.rating).toBe(5);
  });
});
```

---

## Troubleshooting

### Common Issues

**1. Authentication Failed**

```javascript
// Verify token
const isValid = await marketplace.verifyToken();
console.log('Token valid:', isValid);

// Refresh token
await marketplace.refreshToken();
```

**2. Rate Limit Exceeded**

```javascript
// Check rate limit
const limits = await marketplace.getRateLimit();
console.log('Remaining:', limits.remaining);
console.log('Reset at:', limits.reset);

// Wait for reset
await new Promise(resolve => setTimeout(resolve, limits.resetIn));
```

**3. Provider Not Verified**

```javascript
// Check verification status
const status = await marketplace.getProviderStatus();
console.log('Verified:', status.verified);

if (!status.verified) {
  console.log('Required:', status.requiredActions);
}
```

**4. Payment Failed**

```javascript
try {
  await marketplace.purchase({ ... });
} catch (error) {
  if (error.code === 'PAYMENT_FAILED') {
    console.log('Payment error:', error.details);
    // Try alternative payment method
  }
}
```

---

## Best Practices

1. **Cache Listings** - Cache marketplace data for 5 minutes to reduce API calls
2. **Use Webhooks** - Listen for events instead of polling
3. **Implement Retry Logic** - Use exponential backoff for failed requests
4. **Verify Webhooks** - Always verify webhook signatures
5. **Handle Errors Gracefully** - Show user-friendly error messages
6. **Monitor Usage** - Track API usage to avoid rate limits
7. **Test in Staging** - Always test in staging before production
8. **Use TypeScript** - Get type safety with TypeScript SDK
9. **Document Custom Fields** - Document any custom metadata you add
10. **Follow Guidelines** - Adhere to Salar OS marketplace policies

---

## Support

- **Documentation:** https://docs.salar.os
- **API Reference:** https://docs.salar.os/api
- **Status Page:** https://status.salar.os
- **Community:** https://community.salar.os
- **Email:** support@salar.os
- **GitHub:** https://github.com/hojai-ai/salar-os

---

*Last Updated: June 17, 2026*  
*Salar OS - Integration Guide*  
*Part of SUTAR OS - Autonomous Economic Infrastructure*