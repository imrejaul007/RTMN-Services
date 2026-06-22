# @rez/security - Production-Ready Security Package

> Comprehensive security utilities including JWT authentication, RBAC authorization, input validation, rate limiting, CORS configuration, and PII masking for RTNM services.

## Features

- **JWT Authentication** - Create, verify, and middleware for JWT tokens
- **RBAC Authorization** - Role and permission-based access control
- **Input Validation** - Zod schemas for request validation
- **Rate Limiting** - Redis-backed rate limiting
- **CORS Configuration** - Secure cross-origin request handling
- **Security Headers** - Helmet middleware with CSP, HSTS, etc.
- **Secure Token Generation** - Cryptographically secure random tokens
- **PII Masking** - Automatic redaction of sensitive data
- **Timing-Safe Comparison** - Prevention of timing attacks

## Installation

```bash
npm install @rez/security
```

## Quick Start

```typescript
import express from 'express';
import { 
  authMiddleware, secureHeaders, secureCors,
  validate, createToken, z
} from '@rez/security';

const app = express();

// Security middleware
app.use(secureHeaders());
app.use(secureCors({ origin: ['https://app.rez.com'] }));

// JWT authentication
app.use('/api', authMiddleware({ 
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h'
}));

// Input validation
app.post('/api/users', validate(z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)
})), async (req, res) => {
  // Create user
  res.json({ success: true });
});

app.listen(3000);
```

## JWT Authentication

### Create Token

```typescript
import { createToken } from '@rez/security';

const token = createToken(
  { userId: '123', role: 'admin', permissions: ['read', 'write'] },
  process.env.JWT_SECRET!,
  '24h'  // Expiration: 24h, 7d, 60m, etc.
);
```

### Verify Token

```typescript
import { verifyToken } from '@rez/security';

const payload = verifyToken(token, process.env.JWT_SECRET!);

if (!payload) {
  return res.status(401).json({ error: 'Invalid token' });
}

console.log(payload.userId);  // '123'
console.log(payload.role);    // 'admin'
```

### Auth Middleware

```typescript
import { authMiddleware } from '@rez/security';

// Protect all /api routes
app.use('/api', authMiddleware({
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h'  // Optional: enforce expiration
}));

// Access user in handler
app.get('/api/profile', (req, res) => {
  const user = (req as any).user;
  res.json({ userId: user.userId, role: user.role });
});
```

## RBAC Authorization

### Role Hierarchy

Roles have hierarchical permissions:

```
super_admin → admin → operator → analyst → support → merchant → viewer
```

### Require Specific Role

```typescript
import { requireRole } from '@rez/security';

// Single role
app.delete('/admin/users/:id', requireRole('admin'));

// Multiple roles (any match)
app.put('/settings', requireRole('admin', 'super_admin'));
```

### Require Specific Permission

```typescript
import { requirePermission } from '@rez/security';

// All permissions required
app.delete('/orders/:id', requirePermission('orders:delete', 'orders:write'));

// Super admin bypasses permission check
```

### Custom Roles and Permissions

```typescript
// Add custom role hierarchy
const customRoles = {
  content_manager: ['editor', 'viewer'],
  editor: ['viewer'],
  viewer: []
};

app.delete('/posts/:id', requireRole('content_manager', 'editor'));
```

## Input Validation

### Basic Validation

```typescript
import { validate, z } from '@rez/security';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().regex(/^(\+91)?[\s-]?[6-9]\d{9}$/).optional()
});

app.post('/api/register', validate(registerSchema), (req, res) => {
  // req.body is validated and typed
  const { email, password, firstName, lastName, phone } = req.body;
  res.json({ success: true });
});
```

### Query Parameter Validation

```typescript
import { validateQuery, z } from '@rez/security';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
});

app.get('/api/users', validateQuery(paginationSchema), (req, res) => {
  const { page, limit, sort, order } = req.query;
  // ...
});
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "email", "message": "Invalid email address" },
      { "path": "password", "message": "Password must contain at least one uppercase letter" }
    ]
  }
}
```

## Security Headers

### Enable All Security Headers

```typescript
import { secureHeaders } from '@rez/security';

app.use(secureHeaders());
```

### What's Included

| Header | Value |
|--------|-------|
| Content-Security-Policy | Restricts scripts, styles, images, etc. |
| Strict-Transport-Security | HSTS with 1-year max-age |
| X-Frame-Options | DENY (prevents clickjacking) |
| X-Content-Type-Options | nosniff |
| X-XSS-Protection | Enabled |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | Restricts camera, microphone, geolocation |

### Custom CSP

```typescript
app.use(secureHeaders({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.example.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  }
}));
```

## CORS Configuration

### Basic CORS

