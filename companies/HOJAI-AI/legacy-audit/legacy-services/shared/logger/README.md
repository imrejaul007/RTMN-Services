# @rez/logger - Structured Logging

> Standardized structured logging for all REZ services

## Features

- ✅ JSON structured logging
- ✅ Log levels (debug, info, warn, error)
- ✅ Request ID tracking
- ✅ PII masking
- ✅ Multiple transports (console, file, remote)
- ✅ Performance metrics

## Installation

```bash
npm install @rez/logger
```

## Usage

```typescript
import { createLogger, requestLogger } from '@rez/logger';

// Create logger
const logger = createLogger({
  service: 'my-service',
  level: process.env.LOG_LEVEL ?? 'info',
});

// Request logging middleware
app.use(requestLogger(logger));

// Use in code
logger.info('user_login', { userId: '123', action: 'login' });
logger.error('payment_failed', { error: err.message, orderId: '456' });
```

## License

Proprietary - RTNM Digital