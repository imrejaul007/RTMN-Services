# RTMN SDKs

Unified SDKs for all RTMN products.

## Available SDKs

| Language | Status | Install |
|----------|--------|---------|
| **Node.js** | ✅ Ready | `npm install @rtmn/sdk` |
| **Python** | ✅ Ready | `pip install rtmn-sdk` |
| **Go** | 🚧 Coming Soon | - |

## Quick Start

### Node.js

```bash
npm install @rtmn/sdk
```

```javascript
const RTMN = require('@rtmn/sdk');

const client = new RTMN({
    apiKey: 'your-api-key',
    baseUrl: 'https://api.rtmn.com' // optional
});

// Create employee (auto-creates wallet, SafeQR, Nexha)
const employee = await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});
console.log(employee.data.integrations);
// [
//   { service: 'rabtul', walletId: 'wal_xxx' },
//   { service: 'safeqr', badgeId: 'badge_xxx' },
//   { service: 'nexha', entityId: 'ent_xxx' }
// ]

// Chat with AI
const response = await client.hojai.chat('What is Q3 revenue?');
console.log(response.data.reply);
```

### Python

```bash
pip install rtmn-sdk
```

```python
from rtmn import RTMNClient

client = RTMNClient(api_key="your-api-key")

# Create employee (auto-integrations)
employee = client.corpperks.create_employee(
    name="Priya Sharma",
    email="priya@acme.com",
    department="Engineering"
)
print(employee.data.integrations)

# Chat with AI
response = client.hojai.chat("What is Q3 revenue?")
print(response.data)
```

## All Products

### HOJAI AI
```javascript
// Chat
await client.hojai.chat('Analyze Q3 sales');

// Execute agent
await client.hojai.executeAgent('sales-agent', 'Generate report');

// Search
await client.hojai.search('revenue projections');
```

### RABTUL Payments
```javascript
// Create payment
await client.rabtul.createPayment(50000, 'ORD-12345');

// Create wallet
await client.rabtul.createWallet('user-123', 'John', 'john@acme.com');

// Top up
await client.rabtul.topUpWallet('wal-123', 10000);
```

### CorpPerks HRMS
```javascript
// Create employee (auto-integrations!)
await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});

// Run payroll
await client.corpperks.runPayroll(6, 2026);
```

### AdBazaar Marketing
```javascript
// Create campaign
await client.adbazaar.createCampaign({
    name: 'Summer Sale',
    type: 'social',
    budget: 100000
});

// Find influencers
await client.adbazaar.findInfluencers({
    category: 'fashion',
    followers: '100k-500k'
});
```

### SafeQR
```javascript
// Generate QR
await client.safeqr.generateQR('product', 'PROD-123');

// Verify (awards loyalty points!)
await client.safeqr.verifyQR('ACME-PROD-123');

// Safety alert
await client.safeqr.triggerAlert('sos', { lat: 19.07, lng: 72.87 });
```

### Nexha Identity
```javascript
// Create identity
await client.nexha.createEntity({
    type: 'person',
    name: 'Priya Sharma',
    email: 'priya@acme.com'
});

// Get trust score
await client.nexha.getTrustScore('entity-123');
```

## Response Format

All methods return:
```javascript
{
    success: true,
    data: { ... },
    meta: {
        product: 'hojai',
        latency_ms: 45
    }
}
```

## Error Handling

```javascript
try {
    const response = await client.hojai.chat('Hello');
    console.log(response.data);
} catch (error) {
    if (error.response) {
        console.error('API Error:', error.response.data);
    } else {
        console.error('Network Error:', error.message);
    }
}
```

## TypeScript Support

```typescript
import RTMN, { RTMNConfig } from '@rtmn/sdk';

const config: RTMNConfig = {
    apiKey: 'your-api-key',
    baseUrl: 'https://api.rtmn.com',
    timeout: 30000
};

const client = new RTMN(config);
```

## Documentation

- [Node.js SDK](node-sdk/README.md)
- [Python SDK](python-sdk/README.md)
- [API Documentation](http://localhost:3017)

## License

MIT