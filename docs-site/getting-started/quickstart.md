# Quick Start

Get up and running with RTMN in 5 minutes.

## 1. Create an Account

Sign up at [app.rtmn.io](https://app.rtmn.io) (TBD).

## 2. Get Your API Key

1. Go to **Settings → API Keys**
2. Click **Create API Key**
3. Copy the key

## 3. Install the SDK

```bash
npm install @rtmn/sdk
```

## 4. Make Your First Request

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: 'rtmn_prod_your_key_here'
});

const brands = await rtmn.brands.list();
console.log('Your brands:', brands);
```

## Next Steps

- [Installation Guide](/getting-started/installation)
- [Core Concepts](/getting-started/concepts)
- [API Reference](/api/overview)
