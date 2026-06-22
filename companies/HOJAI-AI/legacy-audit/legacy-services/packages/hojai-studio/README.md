# @hojai/studio

**HOJAI AI Studio - No-code builder for AI employees**

---

## Overview

Create AI employees, teams, and configure Company DNA without code.

## Features

- AI Employee templates
- Company DNA configurator
- Team builder
- Workflow templates
- No-code creation

## Quick Start

```bash
npm install @hojai/studio
npm run dev
```

## AI Employee Templates

| Template | Role | Industry | Rating |
|----------|------|----------|--------|
| AI SDR | Sales Development | SaaS | 4.8 ⭐ |
| AI AE | Account Executive | SaaS | 4.9 ⭐ |
| AI Support | Customer Support | General | 4.7 ⭐ |

## Company DNA

Configure your AI's personality:

```typescript
await studio.dna.configure({
  culture: 'aggressive',
  communication: 'formal',
  sales: { philosophy: 'consultative' },
  risk: { appetite: 'medium' }
});
```

## Create AI Employee

```typescript
// From template
const employee = await studio.employees.createFromTemplate({
  templateId: 'tmpl_sdr',
  name: 'My AI SDR',
  department: 'Sales'
});

// Activate
await studio.employees.activate(employee.instanceId);
```

## Create Team

```typescript
const team = await studio.teams.create({
  teamTemplateId: 'sales_team',
  name: 'Sales Team A',
  department: 'Sales'
});
```

---

**Port:** 4840
**Status:** Production Ready
