# LawGens Web Applications

**Version:** 2.0.0 | **Date:** June 7, 2026

---

## Overview

LawGens has 3 web applications serving different user segments:

| App | Port | Purpose | Target Users |
|-----|------|---------|--------------|
| **lawgens-web** | 3001 | Marketing + SaaS Platform | General users, businesses |
| **lawgens-biz** | 3002 | Business Legal Services | Small businesses, startups |
| **lawgens-pro** | 3003 | Professional Dashboard | Lawyers, legal professionals |

---

## lawgens-web (Main SaaS Platform)

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with features, pricing |
| `/login` | User authentication |
| `/signup` | New user registration |
| `/dashboard` | User dashboard with stats |
| `/contracts` | Contract management |
| `/cases/search` | Court case search |

### Features

- Hero section with CTA
- Feature grid (6 features)
- Pricing tiers (Starter, Professional, Enterprise)
- Email capture for leads
- Authentication (Login/Signup)
- User dashboard with:
  - Contract stats
  - Court case tracking
  - Compliance status
  - Quick actions

### API Integration

```typescript
// Client-side API at src/lib/api.ts
import { api, integrationApi } from '@/lib/api';

// Login
await api.login(email, password);

// Analyze contract
const result = await api.analyzeContract(text, 'NDA');

// Search cases
const cases = await api.searchCases('copyright', { court: 'Delhi High Court' });

// Onboard user (via integration service)
await integrationApi.onboardUser({ userId, email, name, plan });
```

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:5099
NEXT_PUBLIC_INTEGRATION_URL=http://localhost:5098
```

---

## lawgens-biz (Business Legal Services)

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Business services landing |
| `/pricing` | Business pricing |
| `/services/incorporation` | Company registration |
| `/services/trademark` | Trademark filing |
| `/services/gst` | GST compliance |

### Services Offered

| Service | Price | Description |
|---------|-------|-------------|
| Company Incorporation | ₹9,999 | Private Ltd, LLP, OPC |
| Trademark Registration | ₹4,999 | Search, application, filing |
| GST Compliance | ₹1,999/mo | Monthly filing, returns |
| Contract Drafting | ₹2,999 | Custom contracts |
| Compliance Calendar | ₹999/mo | Annual reminders |
| Legal Opinion | ₹5,999 | Expert legal advice |

---

## lawgens-pro (Professional Dashboard)

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Professional dashboard |
| `/cases` | Case management |
| `/clients` | Client management |
| `/billing` | Billing & invoicing |
| `/calendar` | Schedule & reminders |

### Features

- Case Manager (track deadlines, clients)
- Contract Builder (AI-assisted generation)
- Court Research (judgment search)
- Billing & Invoicing (time tracking, invoices)
- Client Portal (secure document sharing)
- Calendar & Reminders (hearing dates)

---

## Running Apps

### Development

```bash
cd apps/lawgens-web
npm install
npm run dev  # Starts on port 3001

cd apps/lawgens-biz
npm run dev  # Starts on port 3002

cd apps/lawgens-pro
npm run dev  # Starts on port 3003
```

### Production

```bash
# Build all apps
npm run build --workspace=apps/lawgens-web
npm run build --workspace=apps/lawgens-biz
npm run build --workspace=apps/lawgens-pro

# Or use docker-compose
docker-compose up -d
```

---

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** React hooks (useState, useEffect)
- **Routing:** Next.js App Router

---

## Structure

```
apps/
├── lawgens-web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── login/page.tsx       # Login
│   │   │   ├── signup/page.tsx      # Signup
│   │   │   ├── dashboard/page.tsx   # Dashboard
│   │   │   ├── contracts/page.tsx   # Contracts
│   │   │   └── cases/search/page.tsx # Case search
│   │   ├── lib/
│   │   │   └── api.ts               # API client
│   │   └── components/
│   └── package.json
├── lawgens-biz/
│   └── src/
│       └── app/
│           └── page.tsx             # Business landing
└── lawgens-pro/
    └── src/
        └── app/
            └── page.tsx             # Professional dashboard
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
# In apps/lawgens-web/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## Environment Configuration

### Development (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5099
NEXT_PUBLIC_INTEGRATION_URL=http://localhost:5098
```

### Production
```bash
NEXT_PUBLIC_API_URL=https://api.lawgens.app
NEXT_PUBLIC_INTEGRATION_URL=https://api.lawgens.app/integration
```

---

## Components

### Shared Components (to be added)

- `Button` - Reusable button component
- `Card` - Content card
- `Modal` - Dialog/modal
- `Form` - Form inputs
- `Table` - Data table

### Example Usage

```tsx
import { api } from '@/lib/api';

// In page component
const handleSubmit = async () => {
  const result = await api.analyzeContract(contractText, 'NDA');
  console.log(result);
};
```

---

## Testing

```bash
# Run tests
npm run test --workspace=apps/lawgens-web

# Run with coverage
npm run test:coverage --workspace=apps/lawgens-web
```

---

## Support

- Email: support@lawgens.app
- Documentation: https://docs.lawgens.app