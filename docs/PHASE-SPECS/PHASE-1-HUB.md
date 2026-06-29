# 📋 PHASE 1: BUILD RTMN UNIFIED HUB
**Duration:** Week 2-4
**Goal:** Unified gateway connecting all services

---

## Overview

The RTMN Hub is the single entry point for all external traffic. It routes requests to appropriate services, handles auth, rate limiting, and provides a service registry.

```
Internet Request
       ↓
  RTMN Hub (4399)
       ↓
   Route by path
       ↓
  Genie/RAZO/DO/Memory/etc.
```

---

## Directory Structure

```
services/rtmn-unified-hub/
├── src/
│   ├── index.ts              # Express server, port 4399
│   ├── routes/
│   │   ├── index.ts          # Aggregate routes
│   │   ├── genie.ts          # /api/genie/* → Genie 7100
│   │   ├── razzo.ts         # /api/razo/* → RAZO 4299
│   │   ├── do.ts            # /api/do/* → DO App 3001
│   │   ├── memory.ts        # /api/memory/* → MemoryOS 4703
│   │   ├── twin.ts          # /api/twin/* → TwinOS 4705
│   │   ├── sutar.ts        # /api/sutar/* → SUTAR 4140
│   │   ├── nexha.ts         # /api/nexha/* → Nexha 4380
│   │   ├── trust.ts         # /api/trust/* → TrustOS
│   │   └── health.ts        # /health, /ready
│   ├── services/
│   │   ├── serviceRegistry.ts   # Dynamic service discovery
│   │   ├── proxy.ts            # HTTP proxy to services
│   │   ├── circuitBreaker.ts   # Failure handling
│   │   └── metrics.ts         # Request metrics
│   └── middleware/
│       ├── auth.ts             # JWT validation
│       ├── cors.ts            # CORS config
│       └── rateLimiter.ts     # Per-service limits
├── __tests__/
│   └── hub.test.ts
├── package.json
└── README.md
```

---

## 1. package.json

```json
{
  "name": "@rtmn/rtmn-hub",
  "version": "1.0.0",
  "description": "RTMN Unified Hub - Single entry point for all services",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0",
    "ioredis": "^5.3.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0"
  }
}
```

---

## 2. src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { proxyToUpstream } from './services/proxy.js';
import { serviceRegistry } from './services/serviceRegistry.js';
import routes from './routes/index.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const PORT = parseInt(process.env.PORT || '4399', 10);
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', hub: 'rtmn-unified-hub', port: PORT });
});

app.get('/ready', async (req, res) => {
  const services = await serviceRegistry.getAllStatus();
  const allHealthy = services.every(s => s.healthy);
  res.status(allHealthy ? 200 : 503).json({ 
    hub: 'ready', 
    services,
    allHealthy 
  });
});

// Service registry (no auth)
app.get('/api/services', async (req, res) => {
  const services = await serviceRegistry.getAllStatus();
  res.json(services);
});

// Protected routes
app.use('/api', authMiddleware);
app.use('/api', rateLimiter);
app.use('/api', routes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`RTMN Hub running on port ${PORT}`);
  serviceRegistry.startHealthChecks();
});

export default app;
```

---

## 3. Service Registry

```typescript
// src/services/serviceRegistry.ts

interface Service {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
  healthy: boolean;
  lastCheck: Date;
}

