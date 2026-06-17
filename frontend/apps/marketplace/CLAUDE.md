# Marketplace - Workflow & Knowledge Marketplace

**Version:** 1.0.0  
**Last Updated:** June 16, 2026  
**Status:** Ready for Development

---

## Overview

The RTMN Marketplace is a unified platform for browsing and installing:
- **Workflows** - Automation workflows for various industries
- **Knowledge Packs** - Guides, templates, and best practices

---

## Structure

```
marketplace/
├── app/
│   ├── layout.tsx          # Root layout with header/footer
│   ├── page.tsx            # Home page with featured items
│   ├── globals.css         # Tailwind CSS variables
│   ├── workflows/
│   │   ├── page.tsx        # Workflow marketplace listing
│   │   ├── [id]/page.tsx   # Workflow detail page
│   │   └── install/page.tsx # Install workflow page
│   ├── knowledge/
│   │   ├── page.tsx        # Knowledge pack listing
│   │   ├── [id]/page.tsx  # Knowledge detail page
│   │   └── install/page.tsx # Install knowledge page
│   └── reviews/
│       └── page.tsx        # User's reviews
├── components/
│   ├── WorkflowCard.tsx    # Workflow display card
│   ├── KnowledgeCard.tsx   # Knowledge pack card
│   ├── CategoryFilter.tsx  # Category/Industry filters
│   └── Rating.tsx          # Star rating component
├── lib/
│   ├── api.ts              # API client with mock data
│   └── types.ts            # TypeScript interfaces
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Running the App

```bash
cd frontend/apps/marketplace
npm install
npm run dev
# Runs on http://localhost:3018
```

---

## Features

### Workflow Marketplace
- Browse workflows by category (Automation, Integration, Reporting, etc.)
- Filter by industry (Restaurant, Hotel, Healthcare, etc.)
- Sort by popularity, rating, newest, price
- One-click install for free workflows
- View workflow steps, integrations, and reviews

### Knowledge Marketplace
- Browse knowledge packs by category (Guides, Templates, Compliance, etc.)
- Filter by industry
- Download free knowledge packs
- View included documents, sources, and reviews

### Reviews
- View your submitted reviews
- Edit or delete reviews
- Track helpful votes and author responses

---

## API Integration

The app uses mock data from `lib/api.ts`. To connect to the real backend:

1. Update `API_BASE` in `lib/api.ts`:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://rtmn-api.onrender.com';
```

2. Replace mock functions with actual API calls:
```typescript
export async function getWorkflows(filters?: MarketplaceFilters): Promise<Workflow[]> {
  const response = await fetch(`${API_BASE}/api/marketplace/workflows`);
  return response.json();
}
```

---

## Design System

### Colors
- Primary: `hsl(var(--primary))` - Blue (#3B82F6)
- Secondary: `hsl(var(--secondary))` - For knowledge items
- Success: `hsl(var(--success))` - Green
- Warning: `hsl(var(--warning))` - Yellow

### Icons
Uses Lucide React icons throughout the app.

---

## Dependencies

- **next**: 14.2.0
- **react**: 18.2.0
- **tailwindcss**: 3.4.1
- **lucide-react**: 0.356.0
- **@tanstack/react-query**: 5.28.0 (for future API integration)
