# Industry AI Company Framework

## Overview
Packages AI capabilities as companies for each of the 24 RTMN industries.

## Port: 3030

## Features
- **24 Industry Companies**: One AI company per industry
- **Company Structure**: Executive, Product, Engineering, Sales, Operations, Support
- **Default Capabilities**: AI Assistant, Analytics Engine, Workflow Automation, Predictive Engine
- **Deployment Orchestration**: Deploy capabilities to production

## Industry Coverage
All 24 RTMN industries:
fitness, gaming, government, homeServices, manufacturing, nonprofit, professional,
sports, travel, construction, entertainment, financial, healthcare, education,
retail, technology, food, automotive, realestate, media, legal, agriculture,
energy, logistics

## Company Structure
```javascript
{
  executive: { headcount: 2, focus: ['strategy', 'vision'] },
  product: { headcount: 5, focus: ['roadmap', 'features'] },
  engineering: { headcount: 10, focus: ['development', 'infrastructure'] },
  sales: { headcount: 5, focus: ['acquisition', 'retention'] },
  operations: { headcount: 3, focus: ['efficiency', 'quality'] },
  support: { headcount: 5, focus: ['customer_success', 'documentation'] }
}
```

## Routes
- `company.js` - Company management
- `capabilities.js` - Capability management
- `deployment.js` - Deployment orchestration
- `metrics.js` - Company metrics

## API Endpoints
- `GET /api/companies` - List companies
- `GET /api/companies/:id` - Get company details
- `GET /api/capabilities` - List all capabilities
- `POST /api/capabilities` - Add capability
- `POST /api/deployments` - Create deployment
- `GET /api/metrics` - Get metrics overview

## Dependencies
- express, cors, helmet, redis, uuid, winston
