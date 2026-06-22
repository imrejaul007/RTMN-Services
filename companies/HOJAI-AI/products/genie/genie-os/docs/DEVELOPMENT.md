# Development Guide

> For contributors adding features, services, or fixing bugs in genie-os.

## Repository layout

```
genie-os/
├── foundation/<service>/         ← 7 services
├── runtime/<service>/             ← 3 services
├── products/<thin-client>/        ← 3 HTTP proxies
├── frontend/web/                  ← single-page web app
├── infrastructure/
│   ├── scripts/                   ← start/stop/test/health/demo
│   ├── seed/                      ← populate MongoDB
│   └── docker/                    ← deployment configs
├── docs/                          ← all documentation
└── logs/                          ← runtime logs and PIDs (gitignored)
```

Every service has the same shape:

```
<service>/
├── package.json
├── src/
│   └── index.js
└── test/
    └── test.js
```

## Adding a new service

**Scenario:** You want to add a new "notifications" service.

### Step 1: Create the directory structure

```bash
cd foundation/
mkdir notifications/src notifications/test
```

### Step 2: Create package.json

```json
{
  "name": "@hojai/notifications",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "node test/test.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3"
  }
}
```

### Step 3: Create src/index.js (follow the service pattern)

```javascript
import express from 'express';
import mongoose from 'mongoose';
// ... boilerplate ...

const PORT = parseInt(process.env.NOTIFICATIONS_PORT || '7008', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// ... schemas, routes, etc. ...

app.get('/health', (req, res) =>
  res.json({ success: true, data: { service: 'notifications', status: 'healthy' } })
);

if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
  app.listen(PORT, () => console.log(`[notifications] listening on :${PORT}`));
}
export { app };
```

### Step 4: Create test/test.js (follow the test pattern)

```javascript
process.env.NOTIFICATIONS_PORT = '18008'; // free test port
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
const PORT = 18008;

let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { if (server) server.close(); }
async function req(m, p, b, h = {}) {
  const r = await fetch(`http://localhost:${PORT}${p}`, {
    method: m,
    headers: { 'content-type': 'application/json', ...h },
    body: b ? JSON.stringify(b) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
let p = 0, f = 0;
const a = (n, c) => {
  if (c) { p++; console.log(`  ✓ ${n}`); }
  else { f++; console.log(`  ✗ ${n}`); }
};

