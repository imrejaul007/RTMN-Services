# RTMN Pilot Portal - Frontend

**Deploy:** Vercel  
**Backend:** Render

## Local Dev

```bash
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

## Architecture

```
frontend/ (Vercel)
├── app/
│   ├── layout.tsx          # Root layout, fonts, providers
│   ├── page.tsx            # Landing + services catalog
│   ├── auth/
│   │   └── page.tsx        # Signup / login
│   ├── dashboard/
│   │   └── page.tsx        # Client dashboard
│   └── api/
│       └── health/route.ts # Frontend health check
├── components/
│   ├── Navbar.tsx
│   ├── ServiceCard.tsx
│   └── ...
└── lib/
    ├── api.ts              # API client (fetch wrapper)
    ├── types.ts            # Shared types
    └── auth.ts             # Auth helpers
```

## Deployment

### Vercel (Frontend)

```bash
npm i -g vercel
vercel
# Or: Import GitHub repo → Vercel dashboard
```

Set environment variable: `NEXT_PUBLIC_API_URL` → your Render backend URL.

### Render (Backend)

```bash
# Or use render.yaml
vercel.app → Import → render.yaml
```

Set environment variables from `.env.example` (services/pilot-onboarding/).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page + 24-industry service catalog |
| `/auth` | Signup / Login |
| `/dashboard` | Client dashboard (requires auth) |
| `/api/health` | Health check proxy |
