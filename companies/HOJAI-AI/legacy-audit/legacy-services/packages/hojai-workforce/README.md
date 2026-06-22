# @hojai/workforce

**AI Employee Marketplace and Management**

---

## Overview

Manage AI employees, teams, departments, and the AI Workforce Marketplace.

## Features

- AI Employee management
- AI Teams
- AI Departments
- Workforce Marketplace
- Performance tracking
- Career levels (XP system)

## Quick Start

```bash
npm install @hojai/workforce
npm run dev
```

```typescript
import { HojaiWorkforce } from '@hojai/workforce';

const workforce = new HojaiWorkforce({
  port: 4820,
  mongodb: 'mongodb://localhost:27017/hojai-workforce'
});

await workforce.start();
```

## AI Employee Management

### Create AI Employee

```typescript
await workforce.employees.create({
  name: 'AI Sales Rep',
  role: 'SDR',
  department: 'Sales',
  skills: ['cold_email', 'lead_qualification']
});
```

### Update Metrics

```typescript
await workforce.employees.updateMetrics('ai_sdr_001', {
  metric: 'tasksCompleted',
  value: 100
});
```

## Teams

### Create Team

```typescript
await workforce.teams.create({
  name: 'Sales Team A',
  department: 'Sales',
  leadAIEmployeeId: 'ai_lead_001'
});
```

### Add Member

```typescript
await workforce.teams.addMember('team_abc', 'ai_sdr_001');
```

## Marketplace

### Browse

```typescript
const listings = await workforce.marketplace.browse({
  role: 'SDR',
  industry: 'SaaS'
});
```

### Install AI Employee

```typescript
await workforce.marketplace.install('listing_abc');
```

## Career System

| Level | Title | XP Required |
|-------|-------|------------|
| 1 | Junior | 0 |
| 2 | Mid | 1000 |
| 3 | Senior | 2000 |
| 4 | Lead | 3000 |
| 5 | Director | 4000 |

## Performance Metrics

| Metric | Description |
|--------|-------------|
| tasksCompleted | Total tasks completed |
| tasksFailed | Failed tasks |
| satisfaction | Customer satisfaction % |
| revenue | Revenue generated |
| cost | Operating cost |

---

**Port:** 4820
**Status:** Production Ready