async function run() {
  await setup();
  console.log('\nNotifications tests:');
  a('health', (await req('GET', '/health')).status === 200);
  // ... your tests ...
  await teardown();
  console.log(`\nNotifications: ${p} passed, ${f} failed`);
  process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
```

### Step 5: Add to start-all.js

Edit `infrastructure/scripts/start-all.js` and add:

```javascript
{ name: 'notifications', path: 'foundation/notifications', port: process.env.NOTIFICATIONS_PORT || 7008 },
```

### Step 6: Add to test-all.js

Edit `infrastructure/scripts/test-all.js` and add:

```javascript
{ name: 'Notifications', path: 'foundation/notifications' },
```

### Step 7: Add to health-check.js

Edit `infrastructure/scripts/health-check.js` and add:

```javascript
{ name: 'notifications', port: 7008, layer: 'Foundation (genie-os)' },
```

### Step 8: Add to .env

```bash
NOTIFICATIONS_PORT=7008
```

### Step 9: Document

Add a section to `docs/SERVICES.md` describing the new service.

## Adding a new thin client

Same as above, but the source is much smaller (~75 lines). The pattern is:

```javascript
import express from 'express';
import axios from 'axios';
// ... boilerplate ...
const PORT = parseInt(process.env.NEWCLIENT_PORT || '8999', 10);
const NEW_UPSTREAM_URL = process.env.NEW_UPSTREAM_URL || 'http://localhost:9999';

app.use('/api/:product', async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${NEW_UPSTREAM_URL}/api${req.url}`,
      data: req.body,
      headers: { /* pass-through */ },
      timeout: 15000,
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(502).json({ success: false, error: { code: 'PROXY_ERROR' } });
  }
});
```

Then add the route to `frontend/web/server.js`:
```javascript
app.use(/^\/api\/new(\/.*)?$/, (req, res) => {
  const fullPath = req.originalUrl;
  proxyWithPath(req, res, NEW_CLIENT_URL, fullPath, 'new-client → external');
});
```

## Wiring runtime/genie to call a new specialist

In `runtime/genie/src/index.js`, add:

```javascript
const NEW_SPECIALIST_URL = process.env.NEW_SPECIALIST_URL || 'http://localhost:4XXX';
```

Then in the `/api/ask` handler, add an intent block:

```javascript
else if (lower.includes('your-keyword')) {
  const res = await callInternal(`${NEW_SPECIALIST_URL}/api/...`, 'POST', { ... });
  if (res) {
    answer = `Specialist response: ${JSON.stringify(res).slice(0, 200)}`;
    delegated = 'new-specialist';
  }
}
```

## Code style

- **No TypeScript.** Plain ES modules JavaScript.
- **No transpilation.** Pure Node 20+ features.
- **No client-side framework.** Vanilla HTML/JS in `frontend/web/public/index.html`.
- **Naming:** camelCase for functions/variables, PascalCase for classes, kebab-case for files.
- **Comments:** Brief. The CLAUDE.md and docs/ are where the big explanations live.

## Debugging tips

### Check the logs
```bash
# Tail a specific service log
tail -f logs/genie.log
tail -f logs/do-client.log
```

### Check if a service is up
```bash
# Health check
npm run health

# Or directly
curl http://localhost:7100/health
```

### Test in isolation
```bash
# Stop everything
npm run stop:all

# Start just the foundation
npm run start:foundation

# Manually start the service you want to debug
cd foundation/corpid
node src/index.js

# Or run its tests
node test/test.js
```

### Check MongoDB
```bash
# List all databases
mongosh --eval "db.adminCommand('listDatabases')"

# Show collections in hojai
mongosh hojai --eval "db.getCollectionNames()"

# Drop and re-seed
mongosh hojai --eval "db.dropDatabase()"
npm run seed
```

### Check port conflicts
```bash
lsof -i :7100 -P
```

If something is already on the port, either kill it or change your `.env`.

## Common mistakes to avoid

1. **Forgetting to set `process.env.<NAME>_PORT` in tests** → Causes EADDRINUSE because the test app tries to bind to the real port.

2. **Forgetting `process.env.NODE_ENV = 'test'`** → The service auto-listens on import, conflicting with the test's `app.listen()`.

3. **Hardcoding a port instead of using env vars** → Makes it impossible to test, breaks the convention.

4. **Forgetting to add a service to `start-all.js`** → Tests pass but the service doesn't start in production.

5. **Adding business logic to a thin client** → Thin clients should ONLY forward. Logic belongs in the actual service.

6. **Returning different response shapes from different services** → Use the standard envelope: `{ success, data, meta }` or `{ success, error, meta }`.

7. **Using `console.log` for errors** → Use the structured `logger` from `infrastructure/scripts/` or the service's own logger.

## How to run tests in isolation

```bash
# One service
node foundation/corpid/test/test.js

# All services
node infrastructure/scripts/test-all.js

# With cleanup first
node infrastructure/scripts/stop-all.js
sleep 2
node infrastructure/scripts/test-all.js
```

## How to commit

This repo doesn't enforce a commit convention, but the suggested pattern is:

```
type(scope): description

Examples:
- feat(foundation): add notifications service
- fix(runtime): handle null response from MemoryOS
- docs(readme): update port table
- refactor(products): extract shared proxy logic
```

## Where to ask for help

- Read the docs first: `docs/`
- Look at the existing services for patterns
- Check `CLAUDE.md` for AI-coding-agent-specific guidance
- Run `npm run health` to see the system state
