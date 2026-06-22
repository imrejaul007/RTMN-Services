# LawGens API Documentation

**Version:** 2.0.0 | **Date:** June 7, 2026

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:5099` |
| Production | `https://api.lawgens.app` |

---

## Authentication

All API requests require an `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### POST /api/auth/register
Register a new user.

```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "plan": "starter"
}

Response:
{
  "success": true,
  "user": { "id": "user123", "email": "user@example.com", "name": "John Doe" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/auth/login
Login with credentials.

```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "user": { "id": "user123", "email": "user@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Contract Service

#### POST /api/contracts/analyze
Analyze a contract for risks and clauses.

```json
Request:
{
  "contractText": "This agreement is entered into...",
  "contractType": "NDA",
  "language": "en"
}

Response:
{
  "success": true,
  "analysis": {
    "risks": ["Confidentiality clause missing", "No termination clause"],
    "score": 75,
    "recommendations": ["Add NDA termination clause"]
  }
}
```

#### POST /api/contracts/generate
Generate a contract from template.

```json
Request:
{
  "templateType": "NDA",
  "parties": [
    { "name": "Company A", "role": "Disclosing" },
    { "name": "Company B", "role": "Receiving" }
  ],
  "terms": {
    "duration": "2 years",
    "jurisdiction": "India"
  }
}

Response:
{
  "success": true,
  "contractId": "contract_123",
  "documentUrl": "https://docs.lawgens.app/contracts/123"
}
```

---

## Court Service

#### POST /api/cases/search
Search court cases.

```json
Request:
{
  "query": "copyright infringement software",
  "court": "Delhi High Court",
  "year": 2024,
  "limit": 10
}

Response:
{
  "success": true,
  "cases": [
    {
      "id": "DHC-2024-1234",
      "title": "Tech Corp vs Software Ltd",
      "date": "2024-03-15",
      "citation": "(2024) DLT 456"
    }
  ]
}
```

#### GET /api/cases/:caseId
Get case details.

```json
Response:
{
  "success": true,
  "case": {
    "id": "DHC-2024-1234",
    "title": "Tech Corp vs Software Ltd",
    "parties": ["Tech Corp", "Software Ltd"],
    "date": "2024-03-15",
    "judge": "Hon. Justice Sharma",
    "summary": "...",
    "status": "Pending"
  }
}
```

---

## Compliance Service

#### GET /api/compliance/status
Get compliance status.

```json
Response:
{
  "success": true,
  "compliance": {
    "gdpr": { "status": "compliant", "lastChecked": "2024-06-07" },
    "pci-dss": { "status": "compliant", "lastChecked": "2024-06-07" },
    "rbi": { "status": "compliant", "lastChecked": "2024-06-07" }
  }
}
```

#### POST /api/compliance/check
Trigger compliance check.

```json
Request:
{
  "framework": "GDPR",
  "entityType": "data-controller"
}

Response:
{
  "success": true,
  "checkId": "check_123",
  "status": "processing"
}
```

---

## Document Service

#### POST /api/documents/generate
Generate a legal document.

```json
Request:
{
  "type": "legal-notice",
  "template": "default",
  "data": {
    "from": "Company A",
    "to": "Company B",
    "subject": "Payment Default",
    "content": "..."
  }
}

Response:
{
  "success": true,
  "documentId": "doc_123",
  "downloadUrl": "https://docs.lawgens.app/documents/123"
}
```

---

## Corporate Service

#### POST /api/corporate/company/incorporate
Register a new company.

```json
Request:
{
  "companyName": "Tech Solutions Pvt Ltd",
  "type": "private-limited",
  "directors": [
    { "name": "John Doe", "din": "DIN123456" }
  ],
  "address": {
    "state": "Delhi",
    "city": "New Delhi"
  }
}

Response:
{
  "success": true,
  "applicationId": "app_123",
  "estimatedTime": "7-10 business days"
}
```

---

## Integration Endpoints (Port 5098)

### Health

#### GET /health
Basic health check.

```json
Response:
{
  "status": "healthy",
  "service": "lawgens-integration",
  "version": "2.0.0",
  "timestamp": "2024-06-07T12:00:00Z"
}
```

#### GET /health/detailed
Full service health with dependencies.

```json
Response:
{
  "status": "healthy",
  "services": {
    "rabtul-auth": { "status": "healthy" },
    "hojai-memory": { "status": "healthy" },
    "rez-mind": { "status": "healthy" }
  },
  "timestamp": "2024-06-07T12:00:00Z"
}
```

### RABTUL Integration

#### POST /api/rabtul/auth/sync
Sync user with RABTUL.

```json
Request:
{
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "professional"
}

Response:
{
  "success": true,
  "rabtulUserId": "rb_user_123"
}
```

#### POST /api/rabtul/wallet/create
Create wallet for user.

```json
Request:
{
  "userId": "user123",
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "wallet": {
    "walletId": "wallet_123",
    "balance": 0,
    "currency": "INR"
  }
}
```

#### POST /api/rabtul/payment/process
Process payment.

```json
Request:
{
  "userId": "user123",
  "plan": "professional",
  "amount": 4999
}

Response:
{
  "success": true,
  "payment": {
    "paymentId": "pay_123",
    "status": "pending",
    "amount": 4999
  }
}
```

### HOJAI Integration

#### POST /api/hojai/memory/store
Store data in HOJAI memory.

```json
Request:
{
  "userId": "user123",
  "content": "User completed KYC verification",
  "type": "kyc-verification"
}

Response:
{
  "success": true,
  "memoryId": "mem_123"
}
```

#### GET /api/hojai/memory/:userId
Recall user memories.

```json
Response:
{
  "success": true,
  "memories": [
    { "id": "mem_123", "content": "...", "timestamp": "..." }
  ]
}
```

#### POST /api/hojai/ai/query
Query HOJAI AI.

```json
Request:
{
  "prompt": "What are the key clauses in this NDA?",
  "context": { "documentId": "doc_123" }
}

Response:
{
  "success": true,
  "response": {
    "answer": "The key clauses are...",
    "sources": ["doc_123"]
  }
}
```

### REZ Intelligence

#### POST /api/rez/intent/track
Track user intent.

```json
Request:
{
  "userId": "user123",
  "action": "contract_reviewed",
  "data": { "contractType": "NDA" }
}

Response:
{
  "success": true,
  "intentId": "intent_123"
}
```

### Onboarding

#### POST /api/onboard
Full user onboarding (RABTUL + HOJAI + REZ).

```json
Request:
{
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "professional"
}

Response:
{
  "success": true,
  "results": {
    "rabtulAuth": { "success": true },
    "wallet": { "success": true },
    "memory": { "success": true },
    "intent": { "success": true }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error code",
  "message": "Human-readable message",
  "details": {}
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing token |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

| Tier | Limit |
|------|-------|
| Starter | 100 requests/15 min |
| Professional | 1000 requests/15 min |
| Enterprise | Unlimited |

---

## Webhooks

### RABTUL Webhook
`POST /webhooks/rabtul`

```json
{
  "event": "payment.success",
  "data": {
    "paymentId": "pay_123",
    "userId": "user123",
    "amount": 4999
  },
  "timestamp": "2024-06-07T12:00:00Z"
}
```

### HOJAI Webhook
`POST /webhooks/hojai`

```json
{
  "event": "memory.stored",
  "data": {
    "memoryId": "mem_123",
    "userId": "user123"
  },
  "timestamp": "2024-06-07T12:00:00Z"
}
```

---

## SDK Examples

### Node.js

```javascript
import { LawGensClient } from '@lawgens/sdk';

const client = new LawGensClient({
  apiKey: 'your-api-key',
  environment: 'development'
});

// Analyze contract
const result = await client.contracts.analyze({
  contractText: '...',
  contractType: 'NDA'
});

// Process payment
const payment = await client.rabtul.payment.process({
  userId: 'user123',
  plan: 'professional',
  amount: 4999
});
```

### Python (Coming Soon)

```python
from lawgens import Client

client = Client(api_key='your-api-key')

# Analyze contract
result = client.contracts.analyze(
    contract_text='...',
    contract_type='NDA'
)
```

---

## Postman Collection

Download the Postman collection from:
`docs/lawgens-api.postman.json`