const SERVICES: Service[] = [
  { name: 'genie', url: 'http://localhost:7100', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'razo', url: 'http://localhost:4299', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'do', url: 'http://localhost:3001', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'memory', url: 'http://localhost:4703', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'twin', url: 'http://localhost:4705', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'sutar', url: 'http://localhost:4140', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
  { name: 'nexha', url: 'http://localhost:4380', healthPath: '/health', timeout: 5000, healthy: false, lastCheck: new Date() },
];

export const serviceRegistry = {
  async getService(name: string): Promise<Service | undefined> {
    return SERVICES.find(s => s.name === name);
  },
  
  async getAllStatus(): Promise<Service[]> {
    return SERVICES.map(s => ({
      ...s,
      healthy: s.healthy,
      lastCheck: s.lastCheck
    }));
  },
  
  async checkHealth(service: Service): Promise<boolean> {
    try {
      const response = await fetch(`${service.url}${service.healthPath}`, {
        method: 'GET',
        signal: AbortSignal.timeout(service.timeout)
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  
  startHealthChecks() {
    setInterval(async () => {
      for (const service of SERVICES) {
        service.healthy = await this.checkHealth(service);
        service.lastCheck = new Date();
      }
    }, 30000); // Check every 30 seconds
  }
};
```

---

## 4. Proxy Service

```typescript
// src/services/proxy.ts

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { serviceRegistry } from './serviceRegistry.js';

export async function proxyToUpstream(
  req: Request,
  res: Response,
  next: NextFunction,
  serviceName: string
) {
  const service = await serviceRegistry.getService(serviceName);
  
  if (!service) {
    return res.status(404).json({ error: `Service ${serviceName} not found` });
  }
  
  if (!service.healthy) {
    return res.status(503).json({ error: `Service ${serviceName} is unhealthy` });
  }
  
  try {
    const targetUrl = `${service.url}${req.originalUrl.replace(`/api/${serviceName}`, '')}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
      },
      timeout: service.timeout,
      validateStatus: () => true, // Pass through all status codes
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    next(error);
  }
}
```

---

## 5. Routes

```typescript
// src/routes/index.ts

import { Router } from 'express';
import { proxyToUpstream } from '../services/proxy.js';

const router = Router();

// Genie routes
router.use('/genie/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'genie')
);

// RAZO routes
router.use('/razo/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'razo')
);

// DO App routes
router.use('/do/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'do')
);

// Memory routes
router.use('/memory/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'memory')
);

// Twin routes
router.use('/twin/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'twin')
);

// SUTAR routes
router.use('/sutar/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'sutar')
);

// Nexha routes
router.use('/nexha/:path(*)', (req, res, next) => 
  proxyToUpstream(req, res, next, 'nexha')
);

export default router;
```

---

## 6. Auth Middleware

```typescript
// src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health/read routes
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    // Allow internal service-to-service calls
    if (req.headers['x-internal-token']) {
      return next();
    }
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## 7. Rate Limiter

```typescript
// src/middleware/rateLimiter.ts

import { Request, Response, NextFunction } from 'express';

const limits: Record<string, { count: number; window: number }> = {
  genie: { count: 100, window: 60000 },    // 100 req/min
  razzo: { count: 200, window: 60000 },    // 200 req/min
  memory: { count: 500, window: 60000 },    // 500 req/min
  default: { count: 100, window: 60000 },
};

const counters: Map<string, { count: number; resetAt: number }> = new Map();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const service = req.path.split('/')[2]; // /api/genie/...
  const limit = limits[service] || limits.default;
  
  const key = `${service}:${req.ip}`;
  const now = Date.now();
  
  let counter = counters.get(key);
  
  if (!counter || now > counter.resetAt) {
    counter = { count: 0, resetAt: now + limit.window };
    counters.set(key, counter);
  }
  
  counter.count++;
  
  if (counter.count > limit.count) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((counter.resetAt - now) / 1000)
    });
  }
  
  res.setHeader('X-RateLimit-Limit', limit.count);
  res.setHeader('X-RateLimit-Remaining', limit.count - counter.count);
  
  next();
}
```

---

## 8. Error Handler

```typescript
// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[Hub Error] ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'Internal hub error',
    message: err.message,
    path: req.path
  });
}
```

---

## 9. Test File

```typescript
// __tests__/hub.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const BASE_URL = 'http://localhost:4399';

describe('RTMN Hub', () => {
  it('should return healthy on /health', async () => {
    const response = await axios.get(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });
  
  it('should return service registry on /api/services', async () => {
    const response = await axios.get(`${BASE_URL}/api/services`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
  
  it('should proxy to genie service', async () => {
    const response = await axios.get(`${BASE_URL}/api/genie/health`, {
      validateStatus: () => true
    });
    expect([200, 503, 502]).toContain(response.status);
  });
});
```

---

## 10. README.md

```markdown
# RTMN Unified Hub

Single entry point for all RTMN services.

## Quick Start

```bash
npm install
npm run build
npm start
```

## Endpoints

- `GET /health` - Hub health
- `GET /ready` - All services health
- `GET /api/services` - Service registry
- `POST /api/genie/*` - Proxy to Genie
- `POST /api/razo/*` - Proxy to RAZO
- `POST /api/do/*` - Proxy to DO App
- `GET /api/memory/*` - Proxy to MemoryOS
- `GET /api/twin/*` - Proxy to TwinOS
- `POST /api/sutar/*` - Proxy to SUTAR
```

---

## Checklist

- [ ] Create directory structure
- [ ] Create package.json
- [ ] Create index.ts
- [ ] Create serviceRegistry.ts
- [ ] Create proxy.ts
- [ ] Create routes/index.ts
- [ ] Create middleware/auth.ts
- [ ] Create middleware/rateLimiter.ts
- [ ] Create middleware/errorHandler.ts
- [ ] Create __tests__/hub.test.ts
- [ ] Create README.md
- [ ] npm install
- [ ] npm run build
- [ ] npm test
- [ ] Verify /health returns 200
- [ ] Verify /api/services lists all services
- [ ] Commit
