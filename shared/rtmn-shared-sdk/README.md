# RTMN Shared SDK

Centralized SDK for all RTMN services providing authentication, security, and utilities.

## Installation

```bash
npm install @rtmn/shared-sdk
```

## Usage

### 1. Authentication

```typescript
import express from 'express';
import { createAuthMiddleware, createTokenService, hashPassword, verifyPassword } from '@rtmn/shared-sdk';

const app = express();

// Create auth middleware
const auth = createAuthMiddleware();
const tokenService = createTokenService();

// Protect routes
app.use('/api', auth.authenticate());

// Role-based access
app.get('/admin', auth.authenticate(), auth.authorize('admin'), handler);

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Verify password
  const isValid = await verifyPassword(password, user.hash);
  
  // Generate token
  const token = tokenService.generateToken({
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
  });
  
  res.json({ token });
});
```

### 2. Security Middleware

```typescript
import {
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiters,
} from '@rtmn/shared-sdk';

app.use(createCorsMiddleware());
app.use(createHelmetMiddleware());
app.use(createRateLimiters().global);
```

### 3. Validation

```typescript
import { validateRequest, z } from '@rtmn/shared-sdk';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  }),
});

app.post('/users', validateRequest(createUserSchema), async (req, res) => {
  // req.body is validated
});
```

### 4. Logging

```typescript
import { Logger, requestLogger } from '@rtmn/shared-sdk';

const logger = new Logger('my-service');
app.use(requestLogger(logger));

logger.info('Something happened', { userId: '123' });
```

### 5. Health Check

```typescript
import { createHealthCheck } from '@rtmn/shared-sdk';

app.get('/health', await createHealthCheck('my-service', '1.0.0'));
app.get('/ready', await createHealthCheck('my-service', '1.0.0'));
```

### 6. HIPAA Audit Logging

```typescript
import { HIPAAAuditLogger } from '@rtmn/shared-sdk';

const auditLogger = new HIPAAAuditLogger();

// Log PHI access
auditLogger.logPHIAccess(
  userId,
  tenantId,
  'patient_record',
  recordId,
  req,
  'view'
);
```

### 7. Circuit Breaker

```typescript
import { CircuitBreaker } from '@rtmn/shared-sdk';

const breaker = new CircuitBreaker(5, 60000, 30000);

try {
  const result = await breaker.execute(() => externalApiCall());
} catch (error) {
  // Circuit is open, service unavailable
}
```

### 8. Encryption

```typescript
import { encryptField, decryptField } from '@rtmn/shared-sdk';

// Environment: ENCRYPTION_KEY=32-byte-hex-key

// Encrypt sensitive data
const encrypted = encryptField('sensitive-data');

// Decrypt
const decrypted = decryptField(encrypted);
```

### 9. Pagination

```typescript
import { parsePagination, createPaginatedResponse } from '@rtmn/shared-sdk';

app.get('/resources', async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  
  const [data, total] = await Promise.all([
    Resource.find().skip((page - 1) * limit).limit(limit),
    Resource.countDocuments(),
  ]);
  
  res.json(createPaginatedResponse(data, total, { page, limit }));
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Production | JWT signing secret |
| `JWT_ISSUER` | No | JWT issuer (default: rtmn-services) |
| `JWT_AUDIENCE` | No | JWT audience (default: rtmn-api) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 24h) |
| `ENCRYPTION_KEY` | For encryption | 32-byte hex key for AES-256-GCM |
| `ALLOWED_ORIGINS` | Production | Comma-separated CORS origins |
| `NODE_ENV` | Production | Set to 'production' |

## License

MIT
