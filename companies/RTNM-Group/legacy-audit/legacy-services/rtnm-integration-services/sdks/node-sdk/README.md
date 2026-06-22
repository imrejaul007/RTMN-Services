# @rtmn/sdk - Node.js SDK

Unified SDK for all RTMN products.

## Installation

```bash
npm install @rtmn/sdk
```

## Quick Start

```javascript
const RTMN = require('@rtmn/sdk');

// Initialize
const client = new RTMN({
    apiKey: 'your-api-key',
    baseUrl: 'https://api.rtmn.com' // optional, defaults to localhost:3000
});

// Chat with AI
const response = await client.hojai.chat('What is Q3 revenue?');
console.log(response.data);

// Create employee (auto-creates wallet, SafeQR, Nexha)
const employee = await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});
console.log(employee.data.integrations);
```

## Products

### HOJAI AI
```javascript
// Chat with AI
await client.hojai.chat('Analyze Q3 sales');

// Execute agent
await client.hojai.executeAgent('sales-agent', 'Generate Q3 report');

// Search knowledge base
await client.hojai.search('revenue projections');

// List agents
await client.hojai.listAgents('finance');
```

### RABTUL Payments
```javascript
// Create payment
await client.rabtul.createPayment(50000, 'ORD-12345');

// Create wallet
await client.rabtul.createWallet('user-123', 'John', 'john@acme.com');

// Top up
await client.rabtul.topUpWallet('wal-123', 10000);

// BNPL
await client.rabtul.createBNPLOrder(50000, 'cust-123', 3);
```

### CorpPerks HRMS
```javascript
// Create employee (auto-integrations!)
await client.corpperks.createEmployee({
    name: 'Priya Sharma',
    email: 'priya@acme.com',
    department: 'Engineering'
});
// Automatically creates:
// - RABTUL wallet
// - SafeQR safety badge
// - Nexha identity

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
    data: { ... },  // API response
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

## License

MIT