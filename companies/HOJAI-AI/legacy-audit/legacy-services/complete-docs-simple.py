#!/usr/bin/env python3
"""
HOJAI AI - Complete Documentation Generator (Simple Version)
==========================================================
Generates comprehensive documentation for ALL services.
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

HOJAI_ROOT = Path("/Users/rejaulkarim/Documents/RTMN/companies/hojai-ai")

def find_services():
    services = []
    for item in HOJAI_ROOT.iterdir():
        if item.is_dir() and not item.name.startswith('.') and item.name not in ['products', 'services', 'node_modules']:
            services.append(item)
    industry = HOJAI_ROOT / 'industry-ai'
    if industry.exists():
        for item in industry.iterdir():
            if item.is_dir():
                services.append(item)
    services_dir = HOJAI_ROOT / 'services'
    if services_dir.exists():
        for item in services_dir.iterdir():
            if item.is_dir():
                services.append(item)
    products_dir = HOJAI_ROOT / 'products' / 'REZ-Intelligence'
    if products_dir.exists():
        for item in products_dir.iterdir():
            if item.is_dir():
                services.append(item)
    return services

def get_port(path):
    index = path / 'src' / 'index.ts'
    if not index.exists():
        index = path / 'src' / 'index.js'
    if index.exists():
        content = index.read_text()
        match = re.search(r'const\s+PORT\s*=\s*process\.env\.PORT\s*\|\|\s*[\'"](\d+)[\'"]', content)
        if match:
            return match.group(1)
        match = re.search(r'process\.env\.PORT\s*\|\|\s*(\d+)', content)
        if match:
            return match.group(1)
    return None

def get_endpoints(path):
    endpoints = []
    index = path / 'src' / 'index.ts'
    if not index.exists():
        index = path / 'src' / 'index.js'
    if index.exists():
        content = index.read_text()
        for method, verb in [('GET', 'get'), ('POST', 'post'), ('PUT', 'put'), ('DELETE', 'delete')]:
            pattern = rf'app\.{verb}\s*\(\s*[\'"]([^\'"]+)[\'"]'
            for match in re.findall(pattern, content):
                if match and match not in ['/', '/health']:
                    endpoints.append((method, match))
    return endpoints[:15]

def has_health(path):
    index = path / 'src' / 'index.ts'
    if not index.exists():
        index = path / 'src' / 'index.js'
    if index.exists():
        content = index.read_text()
        if 'health' in content.lower():
            return True
    return False

def has_docker(path):
    return (path / 'Dockerfile').exists()

def get_type(path):
    name = path.name.lower()
    if 'genie' in name:
        return 'Genie Personal AI'
    elif 'hojai' in name:
        if 'voice' in name:
            return 'Voice AI'
        elif 'agent' in name:
            return 'Agent Platform'
        elif 'skill' in name or 'net' in name:
            return 'SkillNet'
        return 'HOJAI Core'
    elif 'rez' in name:
        return 'REZ Intelligence'
    return 'Industry AI'

def get_desc(path):
    name = path.name.replace('-', ' ').replace('_', ' ').title()
    pkg = path / 'package.json'
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text())
            desc = data.get('description', '')
            if desc and len(desc) > 5:
                return desc
        except:
            pass
    return name + ' - AI/ML intelligence service'

def generate_readme(path):
    name = path.name.replace('-', ' ').replace('_', ' ').title()
    stype = get_type(path)
    desc = get_desc(path)
    port = get_port(path) or '3000'
    endpoints = get_endpoints(path)
    health = has_health(path)
    docker = has_docker(path)
    date = datetime.now().strftime("%Y-%m-%d")

    content = f"""# {name}

> **{stype}** | {desc}

---

## Overview

This is a {stype.lower()} service in the HOJAI AI ecosystem.

## Quick Start

```bash
npm install
npm run dev
```

**Default Port:** `{port}`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | {port} | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
"""
    for method, ep in endpoints:
        content += f"| {method} | {ep} | {method} request |\n"

    content += f"""
## Health Check

"""
    if health:
        content += f"""```bash
curl http://localhost:{port}/health
```

**Response:**
```json
{{"status": "healthy", "service": "{path.name.lower()}", "timestamp": "..."}}
```

"""
    else:
        content += """⚠️ **Warning:** No health endpoint detected.\n\n"""

    content += f"""## Tech Stack

