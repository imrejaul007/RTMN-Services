# BOA Council

## Overview
Multi-BOA coordination engine that synthesizes decisions from CEO, CFO, COO, CMO, CHRO, and CLO perspectives.

## Port: 3016

## Council Members
- **CEO** - Strategy, vision, growth
- **CFO** - Finance, revenue, costs
- **COO** - Operations, efficiency
- **CMO** - Marketing, brand
- **CHRO** - People, culture
- **CLO** - Legal, compliance

## Routes
- `council.js` - Council query routes
- `synthesis.js` - Multi-BOA synthesis
- `decisions.js` - Decision tracking

## API Endpoints
- `GET /api/council` - Full council overview
- `GET /api/council/members` - List members
- `POST /api/council/consult` - Consult council
- `POST /api/synthesis/multi-perspective` - Synthesize perspectives
- `GET /api/decisions` - List decisions
- `POST /api/decisions` - Create decision

## Usage
```javascript
// Consult the council
POST /api/council/consult
{
  "question": "Should we expand to new market?",
  "context": "retail expansion"
}
```

## Dependencies
- express, cors, helmet, redis, uuid, winston
