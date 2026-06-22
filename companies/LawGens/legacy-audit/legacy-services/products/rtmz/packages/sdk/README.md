# RTMZ TypeScript SDK

TypeScript SDK for building AI agents and applications on RTMZ.

## Installation

```bash
npm install @rtmz/sdk
```

## Usage

```typescript
import { createClient, RTMZClient } from '@rtmz/sdk';

// Create client
const client = createClient({
  apiUrl: 'http://localhost:5000',
  authUrl: 'http://localhost:4002',
});

// Login
const { accessToken } = await client.login('user@example.com', 'password');
client.setToken(accessToken);

// GraphQL query
const users = await client.graphql(`query { users { id name email } }`);

// Train ML model
const { jobId } = await client.trainModel({ dataset: 'sales-data', target: 'revenue' });

// Process invoice
const result = await client.processInvoice(file);

// Create contract
const contract = await client.createContract({ title: 'NDA', parties: [...] });
```

## Services

- **Auth**: Login, JWT validation, user info
- **AutoML**: Train models, monitor progress
- **Invoice OCR**: Extract data from invoices
- **Contracts**: Create and manage contracts
- **Legal**: AI document analysis
- **Ranking**: ML-powered ranking

## API Reference

See [docs/openapi/](docs/openapi/) for full API documentation.