# Shared Utilities

This directory contains shared utilities and middleware used across all CorpID Cloud services.

---

## Structure

```
shared/
├── utils/
│   ├── constants.js      # 100+ constants
│   ├── logger.js         # Winston + audit logging
│   └── security.js       # Crypto, tokens, validation
└── middleware/
    ├── auth.js           # JWT authentication
    ├── rate-limit.js     # Rate limiting
    └── error-handler.js   # Error handling
```

---

## utils/constants.js

Centralized constants for all services including:
- Status enums (active, suspended, etc.)
- Role definitions
- Permission categories
- Resource types
- KYC levels
- Consent types
- Risk levels
- Audit actions

## utils/logger.js

Winston-based structured logging with:
- JSON format for production
- Colored output for development
- Audit logging helpers:
  - `auditLog()` - Generic audit event
  - `authAudit()` - Authentication events
  - `authzAudit()` - Authorization events
  - `dataAudit()` - Data modification events
- Request-scoped logger middleware

## utils/security.js

Cryptographic utilities:
- `hashPassword()` / `verifyPassword()` - bcrypt
- `checkPasswordStrength()` - Policy validation
- `generateToken()` - Secure random tokens
- `generateOTP()` - Numeric OTP codes
- `generateAPIKey()` / `hashAPIKey()` - API keys
- `sha256()` / `hmacSHA256()` - Hashing
- `encrypt()` / `decrypt()` - AES-256-GCM
- `preventPrototypePollution()` - Sanitization
- `sanitizeSearchInput()` - XSS prevention
- `isValidEmail()` / `isValidPhone()` / `isValidUUID()` - Validation
- `maskEmail()` / `maskPhone()` / `maskAPIKey()` - PII masking

## middleware/auth.js

Authentication middleware:
- `verifyToken()` - JWT verification
- `generateAccessToken()` / `generateRefreshToken()` - Token generation
- `requireAuth()` - Required authentication
- `optionalAuth()` - Optional authentication
- `requireRole(...roles)` - Role-based access
- `requireAdmin()` - Admin or owner role
- `requireSuperadmin()` - Superadmin only
- `requireBusinessScope()` - Business isolation

## middleware/rate-limit.js

Rate limiting:
- `authLimiter` - 5 requests / 15 minutes (auth endpoints)
- `apiLimiter` - 100 requests / 1 minute (general API)
- `strictLimiter` - 20 requests / 1 minute (sensitive operations)
- `createLimiter()` - Custom rate limiter factory

## middleware/error-handler.js

Error handling:
- `AppError` - Custom error class
- `Errors` - Error factories
- `errorHandler` - Global error handler
- `notFoundHandler` - 404 handler
- `asyncHandler` - Async wrapper

---

## Usage Example

```javascript
// Import shared utilities
import { requireAuth, requireAdmin } from '../shared/middleware/auth.js';
import { apiLimiter } from '../shared/middleware/rate-limit.js';
import { asyncHandler, AppError } from '../shared/middleware/error-handler.js';
import { hashPassword } from '../shared/utils/security.js';
import { dataAudit } from '../shared/utils/logger.js';

// Use in routes
app.post('/api/resource',
  requireAuth(),
  requireAdmin(),
  apiLimiter,
  asyncHandler(async (req, res) => {
    // Business logic
    dataAudit('resource.created', req, 'resource', resourceId);
  })
);
```