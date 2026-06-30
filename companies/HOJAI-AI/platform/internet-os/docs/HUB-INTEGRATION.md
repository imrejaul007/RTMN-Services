/**
 * InternetOS Hub Integration
 *
 * Allows the InternetOS API server to be accessed via the RTMN Hub.
 * This file documents how to wire InternetOS into the central hub.
 *
 * If you have a unified-os-hub or REZ-ecosystem-connector,
 * add this configuration:
 */

# InternetOS Hub Configuration

## Method 1: Direct Proxy (Recommended)

Add to your unified-os-hub routes:

```javascript
// InternetOS proxy configuration
{
  path: '/api/internet-os',
  target: 'http://localhost:4595',
  changeOrigin: true,
  pathRewrite: {
    '^/api/internet-os': ''
  }
}
```

Then access InternetOS via:
- `http://hub:4399/api/internet-os/actors`
- `http://hub:4399/api/internet-os/watchers`
- `http://hub:4399/api/internet-os/history`

## Method 2: Service Registration

Register InternetOS as a known service:

```javascript
{
  id: 'internet-os',
  name: 'InternetOS',
  baseUrl: 'http://localhost:4595',
  healthCheck: '/health',
  routes: [
    { prefix: '/api/actors', target: '/api/actors' },
    { prefix: '/api/watchers', target: '/api/watchers' },
    { prefix: '/api/history', target: '/api/history' },
    { prefix: '/api/stats', target: '/api/stats' },
  ]
}
```

## Method 3: HOJAI Cloud App Store

Add to HOJAI Cloud's app store:
- App name: InternetOS
- Manifest: `internet-os.app.json`
- Port: 4595
- Auto-discovery: yes

## Service Manifest

```json
{
  "id": "internet-os",
  "name": "InternetOS",
  "version": "1.0.0",
  "description": "Web intelligence and intelligence layer for AI workforces",
  "port": 4595,
  "baseUrl": "http://localhost:4595",
  "healthCheck": "/health",
  "capabilities": [
    "web-scraping",
    "change-detection",
    "entity-extraction",
    "memory-storage",
    "skill-execution"
  ],
  "endpoints": {
    "actors": "/api/actors",
    "watchers": "/api/watchers",
    "history": "/api/history",
    "stats": "/api/stats"
  },
  "actors": 17,
  "skills": 5,
  "integrations": [
    "memory-os:4703",
    "twin-os:4705",
    "knowledge-extraction:4784",
    "webhook-bus:4110",
    "skill-os:4743"
  ]
}
```

## Dependencies

InternetOS integrates with these HOJAI services:
- MemoryOS (port 4703)
- TwinOS Hub (port 4705)
- Knowledge Extraction (port 4784)
- Webhook Bus (port 4110)
- SkillOS (port 4743)
- AI Intelligence (port 4881)

Make sure these services are running before starting InternetOS.
