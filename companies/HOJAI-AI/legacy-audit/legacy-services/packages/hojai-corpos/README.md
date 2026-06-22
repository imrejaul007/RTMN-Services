# @hojai/corpos

**HOJAI CorpOS - Human + AI Organization Dashboard**

---

## Overview

Command center for managing human and AI employees together.

## Features

- Org Chart (Human + AI)
- Department Management
- AI Employee Dashboard
- Workflow Monitoring
- Alert System
- Unified Organization View

## Quick Start

```bash
npm install @hojai/corpos
npm run dev
```

## Org Chart

```typescript
// Get full org chart
const org = await corpos.getOrgChart();

// Human + AI employees
const humans = await corpos.humans.list();
const ais = await corpos.ai.list();

// Department breakdown
const depts = await corpos.departments.list();
```

---

**Port:** 4850
**Status:** Production Ready
