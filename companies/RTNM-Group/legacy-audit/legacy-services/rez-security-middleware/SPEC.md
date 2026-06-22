# REZ Security Middleware - SPEC.md

**Version:** 1.0.0
**Company:** RTNM-Group
**Category:** Security

---

## Overview

Shared security middleware package for all REZ services. Provides standardized authentication, rate limiting, CORS, and helmet configuration as composable Express middleware.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REZ Security Middleware                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Middleware:                                                               │
│  ├── Auth Middleware  → JWT validation, API key checking                  │
│  ├── Rate Limiter    → Request throttling                               │
│  ├── CORS Handler    → Cross-origin requests                           │
│  ├── Helmet Config   → Security headers                                 │
│  └── Input Validator → Request sanitization                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Exports

### Middleware Functions

```typescript
// Authentication
export const authMiddleware: (options: AuthOptions) => RequestHandler
export const optionalAuth: RequestHandler
export const requireApiKey: (allowedKeys: string[]) => RequestHandler

// Rate Limiting
export const rateLimiter: (options: RateLimitOptions) => RequestHandler
export const createSlidingWindowLimiter: (options: WindowOptions) => RequestHandler

// CORS
export const corsMiddleware: (origins: string[]) => RequestHandler

// Security Headers
export const helmetMiddleware: () => RequestHandler

// Input Validation
export const validateInput: (schema: ZodSchema) => RequestHandler
export const sanitizeRequest: RequestHandler
```

---

## Usage

```typescript
import {
  authMiddleware,
  rateLimiter,
  helmetMiddleware,
  validateInput
} from '@rez/security-middleware';

app.use(helmetMiddleware());
app.use(rateLimiter({ windowMs: 60000, max: 100 }));
app.use('/api', authMiddleware({ required: true }));
app.use('/api/users', validateInput(createUserSchema));
```

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "helmet": "^7.1.0"
}
```

---

## Peer Dependencies

```json
{
  "express": ">=4.0.0",
  "helmet": ">=7.0.0"
}
```

---

## Status

- [x] JWT authentication
- [x] API key validation
- [x] Rate limiting
- [x] CORS configuration
- [x] Security headers
- [x] Input validation

