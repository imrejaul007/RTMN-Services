# Installation Guide

**Install the RTNM SDK and get started in minutes.**

---

## Prerequisites

- **Node.js:** 18+ (for TypeScript SDK)
- **Python:** 3.9+ (for Python SDK)
- **Package manager:** npm, yarn, or pnpm
- **RTMN account:** [Sign up free](https://app.rtmn.io/signup) (TBD)
- **API key:** [Get from dashboard](https://app.rtmn.io/settings/api-keys) (TBD)

---

## TypeScript / Node.js

### Install

```bash
npm install @rtmn/sdk
# or
yarn add @rtmn/sdk
# or
pnpm add @rtmn/sdk
```

### Verify Installation

```typescript
import { RTMNClient } from '@rtmn/sdk';

const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY
});

const status = await rtmn.health.check();
console.log('Connected:', status.connected);
```

### Requirements

```json
{
  "dependencies": {
    "@rtmn/sdk": "^1.0.0"
  }
}
```

- Node.js 18+
- ES2020+ support (for async/await, optional chaining)
- TypeScript 4.7+ (if using TypeScript)

---

## Python

### Install

```bash
pip install rtmn-sdk
# or
poetry add rtmn-sdk
# or
pipenv install rtmn-sdk
```

### Verify Installation

```python
from rtmn import RTMNClient

rtmn = RTMNClient(api_key=os.environ['RTMN_API_KEY'])
status = rtmn.health.check()
print(f"Connected: {status.connected}")
```

### Requirements

- Python 3.9+
- `requests` library
- `python-dotenv` (optional, for env var loading)

---

## Go (Coming Soon)

```bash
go get github.com/rtmn-group/rtmn-go
```

---

## Environment Setup

### Environment Variables

Create a `.env` file:

```bash
# .env
RTMN_API_KEY=rtmn_prod_your_key_here
RTMN_ENVIRONMENT=production  # or 'test'
```

### Load Environment Variables

**Node.js:**

```typescript
import dotenv from 'dotenv';
dotenv.config();
```

**Python:**

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## Docker

### Pull the SDK Image

```bash
docker pull ghcr.io/rtmn-group/rtmn-sdk:latest
```

### Run in Docker

```bash
docker run --rm \
  -e RTMN_API_KEY=your_key \
  ghcr.io/rtmn-group/rtmn-sdk:latest \
  node -e "const {RTMNClient} = require('@rtmn/sdk'); console.log('OK');"
```

---

## Quick Test

### TypeScript

```typescript
import { RTMNClient } from '@rtmn/sdk';

async function main() {
  const rtmn = new RTMNClient({
    apiKey: process.env.RTMN_API_KEY
  });

  // Test connection
  const health = await rtmn.health.check();
  console.log('RTMN Health:', health);

  // List brands
  const brands = await rtmn.brands.list({ limit: 5 });
  console.log('Your Brands:', brands.data.length);

  // Get account info
  const account = await rtmn.account.get();
  console.log('Account:', account.name);
}

main().catch(console.error);
```

### Python

```python
from rtmn import RTMNClient
import os

def main():
    rtmn = RTMNClient(api_key=os.environ['RTMN_API_KEY'])

    # Test connection
    health = rtmn.health.check()
    print(f"RTMN Health: {health}")

    # List brands
    brands = rtmn.brands.list(limit=5)
    print(f"Your Brands: {len(brands.data)}")

    # Get account info
    account = rtmn.account.get()
    print(f"Account: {account.name}")

if __name__ == '__main__':
    main()
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `MODULE_NOT_FOUND` | Run `npm install @rtmn/sdk` |
| `401 Unauthorized` | Check your API key is correct |
| `ECONNREFUSED` | Check your network/firewall |
| `TypeError: Cannot read` | Ensure `dotenv.config()` is called first |

### Debug Mode

```typescript
const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY,
  debug: true  // Enable debug logging
});
```

### Network Proxy

```typescript
const rtmn = new RTMNClient({
  apiKey: process.env.RTMN_API_KEY,
  proxy: 'http://proxy:8080'
});
```

---

## Next Steps

- [Quick Start](QUICKSTART.md) — Your first API call
- [Core Concepts](CORE-CONCEPTS.md) — Understand the platform
- [API Reference](../api-reference/OVERVIEW.md) — Full API documentation
- [Tutorials](../tutorials/BRAND-DASHBOARD.md) — Build something real
