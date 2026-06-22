# @rez/monorepo - REZ Shared Packages

> Unified shared packages for all REZ microservices

## Packages

| Package | Description |
|---------|-------------|
| [@rez/mongodb](mongodb/) | Standardized MongoDB connection |
| [@rez/redis](redis/) | Standardized Redis client |
| [@rez/logger](logger/) | Structured JSON logging |
| [@rez/security](security/) | JWT auth, RBAC, validation |
| [@rez/validation](validation/) | Zod validation schemas |
| [@rez/testing](testing/) | Test utilities |
| [@rez/monitoring](monitoring/) | Prometheus, health checks |
| [@rez/docker](docker/) | Docker templates |
| [@rez/readme](readme/) | README template |

## Quick Start

```bash
# Install all packages
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

## Usage

```typescript
// MongoDB
import { createConnection } from '@rez/mongodb';

// Redis
import { createClient, rateLimiter } from '@rez/redis';

// Logger
import { createLogger } from '@rez/logger';

// Security
import { authMiddleware, createToken } from '@rez/security';

// Validation
import { schemas } from '@rez/validation';

// Monitoring
import { createMetrics } from '@rez/monitoring';
```

## License

Proprietary - RTNM Digital