# Global Nexha — Phase-Wise Execution Plan
## 90-Day Plan to Fill All Gaps

> **Created:** June 30, 2026  
> **Duration:** 90 Days (Phases 0-3)  
> **Goal:** Make Nexha partner-ready, developer-adoptable, and monetizable

---

## Gap Summary (10 Critical Gaps)

| # | Gap | Priority | Phase |
|---|-----|----------|-------|
| 1 | Public RFCs (RFC-0001 to RFC-0008) | P0 | 1 |
| 2 | SDK Backend Implementation (7 endpoints) | P0 | 1 |
| 3 | OpenAPI/Swagger Specifications | P0 | 1 |
| 4 | Nexha Cloud Product + Pricing | P0 | 2 |
| 5 | developer.nexha.ai Portal | P0 | 2 |
| 6 | Usage-Based Pricing Model | P0 | 2 |
| 7 | Nexha Connect (Platform for Platforms) | P1 | 3 |
| 8 | Economic Relationship Graph | P1 | 3 |
| 9 | Trust API (Commercial) | P1 | 2 |
| 10 | GitHub Repos (global-nexha) | P2 | 4 |

---

## PHASE 0 — Quick Wins (Days 1-7)

### Goal: Validate current architecture, fix SDK stubs

---

### 0.1 Audit SDK Endpoints → What Backend Exists

**Action:** Map SDK module calls to actual backend services

```typescript
// CURRENT SDK calls (nexha-sdk/src/modules/)
discovery.ts  → POST /v1/discover/suppliers       → ❌ No endpoint
trust.ts      → GET  /v1/trust/:id               → ❌ No endpoint  
negotiation.ts→ POST /v1/negotiate/start         → ❌ No endpoint
contract.ts   → POST /v1/contract/create         → ❌ No endpoint
payment.ts    → POST /v1/payment/initiate        → ❌ No endpoint
logistics.ts  → POST /v1/logistics/track         → ❌ No endpoint
```

**Check existing services:**
```bash
# What exists in Nexha services
ls companies/Nexha/services/

# Check if any service handles these endpoints
# Expected mapping:
# /v1/discover/*     → nexha-discovery-os (4272) ✅ EXISTS
# /v1/trust/*        → nexha-reputation-os (4271) ✅ EXISTS
# /v1/negotiate/*    → nexha-contract-network (4289) ✅ EXISTS
# /v1/contract/*     → nexha-contract-network (4289) ✅ EXISTS
# /v1/payment/*      → nexha-payment-network (4296) ✅ EXISTS
# /v1/logistics/*    → nexha-autonomous-logistics (4293) ✅ EXISTS
```

**Deliverable:** `docs/nexha-sdk-endpoint-mapping.md`
```
SDK Module          → Existing Service    → Port
discovery.ts        → nexha-discovery-os → 4272 ✅
trust.ts            → nexha-reputation-os → 4271 ✅
negotiation.ts     → nexha-contract-net  → 4289 ✅
contract.ts         → nexha-contract-net  → 4289 ✅
payment.ts          → nexha-payment-net   → 4296 ✅
logistics.ts        → nexha-autonomous-logistics → 4293 ✅
```

---

### 0.2 Create SDK Gateway (The Bridge)

**Problem:** SDK calls `/v1/discover/suppliers` but existing services use different paths.

**Solution:** Create `nexha-agent-gateway` as the unified entry point

**File:** `companies/Nexha/services/nexha-agent-gateway/src/routes/sdk-bridge.ts`

```typescript
// NEW: SDK Bridge routes
import { Router } from 'express';
const router = Router();

// Discovery → nexha-discovery-os:4272
router.post('/v1/discover/suppliers', async (req, res) => {
  const result = await fetch('http://localhost:4272/api/discover/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  res.json(await result.json());
});

// Trust → nexha-reputation-os:4271
router.get('/v1/trust/:entityId', async (req, res) => {
  const result = await fetch(`http://localhost:4271/api/trust/${req.params.entityId}`);
  res.json(await result.json());
});