| Component | Technology |
|-----------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB |
| Cache | Redis |

"""

    if docker:
        content += f"""## Docker Support

```bash
docker build -t {path.name.lower()}:latest .
docker run -p {port}:3000 {path.name.lower()}:latest
```

"""

    content += f"""## Integration Points

### RABTUL Services

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | User authentication |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI

| Service | Port | Purpose |
|---------|------|---------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI |
| HOJAI Voice | 4850 | Voice AI |

## License

Proprietary - RTNM Digital

---

**Last Updated:** {date}
**Version:** 1.0.0
"""
    return content

def generate_claude(path):
    name = path.name.replace('-', ' ').replace('_', ' ').title()
    stype = get_type(path)
    desc = get_desc(path)
    port = get_port(path) or '3000'
    endpoints = get_endpoints(path)
    health = has_health(path)
    docker = has_docker(path)
    date = datetime.now().strftime("%Y-%m-%d")

    content = f"""# CLAUDE.md - {name}

## Project Overview

**Name:** {name}
**Type:** {stype}
**Purpose:** {desc}

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
{path.name}/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

**Default Port:** {port}

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Service port (default: {port}) |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret |
| REDIS_URL | No | Redis connection URL |

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
"""
    for method, ep in endpoints:
        content += f"| {method} | {ep} | {method} request |\n"

    content += f"""
## Health Monitoring

"""
    if health:
        content += f"""### Health Endpoint

**GET** `/health`

```json
{{
  "status": "healthy",
  "service": "{path.name.lower()}",
  "version": "1.0.0"
}}
```

"""
    else:
        content += """### ⚠️ Health Endpoint Missing

Add to src/index.ts:

```typescript
app.get('/health', (req, res) => {{
  res.json({{
    status: 'healthy',
    service: 'SERVICE_NAME',
    timestamp: new Date().toISOString()
  }});
}});
```

"""

    content += f"""## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance management |
| RABTUL Notification | 4005 | Push notifications |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice AI |

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [ ] Unit tests written
- [ ] Integration tests written
"""
    if health:
        content += "- [x] Health endpoint implemented\n"
    else:
        content += "- [ ] Health endpoint implemented\n"

    if docker:
        content += "- [x] Docker support added\n"
    else:
        content += "- [ ] Docker support added\n"

    content += f"""- [ ] Environment variables documented
- [ ] Monitoring configured
- [ ] Security audit passed

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Verify MONGODB_URI |
| Redis timeout | Verify REDIS_URL |
| JWT validation fails | Verify JWT_SECRET |
| Health check fails | Check all dependencies |

---

**Last Updated:** {date}
"""
    return content

def generate_integration(path):
    name = path.name.replace('-', ' ').replace('_', ' ').title()
    port = get_port(path) or '3000'
    date = datetime.now().strftime("%Y-%m-%d")

    content = f"""# {name} - Integration Guide

## Overview

This document describes how to integrate with {name}.

## Prerequisites

- Node.js 20+
- MongoDB instance
- Redis instance (optional)

## Quick Integration

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
export MONGODB_URI=mongodb://localhost:27017/{path.name.lower()}
export JWT_SECRET=your-jwt-secret
export PORT={port}
```

### 3. Start Service

```bash
npm run dev
```

## API Integration

### Authentication

```javascript
// Include JWT token in headers
const headers = {{
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
}};
```

### Making Requests

```javascript
// GET request
const data = await fetch('http://localhost:{port}/api/v1/resource', {{
  method: 'GET',
  headers
}});

