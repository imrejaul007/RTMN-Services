# CompanyOS Studio

Web UI for creating companies with CompanyOS.

## Quick Start

```bash
cd studio
npm install
npm run dev
```

Opens at: http://localhost:5173

## Features

- **Industry Selection** - Choose from 8+ industries
- **Department Configuration** - Select departments to install
- **AI Worker Setup** - Configure AI workers per department
- **Review & Create** - Review and create company

## Architecture

```
┌─────────────────────────────────────────┐
│         CompanyOS Studio (React)        │
│                                         │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ │
│  │Industry │ │Department│ │   AI    │ │
│  │Selector │ │Selector  │ │Workers  │ │
│  └────┬────┘ └────┬─────┘ └───┬────┘ │
│       └────────────┼───────────┘        │
│                    ▼                    │
│         ┌──────────────────┐          │
│         │  Review & Create │          │
│         └────────┬─────────┘          │
└────────────────────┼──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  CompanyOS Control   │
        │    Plane (Port 4010) │
        └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Composition Engine │
        │   + Department Packs │
        │   + REZ Connectors   │
        └──────────────────────┘
```

## API Client

Uses `src/lib/api.ts` to communicate with Control Plane:

```typescript
import { api } from './lib/api';

// Create a company
const result = await api.createCompany({
  name: 'My Restaurant',
  industry: 'restaurant',
  departments: ['finance', 'hr', 'marketing'],
  ai_departments: {
    finance: { enabled: true, head: 'ai-cfo' },
  },
});
```

## Environment Variables

```bash
VITE_API_URL=http://localhost:4010
```

## Build for Production

```bash
npm run build
npm run preview
```

Output: `dist/` folder
