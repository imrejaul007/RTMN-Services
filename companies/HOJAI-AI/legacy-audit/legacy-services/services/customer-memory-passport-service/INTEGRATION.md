# Customer Memory Passport Service - Integration Guide

## Overview

This document describes how to integrate with Customer Memory Passport Service.

## Prerequisites

- Node.js 20+
- MongoDB instance
- Redis instance (optional)

## Quick Integration

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
export MONGODB_URI=mongodb://localhost:27017/customer-memory-passport-service
export JWT_SECRET=your-jwt-secret
export PORT=4595
```

### 3. Start Service

```bash
npm run dev
```

## API Integration

### Authentication

```javascript
// Include JWT token in headers
const headers = {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
};
```

### Making Requests

```javascript
// GET request
const data = await fetch('http://localhost:4595/api/v1/resource', {
  method: 'GET',
  headers
});

// POST request
const created = await fetch('http://localhost:4595/api/v1/resource', {
  method: 'POST',
  headers,
  body: JSON.stringify({ name: 'New Resource' })
});
```

## RABTUL Integration

### Auth Service (4002)

```javascript
// Verify user token
const response = await fetch('http://localhost:4002/api/auth/verify', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});
```

### Payment Service (4001)

```javascript
// Process payment
const payment = await fetch('http://localhost:4001/api/payments/initiate', {
  method: 'POST',
  headers,
  body: JSON.stringify({ amount: 1000, currency: 'INR' })
});
```

### Wallet Service (4004)

```javascript
// Get balance
const balance = await fetch('http://localhost:4004/api/wallet/balance', {
  headers
});
```

### Notification Service (4005)

```javascript
// Send notification
await fetch('http://localhost:4005/api/notifications/send', {
  method: 'POST',
  headers,
  body: JSON.stringify({ userId, channel: 'push', message: 'Hello!' })
});
```

## Error Handling

```javascript
try {
  const result = await apiCall();
} catch (error) {
  if (error.status === 401) {
    // Handle auth error
  } else if (error.status === 429) {
    // Handle rate limit
  }
}
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/* | 100 | 1 minute |
| /health | 1000 | 1 minute |

## Support

- Email: support@hojai.ai
- Slack: #hojai-support

---

**Last Updated:** 2026-06-12
