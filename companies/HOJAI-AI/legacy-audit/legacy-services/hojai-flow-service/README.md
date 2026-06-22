# Hojai Flow Service

Backend API for Hojai Flow - voice-first AI companion.

## Quick Start

```bash
npm install
npm run dev
```

## Endpoints

### Memory

```
POST   /api/memory/tier        Store in L1-L5
GET    /api/memory/retrieve   Get from tiers
GET    /api/memory/search     Search all tiers
GET    /api/memory/context   Get full context
GET    /api/memory/stats     Tier stats
POST   /api/memory/learn     Learn from interaction
```

### Intent

```
POST   /api/intent/detect    Detect intent
GET    /api/intent/suggest   Get suggestions
```

### Personas

```
GET    /api/personas         List personas
POST   /api/personas         Create persona
PATCH  /api/personas/:id      Update persona
POST   /api/personas/learn    Learn style
```

### Brain

```
GET    /api/brain            List items
POST   /api/brain            Add item
POST   /api/brain/search     Search
GET    /api/brain/contacts   Contacts
```

### Actions

```
GET    /api/actions          List actions
POST   /api/actions          Create action
GET    /api/actions/suggestions   Get suggestions
PATCH  /api/actions/:id/approve   Approve
```

### Organizations

```
POST   /api/organizations    Create org
GET    /api/organizations/:id/persona-context   Get persona knowledge
```

### Flow

```
POST   /api/flow/execute     Execute action
POST   /api/flow/approve    Human approval
```

## Environment

```bash
MONGODB_URI=mongodb://localhost:27017/hojai_flow
REDIS_URL=redis://localhost:6379
LIVEKIT_URL=http://localhost:7880
WORKFLOW_URL=http://localhost:4045
VOICE_URL=http://localhost:4033
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
npm start
```