// Negotiation → nexha-contract-network:4289
router.post('/v1/negotiate/start', async (req, res) => {
  const result = await fetch('http://localhost:4289/api/negotiation/start', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  res.json(await result.json());
});

// Contract → nexha-contract-network:4289
router.post('/v1/contract/create', async (req, res) => {
  const result = await fetch('http://localhost:4289/api/contracts', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  res.json(await result.json());
});

// Payment → nexha-payment-network:4296
router.post('/v1/payment/initiate', async (req, res) => {
  const result = await fetch('http://localhost:4296/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  res.json(await result.json());
});

// Logistics → nexha-autonomous-logistics:4293
router.post('/v1/logistics/track', async (req, res) => {
  const result = await fetch('http://localhost:4293/api/shipment/track', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  res.json(await result.json());
});

export { router as sdkBridgeRoutes };
```

**Wire in main index:**
```typescript
// companies/Nexha/services/nexha-agent-gateway/src/index.js
import { sdkBridgeRoutes } from './routes/sdk-bridge.js';
app.use("/v1", authMiddleware, sdkBridgeRoutes);
```

---

### 0.3 Write Tests for SDK Bridge

**File:** `companies/Nexha/services/nexha-agent-gateway/__tests__/sdk-bridge.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/index.js';
import request from 'supertest';

describe('SDK Bridge', () => {
  let server: any;
  
  beforeAll(() => {
    server = app.listen(4443);
  });
  
  afterAll(() => server.close());

  it('POST /v1/discover/suppliers returns suppliers', async () => {
    const res = await request(server)
      .post('/v1/discover/suppliers')
      .set('Authorization', 'NexhaKey test-key')
      .send({ product: 'rice', location: 'India' });
    
    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();
  });

  it('GET /v1/trust/:entityId returns trust score', async () => {
    const res = await request(server)
      .get('/v1/trust/supplier_001')
      .set('Authorization', 'NexhaKey test-key');
    
    expect(res.status).toBe(200);
    expect(res.body.aci_score).toBeDefined();
  });

  it('POST /v1/negotiate/start creates negotiation', async () => {
    const res = await request(server)
      .post('/v1/negotiate/start')
      .set('Authorization', 'NexhaKey test-key')
      .send({
        supplier_id: 'supplier_001',
        product: 'rice',
        quantity: 1000,
        target_price: 50000
      });
    
    expect(res.status).toBe(200);
    expect(res.body.negotiation_id).toBeDefined();
  });
});
```

**Run:** `npm test` in nexha-agent-gateway

---

## PHASE 1 — Open Core Foundation (Weeks 1-4)

### Goal: Publish RFCs, OpenAPI specs, complete SDK

---

### 1.1 Create Public RFC Documents

**Directory:** `companies/Nexha/acp-spec/`

| RFC | Title | File | Content |
|-----|-------|------|---------|
| RFC-0001 | Core Principles | `RFC-0001-CORE.md` | Protocol overview, architecture, versioning |
| RFC-0002 | Identity | `RFC-0002-IDENTITY.md` | `did:nexha` format, verification |
| RFC-0003 | Trust | `RFC-0003-TRUST.md` | ACI scoring, verification models |
| RFC-0004 | Discovery | `RFC-0004-DISCOVERY.md` | Supplier search, matching |
| RFC-0005 | Negotiation | `RFC-0005-NEGOTIATION.md` | BATNA, strategies, states |
| RFC-0006 | Contracts | `RFC-0006-CONTRACTS.md` | Smart contracts, SLA |
| RFC-0007 | Payments | `RFC-0007-PAYMENTS.md` | Escrow, settlement, fees |
| RFC-0008 | Logistics | `RFC-0008-LOGISTICS.md` | Fulfillment, tracking |

**RFC Template:**
```markdown
---
RFC: 0001
Title: Core Principles
Author: Global Nexha Foundation
Status: Draft
Created: 2026-06-30
Updated: 2026-06-30
---

# RFC-0001: Core Principles

## Summary
Brief summary of this RFC.

## Motivation
Why this is needed.

## Specification
Detailed technical specification.

## Implementation
How to implement.

## License
MIT License
```

---

### 1.2 Create OpenAPI Specifications

**File:** `companies/Nexha/services/nexha-agent-gateway/openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Nexha Agent Gateway API
  description: |
    The official API for the Nexha Agent Commerce Protocol.
    
    ## Authentication
    All endpoints require `Authorization: NexhaKey <your-api-key>`
    
    ## Base URL
    - Production: https://api.nexha.ai/v1
    - Sandbox: https://sandbox.nexha.ai/v1
  
  version: 1.0.0
  contact:
    name: Nexha Developer Support
    url: https://developer.nexha.ai
  license:
    name: MIT

servers:
  - url: https://api.nexha.ai/v1
    description: Production
  - url: https://sandbox.nexha.ai/v1
    description: Sandbox

paths:
  /discover/suppliers:
    post:
      operationId: discoverSuppliers
      summary: Discover suppliers
      description: |
        Search for suppliers based on product, location, trust score, etc.
        
        ```javascript
        const { results } = await nexha.discovery.suppliers({
          product: 'rice',
          location: 'India',
          min_trust: 80
        });
        ```
      tags: [Discovery]
      security:
        - NexhaKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SupplierSearch'
      responses:
        '200':
          description: List of matching suppliers
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SupplierSearchResult'

  /trust/{entityId}:
    get:
      operationId: getTrustScore
      summary: Get entity trust score
      description: |
        Retrieve the ACI (Autonomous Commerce Index) trust score for an entity.
        
        ```javascript
        const trust = await nexha.trust.get('supplier_001');
        console.log(trust.aci_score); // 95
        ```
      tags: [Trust]
      security:
        - NexhaKey: []
      parameters:
        - name: entityId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Trust score
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrustScore'

components:
  securitySchemes:
    NexhaKey:
      type: apiKey
      in: header
      name: Authorization
      description: |
        Your Nexha API key. Get one at https://dashboard.nexha.ai/keys

  schemas:
    SupplierSearch:
      type: object
      properties:
        product:
          type: string
          description: Product name or category
          example: "rice"
        location:
          type: string
          description: Geographic location
          example: "India"
        country:
          type: string
          example: "IN"
        min_trust:
          type: number
          minimum: 0
          maximum: 100
          description: Minimum trust score (ACI)
        category:
          type: string
        limit:
          type: integer
          default: 20
          maximum: 100

    SupplierSearchResult:
      type: object
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Supplier'
        total:
          type: integer

    Supplier:
      type: object
      properties:
        supplier_id:
          type: string
        name:
          type: string
        location:
          type: string
        country:
          type: string
        trust_score:
          type: number
        rating:
          type: number
        min_order:
          type: number
        price_range:
          $ref: '#/components/schemas/PriceRange'
        delivery_days:
          type: integer
        certifications:
          type: array
          items:
            type: string

    TrustScore:
      type: object
      properties:
        entity_id:
          type: string
        overall:
          type: number
        breakdown:
          $ref: '#/components/schemas/TrustBreakdown'
        verified:
          type: object
          properties:
            government_id:
              type: boolean
            business_license:
              type: boolean
            bank_account:
              type: boolean
            insurance:
              type: boolean
        stats:
          type: object
          properties:
            total_transactions:
              type: integer
            successful:
              type: integer
            failed:
              type: integer
            disputes:
              type: integer
```

---

### 1.3 Implement Remaining SDK Modules

**File:** `companies/Nexha/services/nexha-sdk/src/modules/payment.ts`

```typescript
import { NexhaClient } from '../client.js';
import type { Payment, PaymentInitiateParams } from '../types.js';

export class PaymentModule {
  constructor(private client: NexhaClient) {}

  async initiate(params: PaymentInitiateParams): Promise<Payment> {
    return this.client.request('POST', '/v1/payment/initiate', params, 'payment');
  }

  async get(paymentId: string): Promise<Payment> {
    return this.client.request('GET', `/v1/payment/${paymentId}`, undefined, 'payment');
  }

  async release(paymentId: string): Promise<Payment> {
    return this.client.request('POST', `/v1/payment/${paymentId}/release`, undefined, 'payment');
  }

  async refund(paymentId: string, reason?: string): Promise<Payment> {
    return this.client.request('POST', `/v1/payment/${paymentId}/refund`, { reason }, 'payment');
  }
}

export interface PaymentInitiateParams {
  contract_id: string;
  amount: number;
  currency: string;
  escrow?: boolean;
  release_conditions?: {
    delivery_confirmed?: boolean;
    inspection_passed?: boolean;
    days_to_release?: number;
  };
}
```

**Add to types.ts:**
```typescript
export interface PaymentInitiateParams {
  contract_id: string;
  amount: number;
  currency: string;
  escrow?: boolean;
}
```

---

### 1.4 Create SDK Package.json

**File:** `companies/Nexha/services/nexha-sdk/package.json`

```json
{
  "name": "@nexha/sdk",
  "version": "1.0.0",
  "description": "Official Nexha SDK for Node.js - The Agent Commerce Protocol",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "nexha",
    "agent-commerce",
    "nacp",
    "ai-commerce",
    "procurement"
  ],
  "author": "Nexha Foundation",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/global-nexha/nexha-sdk"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

### 1.5 Create SDK Examples

**Directory:** `companies/Nexha/examples/`

**File:** `companies/Nexha/examples/basic-usage.ts`

```typescript
import { NexhaClient } from '@nexha/sdk';

async function main() {
  const nexha = new NexhaClient({
    apiKey: process.env.NEXHA_API_KEY!
  });

  // 1. Discover suppliers
  console.log('🔍 Discovering suppliers...');
  const suppliers = await nexha.discovery.suppliers({
    product: 'organic rice',
    location: 'India',
    min_trust: 80
  });
  console.log(`Found ${suppliers.total} suppliers`);

  // 2. Check trust score
  const supplier = suppliers.results[0];
  console.log(`\n📊 Trust score for ${supplier.name}:`);
  const trust = await nexha.trust.get(supplier.supplier_id);
  console.log(`  ACI Score: ${trust.overall}`);
  console.log(`  Verified: ${trust.verified.government_id ? '✅' : '❌'} Government ID`);

  // 3. Start negotiation
  console.log('\n🤝 Starting negotiation...');
  const negotiation = await nexha.negotiation.start({
    supplier_id: supplier.supplier_id,
    product: 'organic rice',
    quantity: 5000,
    target_price: 150000
  });
  console.log(`  Negotiation ID: ${negotiation.negotiation_id}`);
  console.log(`  Status: ${negotiation.status}`);

  // 4. Create contract
  console.log('\n📄 Creating contract...');
  const contract = await nexha.contract.create({
    negotiation_id: negotiation.negotiation_id,
    payment_terms: 'NET_30',
    delivery_date: '2026-08-15'
  });
  console.log(`  Contract: ${contract.contract_number}`);

  // 5. Initiate payment
  console.log('\n💰 Initiating payment (with escrow)...');
  const payment = await nexha.payment.initiate({
    contract_id: contract.contract_id,
    amount: 150000,
    currency: 'INR',
    escrow: true
  });
  console.log(`  Payment ID: ${payment.payment_id}`);
  console.log(`  Status: ${payment.status}`);

  // 6. Track shipment
  console.log('\n🚚 Tracking logistics...');
  const shipment = await nexha.logistics.track({
    contract_id: contract.contract_id
  });
  console.log(`  Status: ${shipment.status}`);
  console.log(`  Carrier: ${shipment.carrier}`);
}

main().catch(console.error);
```

**File:** `companies/Nexha/examples/webhook-handler.ts`

```typescript
import { NexhaClient, WebhookVerificationError } from '@nexha/sdk';
import crypto from 'crypto';

const nexha = new NexhaClient({ apiKey: process.env.NEXHA_API_KEY! });

// Verify webhook signature
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Handle webhooks
nexha.webhook.on('negotiation_update', async (event) => {
  console.log('Negotiation updated:', event.data);
  // Update your database, send notifications, etc.
});

nexha.webhook.on('payment_released', async (event) => {
  console.log('Payment released:', event.data);
  // Mark order as complete, update accounting, etc.
});

nexha.webhook.on('shipment_delivered', async (event) => {
  console.log('Shipment delivered:', event.data);
  // Mark order fulfilled, trigger review request, etc.
});

// Start webhook server
nexha.webhook.start(3000);
console.log('Webhook server running on port 3000');
```

---

### 1.6 Phase 1 Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| 8 RFC Documents | `companies/Nexha/acp-spec/RFC-*.md` | ✅ TODO |
| OpenAPI Spec | `companies/Nexha/services/nexha-agent-gateway/openapi.yaml` | ✅ TODO |
| SDK Bridge | `companies/Nexha/services/nexha-agent-gateway/src/routes/sdk-bridge.ts` | ✅ TODO |
| SDK Package.json | `companies/Nexha/services/nexha-sdk/package.json` | ✅ TODO |
| Code Examples | `companies/Nexha/examples/*.ts` | ✅ TODO |
| SDK Tests | `companies/Nexha/services/nexha-agent-gateway/__tests__/sdk-bridge.test.ts` | ✅ TODO |

---

## PHASE 2 — Developer Platform (Weeks 5-8)

### Goal: Launch developer portal, define pricing, add Trust API

---

### 2.1 Build Developer Portal

**Directory:** `companies/Nexha/developer-portal/`

**Structure:**
```
developer-portal/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── docs/
│   │   ├── page.tsx               # Documentation index
│   │   ├── quickstart/
│   │   │   └── page.tsx           # 5-minute quickstart
│   │   ├── api-reference/
│   │   │   └── page.tsx           # OpenAPI-powered docs
│   │   ├── sdks/
│   │   │   └── page.tsx           # SDK documentation
│   │   └── examples/
│   │       └── page.tsx           # Code examples
│   ├── playground/
│   │   └── page.tsx               # Interactive API playground
│   └── pricing/
│       └── page.tsx               # Pricing tiers
├── content/
│   ├── quickstart.md
│   ├── authentication.md
│   └── errors.md
└── public/
    └── logo.svg
```

**File:** `companies/Nexha/developer-portal/app/page.tsx`

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Nexha Agent Commerce Protocol
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          The open standard for AI-to-AI commerce.
          <br />
          Built for developers, powered by trust.
        </p>
        
        <div className="flex gap-4 justify-center mb-12">
          <Link href="/docs/quickstart" 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">
            Quick Start →
          </Link>
          <Link href="/playground"
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium">
            API Playground
          </Link>
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-xl p-6 text-left">
          <pre className="text-sm text-green-400 overflow-x-auto">
{`import { Nexha } from "@nexha/sdk"

const nexha = new Nexha({
  apiKey: process.env.NEXHA_API_KEY
})

// Find trusted suppliers
const suppliers = await nexha.discovery.suppliers({
  product: "organic rice",
  min_trust: 90
})

// Negotiate & pay automatically
const payment = await nexha.payment.initiate({
  contract_id: contract.contract_id,
  amount: 150000,
  escrow: true
})`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need to build AI commerce
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Open Standard"
            description="NACP is open source. No vendor lock-in."
            icon="🔓"
          />
          <FeatureCard
            title="Trust APIs"
            description="ACI scoring for every entity in the network."
            icon="📊"
          />
          <FeatureCard
            title="Auto-Negotiation"
            description="AI agents negotiate contracts automatically."
            icon="🤝"
          />
          <FeatureCard
            title="Escrow Payments"
            description="Secure payment release on delivery."
            icon="💰"
          />
          <FeatureCard
            title="Multi-Carrier"
            description="12 logistics providers, one API."
            icon="🚚"
          />
          <FeatureCard
            title="MCP Server"
            description="Connect Claude, GPT, Gemini in minutes."
            icon="🔌"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { 
  title: string; 
  description: string; 
  icon: string; 
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
```

---

### 2.2 Interactive API Playground

**File:** `companies/Nexha/developer-portal/app/playground/page.tsx`

```tsx
'use client';

import { useState } from 'react';

const ENDPOINTS = [
  { method: 'POST', path: '/v1/discover/suppliers', name: 'Discover Suppliers' },
  { method: 'GET', path: '/v1/trust/:entityId', name: 'Get Trust Score' },
  { method: 'POST', path: '/v1/negotiate/start', name: 'Start Negotiation' },
  { method: 'POST', path: '/v1/contract/create', name: 'Create Contract' },
  { method: 'POST', path: '/v1/payment/initiate', name: 'Initiate Payment' },
  { method: 'POST', path: '/v1/logistics/track', name: 'Track Shipment' },
];

export default function Playground() {
  const [endpoint, setEndpoint] = useState(ENDPOINTS[0]);
  const [apiKey, setApiKey] = useState('');
  const [requestBody, setRequestBody] = useState('{\n  "product": "rice"\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    setLoading(true);
    try {
      const res = await fetch(`https://sandbox.nexha.ai${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `NexhaKey ${apiKey}`
        },
        body: endpoint.method !== 'GET' ? requestBody : undefined
      });
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (error: any) {
      setResponse({ error: error.message });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">API Playground</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Request */}
        <div className="space-y-6">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Endpoint</label>
            <select 
              value={endpoint.path}
              onChange={(e) => setEndpoint(ENDPOINTS.find(ep => ep.path === e.target.value)!)}
              className="w-full bg-gray-800 text-white rounded-lg p-3"
            >
              {ENDPOINTS.map(ep => (
                <option key={ep.path} value={ep.path}>
                  {ep.method} {ep.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nx_test_..."
              className="w-full bg-gray-800 text-white rounded-lg p-3"
            />
          </div>

          {endpoint.method !== 'GET' && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Request Body</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full bg-gray-800 text-green-400 rounded-lg p-3 h-48 font-mono text-sm"
              />
            </div>
          )}

          <button
            onClick={sendRequest}
            disabled={loading || !apiKey}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        {/* Response */}
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Response</label>
          <pre className="bg-gray-800 text-green-400 rounded-lg p-4 h-96 overflow-auto font-mono text-sm">
            {response ? JSON.stringify(response, null, 2) : 'Response will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

---

### 2.3 Pricing Page

**File:** `companies/Nexha/developer-portal/app/pricing/page.tsx`

```tsx
const TIERS = [
  {
    name: 'Community',
    price: 'Free',
    period: 'forever',
    description: 'For individual developers and testing',
    features: [
      '10,000 API calls/month',
      'Basic discovery',
      'Community support',
      'Self-host option',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$99',
    period: '/month',
    description: 'For growing businesses and startups',
    features: [
      '100,000 API calls/month',
      'Full NACP access',
      'Trust API',
      'Email support',
      'Webhook support',
    ],
    cta: 'Start Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$999',
    period: '/month',
    description: 'For companies at scale',
    features: [
      '1,000,000 API calls/month',
      'Dedicated infrastructure',
      'SLA guarantee',
      'Priority support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-900 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-white text-center mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-400 text-center mb-16">
          Start free. Scale as you grow.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div 
              key={tier.name}
              className={`rounded-2xl p-8 ${
                tier.highlighted 
                  ? 'bg-blue-600 ring-4 ring-blue-400' 
                  : 'bg-gray-800'
              }`}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-300">{tier.period}</span>
              </div>
              <p className="text-gray-300 mb-6">{tier.description}</p>
              
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center text-white">
                    <span className="mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-lg font-medium ${
                tier.highlighted 
                  ? 'bg-white text-blue-600' 
                  : 'bg-gray-700 text-white'
              }`}>
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Usage-Based Pricing */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Usage-Based Pricing</h2>
          <p className="text-gray-400 mb-8">
            Need more? Pay only for what you use.
          </p>
          
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="pb-4">API Call Type</th>
                  <th className="pb-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="text-white">
                <tr className="border-b border-gray-700">
                  <td className="py-4">Discovery (per search)</td>
                  <td className="py-4 text-right">$0.01</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4">Trust Score (per lookup)</td>
                  <td className="py-4 text-right">$0.02</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4">Negotiation (per session)</td>
                  <td className="py-4 text-right">$0.50</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4">Contract (per contract)</td>
                  <td className="py-4 text-right">$1.00</td>
                </tr>
                <tr>
                  <td className="py-4">Payment (per transaction)</td>
                  <td className="py-4 text-right">0.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 2.4 Commercial Trust API

**File:** `companies/Nexha/services/nexha-agent-gateway/src/routes/trust-api.ts`

```typescript
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Free tier: 100 lookups/day
// Growth tier: 10,000 lookups/month
// Enterprise: Unlimited

const BASIC_LIMIT = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100, // Free tier
  message: { error: 'Daily trust lookup limit reached' }
});

const TRUST_TIER_LIMITS: Record<string, number> = {
  free: 100,
  growth: 10000,
  enterprise: Infinity
};

router.get('/v1/trust/:entityId', BASIC_LIMIT, async (req, res) => {
  const { entityId } = req.params;
  const apiKey = req.headers['authorization']?.replace('NexhaKey ', '');
  
  // Get trust from nexha-reputation-os:4271
  const result = await fetch(`http://localhost:4271/api/trust/${entityId}`);
  const trustData = await result.json();
  
  // Add commercial metadata
  res.json({
    ...trustData,
    _meta: {
      api_version: 'v1',
      credits_used: 1,
      remaining: getRemainingLookups(apiKey) - 1,
      tier: getTier(apiKey)
    }
  });
});

// Bulk trust lookup (for enterprise)
router.post('/v1/trust/bulk', async (req, res) => {
  const { entityIds } = req.body;
  
  // Parallel fetch all trust scores
  const results = await Promise.all(
    entityIds.map(async (id: string) => {
      const trust = await fetch(`http://localhost:4271/api/trust/${id}`);
      return { id, data: await trust.json() };
    })
  );
  
  res.json({
    results,
    _meta: {
      api_version: 'v1',
      credits_used: entityIds.length,
      tier: 'enterprise'
    }
  });
});

export { router as trustApiRoutes };
```

---

### 2.5 Phase 2 Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Developer Portal | `companies/Nexha/developer-portal/` | ✅ TODO |
| API Playground | `companies/Nexha/developer-portal/app/playground/` | ✅ TODO |
| Pricing Page | `companies/Nexha/developer-portal/app/pricing/` | ✅ TODO |
| Trust API | `companies/Nexha/services/nexha-agent-gateway/src/routes/trust-api.ts` | ✅ TODO |
| Usage Tracking | `companies/Nexha/services/nexha-agent-gateway/src/middleware/usage-tracking.ts` | ✅ TODO |
| API Key Management | `companies/Nexha/services/nexha-agent-gateway/src/routes/api-keys.ts` | ✅ TODO |

---

## PHASE 3 — Nexha Cloud & Ecosystem (Weeks 9-12)

### Goal: Launch managed cloud, build Nexha Connect, Economic Graph

---

### 3.1 Nexha Cloud Product Definition

**File:** `companies/Nexha/products/nexha-cloud/README.md`

```markdown
# Nexha Cloud

The managed platform for Agent Commerce Protocol.

## Products

### Nexha Identity Cloud
- Managed identity nodes
- did:nexha resolution
- KYC verification
- **$99/month** (Growth)

### Nexha Trust Cloud
- Managed trust nodes
- ACI scoring
- Real-time verification
- **$199/month** (Growth)

### Nexha Discovery Cloud
- Managed discovery engines
- NLP + Vector search
- Compliance filtering
- **$149/month** (Growth)

### Nexha Commerce Cloud (Full Stack)
All of the above +:
- Negotiation engine
- Contract management
- Payment processing
- Logistics integration
- **$499/month** (Growth)

## Enterprise

For 10+ companies, dedicated infrastructure, custom SLAs:
- **$4,999/month** (Enterprise)
- **$49,999/year** (Enterprise Annual)

## Self-Host (Free)

Download Nexha OS Runtime:
```bash
docker pull nexha/nexha-os:latest
```
Full NACP implementation, no managed features.
```

---

### 3.2 Nexha Connect (Platform for Platforms)

**Directory:** `companies/Nexha/services/nexha-connect/`

**File:** `companies/Nexha/services/nexha-connect/src/index.ts`

```typescript
import express from 'express';

const app = express();

/**
 * Nexha Connect — Platform for Platforms
 * 
 * Allows partners to integrate Nexha commerce into their platforms.
 * 
 * Partners:
 * - Shopify merchants → Nexha suppliers
 * - SAP enterprises → Nexha buyers
 * - ChatGPT → Nexha commerce
 */

interface ConnectPartner {
  platform: 'shopify' | 'sap' | 'openai' | 'custom';
  credentials: {
    apiKey?: string;
    webhookUrl: string;
  };
  config: {
    mode: 'buyer' | 'supplier' | 'both';
    categories: string[];
  };
}

// Register a partner platform
app.post('/v1/connect/register', async (req, res) => {
  const { platform, credentials, config } = req.body;
  
  // Create partner-specific API key
  const partnerKey = await createPartnerKey(platform, config);
  
  // Set up webhook for events
  await registerWebhook(credentials.webhookUrl, platform);
  
  res.json({
    partner_id: partnerKey.id,
    api_key: partnerKey.secret,
    status: 'active',
    endpoints: {
      discover: 'https://api.nexha.ai/v1/connect/discover',
      trust: 'https://api.nexha.ai/v1/connect/trust',
      negotiate: 'https://api.nexha.ai/v1/connect/negotiate',
    }
  });
});

// Unified discovery for partners
app.post('/v1/connect/discover', async (req, res) => {
  const { query, source_platform } = req.body;
  
  // Route to appropriate discovery based on source
  const results = await routeDiscovery(query, source_platform);
  
  res.json(results);
});

// Trust verification for partners
app.get('/v1/connect/trust/:entityId', async (req, res) => {
  const { entityId } = req.params;
  const { source_platform } = req.query;
  
  // Get trust with partner-specific metadata
  const trust = await getTrustForPartner(entityId, source_platform as string);
  
  res.json(trust);
});

// Partner webhooks
app.post('/v1/webhooks/nexha', async (req, res) => {
  const { event, data, partner_id } = req.body;
  
  // Forward events to partner's webhook
  const partner = await getPartner(partner_id);
  await forwardToWebhook(partner.credentials.webhookUrl, { event, data });
  
  res.json({ received: true });
});

export { app };
```

**Connect SDK:**

**File:** `companies/Nexha/services/nexha-connect/sdk/index.ts`

```typescript
import { NexhaClient } from '@nexha/sdk';

export class NexhaConnect {
  private client: NexhaClient;
  
  constructor(apiKey: string) {
    this.client = new NexhaClient({ apiKey });
  }
  
  // For Shopify apps
  async getShopifyProducts(shopDomain: string) {
    // Map Shopify products to Nexha catalog
  }
  
  // For SAP integrations
  async syncSAPVendors(sapConfig: any) {
    // Sync SAP vendor master to Nexha suppliers
  }
  
  // For OpenAI agents
  async forAgent(agentId: string) {
    // Create agent-specific Nexha identity
  }
}
```

---

### 3.3 Economic Relationship Graph

**Directory:** `companies/Nexha/services/nexha-economic-graph/`

**File:** `companies/Nexha/services/nexha-economic-graph/src/schema.ts`

```typescript
/**
 * Economic Relationship Graph
 * 
 * This is the TRILLION-DOLLAR ASSET.
 * Stores relationships between entities, not just individual scores.
 * 
 * Schema:
 * (Company A) --[bought from]--> (Supplier X)
 * (Company A) --[paid on time]--> (Supplier X)
 * (Company A) --[recommended by]--> (Partner Y)
 * (Supplier X) --[ships to]--> (Region Z)
 * (Bank Z) --[finances]--> (Company A)
 */

interface Relationship {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: RelationshipType;
  metadata: {
    amount?: number;
    currency?: string;
    frequency?: 'once' | 'recurring' | 'daily' | 'weekly' | 'monthly';
    last_interaction?: Date;
    rating?: number;
  };
  trust_signal: {
    payment_timing?: 'early' | 'on_time' | 'late' | 'defaulted';
    quality_rating?: number;
    responsiveness?: number;
    reliability?: number;
  };
  created_at: Date;
  updated_at: Date;
}

type RelationshipType = 
  | 'bought_from'           // Company buys from supplier
  | 'sold_to'               // Supplier sells to buyer
  | 'paid_early'            // Payment was early
  | 'paid_on_time'          // Payment was on time
  | 'paid_late'             // Payment was late
  | 'recommended'           // Entity recommended another
  | 'financed_by'           // Entity financed by another
  | 'ships_to'              // Supplier ships to region
  | 'competes_with'         // Entity competes with another
  | 'partnered_with'        // Entity partnered with another
  | 'inspected_by'          // Quality inspected by third party
  | 'insured_by'            // Insured by provider
  | 'logistics_by'          // Logistics handled by carrier
  | 'certified_by'          // Certified by standards body
  | 'disputed'              // Dispute filed
  | 'resolved'              // Dispute resolved
  | 'REFERRED';             // Entity referred another
```

**File:** `companies/Nexha/services/nexha-economic-graph/src/api.ts`

```typescript
import { Router } from 'express';
import { graphDb } from './db.js';

const router = Router();

// Add a relationship
router.post('/v1/graph/relationship', async (req, res) => {
  const { from_entity_id, to_entity_id, relationship_type, metadata } = req.body;
  
  const relationship = await graphDb.create({
    from_entity_id,
    to_entity_id,
    relationship_type,
    metadata,
    trust_signal: await calculateTrustSignals(req.body),
    created_at: new Date(),
    updated_at: new Date()
  });
  
  // Update entity trust scores based on new relationship
  await updateTrustScores(from_entity_id);
  await updateTrustScores(to_entity_id);
  
  res.json({ relationship });
});

// Get all relationships for an entity
router.get('/v1/graph/entity/:entityId/relationships', async (req, res) => {
  const { entityId } = req.params;
  const { type, direction } = req.query;
  
  const relationships = await graphDb.query({
    where: {
      OR: [
        { from_entity_id: entityId },
        { to_entity_id: entityId }
      ],
      ...(type && { relationship_type: type }),
      ...(direction === 'inbound' && { to_entity_id: entityId }),
      ...(direction === 'outbound' && { from_entity_id: entityId })
    }
  });
  
  res.json({ relationships });
});

// Find path between two entities
router.get('/v1/graph/path/:fromId/:toId', async (req, res) => {
  const { fromId, toId } = req.params;
  const { max_hops } = req.query;
  
  const path = await graphDb.findPath(fromId, toId, {
    maxHops: parseInt(max_hops as string) || 5
  });
  
  res.json({ path });
});

// Get recommendations based on relationships
router.get('/v1/graph/recommendations/:entityId', async (req, res) => {
  const { entityId } = req.params;
  
  // Find 2nd-degree connections
  const trustedSuppliers = await graphDb.query({
    where: {
      from_entity_id: entityId,
      relationship_type: { in: ['bought_from', 'paid_on_time'] },
      'trust_signal.payment_timing': { in: ['early', 'on_time'] }
    }
  });
  
  // Find suppliers trusted by entities I trust
  const recommendations = await graphDb.query({
    where: {
      to_entity_id: { in: trustedSuppliers.map(r => r.from_entity_id) },
      relationship_type: 'bought_from',
      'trust_signal.quality_rating': { gte: 4 }
    },
    limit: 10
  });
  
  res.json({ recommendations });
});

export { router as graphRoutes };
```

---

### 3.4 Transaction Fee Model

**File:** `companies/Nexha/services/nexha-payment-network/src/fee-calculator.ts`

```typescript
interface FeeConfig {
  base_rate: number;      // Percentage
  flat_fee: number;       // Flat amount
  escrow_rate: number;     // Extra for escrow
  tier_multipliers: {
    community: number;    // 1.0x
    growth: number;       // 0.8x
    enterprise: number;   // 0.5x
  };
}

const DEFAULT_FEES: FeeConfig = {
  base_rate: 0.005,       // 0.5%
  flat_fee: 0.30,         // $0.30
  escrow_rate: 0.001,      // 0.1% extra for escrow
  tier_multipliers: {
    community: 1.0,
    growth: 0.8,
    enterprise: 0.5
  }
};

export function calculateFee(params: {
  amount: number;
  currency: string;
  hasEscrow: boolean;
  tier: 'community' | 'growth' | 'enterprise';
  volume_monthly: number;
}): { gross: number; fee: number; net: number; breakdown: any } {
  const { amount, hasEscrow, tier } = params;
  const multiplier = DEFAULT_FEES.tier_multipliers[tier];
  
  let rate = DEFAULT_FEES.base_rate * multiplier;
  if (hasEscrow) rate += DEFAULT_FEES.escrow_rate;
  
  const fee = (amount * rate) + (DEFAULT_FEES.flat_fee * multiplier);
  const net = amount - fee;
  
  return {
    gross: amount,
    fee: Math.round(fee * 100) / 100,
    net: Math.round(net * 100) / 100,
    breakdown: {
      percentage_rate: rate,
      base_fee: DEFAULT_FEES.flat_fee * multiplier,
      escrow_waiver: hasEscrow ? 0 : DEFAULT_FEES.escrow_rate * amount,
      tier_discount: tier === 'community' ? 0 : (DEFAULT_FEES.base_rate * amount * (1 - multiplier))
    }
  };
}

// Revenue stream tracking
export function recordRevenue(params: {
  payment_id: string;
  amount: number;
  fee: number;
  tier: string;
  timestamp: Date;
}) {
  // Add to revenue ledger for analytics
  return {
    ...params,
    revenue_category: 'transaction_fee',
    currency: 'USD',
    status: 'collected'
  };
}
```

---

### 3.5 Phase 3 Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Nexha Cloud Product | `companies/Nexha/products/nexha-cloud/` | ✅ TODO |
| Nexha Connect | `companies/Nexha/services/nexha-connect/` | ✅ TODO |
| Economic Graph | `companies/Nexha/services/nexha-economic-graph/` | ✅ TODO |
| Fee Calculator | `companies/Nexha/services/nexha-payment-network/src/fee-calculator.ts` | ✅ TODO |
| Revenue Tracking | `companies/Nexha/services/nexha-payment-network/src/revenue.ts` | ✅ TODO |

---

## PHASE 4 — Open Source & Community (Months 4-6)

### Goal: Publish to GitHub, build community

---

### 4.1 Create GitHub Repositories

```bash
# Create global-nexha GitHub organization (later)

# Repositories to create:
# 1. nacp                    - Protocol specification
# 2. nexha-sdk               - JavaScript SDK
# 3. nexha-mcp               - MCP server
# 4. nexha-examples          - Example implementations
# 5. nexha-rfcs              - RFC documents
# 6. nexha-reference-impl    - Reference implementation
```

### 4.2 Public RFC Repository

**File:** `github/global-nexha/nacp/RFC-0001-CORE.md`

```markdown
# NACP — Nexha Agent Commerce Protocol

## Status
This is a **living standard**. Track progress at [global-nexha/nacp](https://github.com/global-nexha/nacp).

## Abstract
NACP is an open protocol for AI-to-AI commerce. It enables autonomous agents to discover partners, verify trust, negotiate terms, create contracts, process payments, and coordinate logistics—all without human intervention.

## Motivation
Humans spend millions of hours on procurement. NACP enables AI agents to do this automatically.

## Specification

### Discovery
...

### Trust
...

### Negotiation
...

## Implementations
- JavaScript: [global-nexha/nexha-sdk](https://github.com/global-nexha/nexha-sdk)
- MCP Server: [global-nexha/nexha-mcp](https://github.com/global-nexha/nexha-mcp)

## License
MIT
```

---

## MASTER TASK LIST

### Week 0 (This Week)
- [ ] Map SDK endpoints to existing services
- [ ] Create SDK bridge in nexha-agent-gateway
- [ ] Write tests for SDK bridge

### Week 1
- [ ] Create 8 RFC documents
- [ ] Write OpenAPI spec
- [ ] Complete SDK backend implementation

### Week 2
- [ ] Build developer portal landing page
- [ ] Create API playground
- [ ] Build pricing page

### Week 3
- [ ] Implement Trust API with usage tracking
- [ ] Create API key management
- [ ] Deploy developer portal

### Week 4
- [ ] Define Nexha Cloud products
- [ ] Create pricing tiers documentation
- [ ] Set up usage tracking middleware

### Week 5-8
- [ ] Build Nexha Connect (Platform for Platforms)
- [ ] Create Economic Relationship Graph schema
- [ ] Implement transaction fee model

### Week 9-12
- [ ] Seed relationship graph with sample data
- [ ] Create partner onboarding flow
- [ ] Build revenue dashboard

### Month 4-6
- [ ] Publish to GitHub (global-nexha org)
- [ ] Set up npm packages
- [ ] Create RFC process documentation
- [ ] Plan Nexha Summit

---

## SUCCESS METRICS

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| API Calls | 1,000 | 50,000 | 500,000 |
| Developers | 10 | 100 | 1,000 |
| Partners | 1 | 5 | 20 |
| Trust Lookups | 100 | 10,000 | 100,000 |
| Transactions | 0 | 100 | 10,000 |
| Revenue | $0 | $500 | $10,000 |

---

## BUDGET ESTIMATE

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 0-1 | 1 week | 1 developer |
| Phase 2 | 2 weeks | 1 developer + 1 designer |
| Phase 3 | 3 weeks | 1 developer |
| Phase 4 | 2 weeks | DevRel hire |

**Total: 8 weeks, 1-2 people**

---

*Plan created: June 30, 2026*
*Next step: Start Phase 0 execution*
