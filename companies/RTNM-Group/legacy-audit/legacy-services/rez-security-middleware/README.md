# @rez/security-middleware

Shared security middleware for all ReZ services.

## Installation

```bash
npm install @rez/security-middleware
```

## Usage

### Quick Start

```typescript
import express from 'express';
import helmet from 'helmet';
import { applySecurity } from '@rez/security-middleware';

const app = express();

// Apply all security middleware
applySecurity(app);

// Your routes
app.get('/api/data', (req, res) => {
  res.json({ data: 'secret' });
});

app.listen(3000);
```

### Individual Middleware

```typescript
import express from 'express';
import helmet from 'helmet';
import {
  requestId,
  securityHeaders,
  cors,
  rateLimit,
  auth,
  errorHandler,
  configure,
} from '@rez/security-middleware';

// Configure (optional)
configure({
  serviceName: 'my-service',
  allowedOrigins: ['https://app.example.com'],
  rateLimitMax: 100,
});

// Apply in order
app.use(requestId());
app.use(helmet());
app.use(securityHeaders());
app.use(cors());
app.use(rateLimit());

// API routes require auth
app.use('/api', auth());

// Error handler (must be last)
app.use(errorHandler());
```

## Environment Variables

```bash
# Required for authentication
INTERNAL_SERVICE_TOKENS_JSON={"service-name":"token"}

# Optional
NODE_ENV=production
```

## Middleware

### `requestId()`
Adds unique request ID for tracing.

### `securityHeaders()`
Adds security headers (X-Content-Type-Options, X-Frame-Options, etc.)

### `cors()`
Configurable CORS with allowed origins.

### `rateLimit()`
Rate limiting (100 requests/minute by default).

### `auth()`
Internal service authentication via `X-Internal-Token` header.

### `errorHandler()`
Global error handler with error IDs.

### `applySecurity(app)`
Apply all middleware at once.

## API Reference

### configure(config)

```typescript
configure({
  serviceName: 'my-service',
  allowedOrigins: ['https://app.example.com'],
  rateLimitMax: 200,
  rateLimitWindowMs: 60000, // 1 minute
  skipAuthPaths: ['/health', '/ready'],
});
```

## License

MIT