```typescript
import { secureCors } from '@rez/security';

// Allow specific origins
app.use(secureCors({
  origin: ['https://app.rez.com', 'https://admin.rez.com'],
  credentials: true
}));

// From environment variable
app.use(secureCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false
}));
```

### Default Configuration

```typescript
secureCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400  // 24 hours
});
```

## Secure Token Generation

### Generate Random Token

```typescript
import { generateToken, generateUUID } from '@rez/security';

// 32-byte random token
const token = generateToken(32);

// UUID v4
const uuid = generateUUID();
```

### Hash Sensitive Data

```typescript
import { hash } from '@rez/security';

// SHA-256 hash (for comparison, not reversible)
const hashed = hash('sensitive-data');
```

### Timing-Safe Comparison

```typescript
import { secureCompare } from '@rez/security';

// Prevents timing attacks
if (secureCompare(providedToken, expectedToken)) {
  // Tokens match
}
```

## PII Masking

### Automatic PII Detection

```typescript
import { maskPII } from '@rez/security';

const sensitiveData = {
  email: 'john.doe@example.com',
  phone: '+919876543210',
  password: 'secret123',
  aadhaar: '1234-5678-9012',
  pan: 'ABCDE1234F',
  name: 'John Doe',
  amount: 1000
};

const masked = maskPII(sensitiveData);

// Result:
// {
//   email: 'jo***@example.com',
//   phone: '+91***-***-3210',
//   password: '[REDACTED]',
//   aadhaar: '1234****9012',
//   pan: 'ABCDE****4F',
//   name: 'John Doe',  // Not recognized as PII
//   amount: 1000
// }
```

### PII Patterns

| Pattern | Example | Masked |
|---------|---------|--------|
| email | john@example.com | jo***@example.com |
| phone | +919876543210 | +91***-***-3210 |
| password | secret123 | [REDACTED] |
| aadhaar | 1234-5678-9012 | 1234****9012 |
| pan | ABCDE1234F | ABCDE****4F |
| token | xyz123 | [REDACTED] |

## Rate Limiting

### Per-Endpoint Rate Limiting

```typescript
import { createRateLimiter } from '@rez/security';

// Strict limit for auth endpoints
app.post('/api/auth/login', 
  createRateLimiter({ windowMs: 60000, max: 5 }),
  handler
);

// Moderate limit for API
app.use('/api',
  createRateLimiter({ windowMs: 60000, max: 100 })
);
```

## Complete Example

```typescript
import express from 'express';
import { 
  authMiddleware, secureHeaders, secureCors,
  validate, requireRole, requirePermission,
  createToken, verifyToken, maskPII,
  createRateLimiter, generateToken,
  z
} from '@rez/security';

const app = express();

// Security middleware
app.use(secureHeaders());
app.use(secureCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true
}));
app.use(express.json());

// Auth routes (rate limited)
const authLimiter = createRateLimiter({ windowMs: 60000, max: 5 });
app.post('/api/auth/login', authLimiter, validate(z.object({
  email: z.string().email(),
  password: z.string().min(1)
})), async (req, res) => {
  const { email, password } = req.body;
  
  // Verify credentials (example)
  const user = await verifyCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create token
  const token = createToken(
    { userId: user.id, role: user.role, permissions: user.permissions },
    process.env.JWT_SECRET!
  );
  
  // Log with PII masking
  const logData = maskPII({ email, userId: user.id });
  console.log('Login successful', logData);
  
  res.json({ token, userId: user.id });
});

// Protected routes
app.use('/api', authMiddleware({ secret: process.env.JWT_SECRET! }));

// Admin-only route
app.delete('/api/users/:id', 
  requireRole('admin'),
  requirePermission('users:delete'),
  async (req, res) => {
    const { id } = req.params;
    await deleteUser(id);
    res.json({ success: true });
  }
);

app.listen(3000);
```

## API Reference

### createToken(payload, secret, expiresIn)
Create a signed JWT token.

### verifyToken(token, secret)
Verify and decode a JWT token. Returns `null` if invalid.

### authMiddleware(config)
Express middleware for JWT authentication.

### requireRole(...roles)
Express middleware requiring one of the specified roles.

### requirePermission(...permissions)
Express middleware requiring all specified permissions.

### validate(schema)
Express middleware for request body validation.

### validateQuery(schema)
Express middleware for query parameter validation.

### secureHeaders()
Express middleware for security headers.

### secureCors(options)
Express middleware for CORS configuration.

### generateToken(length)
Generate a cryptographically secure random token.

### generateUUID()
Generate a UUID v4.

### hash(data)
Create SHA-256 hash of data.

### secureCompare(a, b)
Timing-safe string comparison.

### maskPII(data)
Mask PII fields in an object.

### createRateLimiter(config)
Create rate limiting middleware.

## License

Proprietary - RTNM Digital