// POST request
const created = await fetch('http://localhost:{port}/api/v1/resource', {{
  method: 'POST',
  headers,
  body: JSON.stringify({{ name: 'New Resource' }})
}});
```

## RABTUL Integration

### Auth Service (4002)

```javascript
// Verify user token
const response = await fetch('http://localhost:4002/api/auth/verify', {{
  method: 'POST',
  headers: {{ 'Authorization': 'Bearer ' + token }}
}});
```

### Payment Service (4001)

```javascript
// Process payment
const payment = await fetch('http://localhost:4001/api/payments/initiate', {{
  method: 'POST',
  headers,
  body: JSON.stringify({{ amount: 1000, currency: 'INR' }})
}});
```

### Wallet Service (4004)

```javascript
// Get balance
const balance = await fetch('http://localhost:4004/api/wallet/balance', {{
  headers
}});
```

### Notification Service (4005)

```javascript
// Send notification
await fetch('http://localhost:4005/api/notifications/send', {{
  method: 'POST',
  headers,
  body: JSON.stringify({{ userId, channel: 'push', message: 'Hello!' }})
}});
```

## Error Handling

```javascript
try {{
  const result = await apiCall();
}} catch (error) {{
  if (error.status === 401) {{
    // Handle auth error
  }} else if (error.status === 429) {{
    // Handle rate limit
  }}
}}
```

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/* | 100 | 1 minute |
| /health | 1000 | 1 minute |

## Support

- Email: support@hojai.ai
- Slack: #hojai-support

---

**Last Updated:** {date}
"""
    return content

def main():
    print("\n" + "="*60)
    print("HOJAI AI - Complete Documentation Generator")
    print("="*60 + "\n")

    services = find_services()
    print(f"Found {len(services)} services\n")

    stats = {'readme': 0, 'claude': 0, 'integration': 0, 'health': 0, 'docker': 0}
    health_issues = []
    docker_missing = []

    for service in sorted(services, key=lambda x: x.name):
        name = service.name

        # Generate README
        readme_content = generate_readme(service)
        readme_path = service / 'README.md'
        readme_path.write_text(readme_content)
        stats['readme'] += 1

        # Generate CLAUDE.md
        claude_content = generate_claude(service)
        claude_path = service / 'CLAUDE.md'
        claude_path.write_text(claude_content)
        stats['claude'] += 1

        # Generate INTEGRATION.md
        integration_content = generate_integration(service)
        integration_path = service / 'INTEGRATION.md'
        integration_path.write_text(integration_content)
        stats['integration'] += 1

        # Check health
        if has_health(service):
            stats['health'] += 1
            health_mark = '✓'
        else:
            health_issues.append(name)
            health_mark = '⚠'

        # Check docker
        if has_docker(service):
            stats['docker'] += 1
            docker_mark = '✓'
        else:
            docker_missing.append(name)
            docker_mark = '⚠'

        print(f"  {name:<45} README CLAUDE INTEGRATION {health_mark} {docker_mark}")

    # Generate report
    report = f"""# HOJAI AI - Complete Documentation Report

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Status:** ✅ COMPLETE

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Services | {len(services)} |
| README.md | {stats['readme']} (100%) |
| CLAUDE.md | {stats['claude']} (100%) |
| INTEGRATION.md | {stats['integration']} (100%) |
| Health Endpoints | {stats['health']} |
| Docker Support | {stats['docker']} |

---

## Health Endpoint Status

| Status | Count |
|--------|-------|
| ✅ Has Health Endpoint | {stats['health']} |
| ⚠️ Missing Health Endpoint | {len(health_issues)} |

### Missing Health Endpoints ({len(health_issues)})

"""
    for name in health_issues:
        report += f"- {name}\n"

    report += f"""
## Docker Support Status

| Status | Count |
|--------|-------|
| ✅ Has Dockerfile | {stats['docker']} |
| ⚠️ Missing Dockerfile | {len(docker_missing)} |

### Missing Dockerfiles ({len(docker_missing)})

"""
    for name in docker_missing:
        report += f"- {name}\n"

    report += f"""
---

## Action Items

### Priority 1: Add Health Endpoints ({len(health_issues)} services)

Add `/health` endpoint to each service.

### Priority 2: Add Docker Support ({len(docker_missing)} services)

Create Dockerfile for each service.

---

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Total Files Created:** {stats['readme'] * 3}
"""

    report_path = HOJAI_ROOT / 'COMPLETE-DOCUMENTATION-REPORT.md'
    report_path.write_text(report)

    print(f"\n{'='*60}")
    print("Documentation Generation Complete!")
    print(f"{'='*60}\n")
    print(f"README.md:        {stats['readme']}")
    print(f"CLAUDE.md:         {stats['claude']}")
    print(f"INTEGRATION.md:    {stats['integration']}")
    print(f"Health Endpoints:  {stats['health']}/{len(services)}")
    print(f"Docker Support:    {stats['docker']}/{len(services)}")
    print(f"\n✅ Report saved to: {report_path}")

    if health_issues:
        print(f"\n⚠️ {len(health_issues)} services missing health endpoints")
    if docker_missing:
        print(f"⚠️ {len(docker_missing)} services missing Docker support")

if __name__ == '__main__':
    main()