# HOJAI Studio UI

> **Status:** ✅ Built (2026-06-25)
> **Next.js:** 14.2.5
> **Port:** 3000

The HOJAI Studio web UI — the founder-facing interface for creating AI-native companies.

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page — marketing + CTA |
| `/wizard` | 5-step wizard: idea → questions → blueprint → generate → success |
| `/dashboard` | Project list + management |

## Architecture

```
app/
├── page.tsx           # Landing page
├── wizard/page.tsx    # Company creation wizard
├── dashboard/page.tsx # Project management
└── globals.css       # Tailwind + CSS variables

lib/
├── api.ts             # API clients for backend services
└── store.ts           # Zustand store for wizard state

types/
└── index.ts           # TypeScript interfaces

components/             # (extensible)
```

## Running

```bash
cd products/ai-studio-ui
npm install
npm run dev        # → http://localhost:3000
```

## Environment Variables

```env
NEXT_PUBLIC_AI_ARCHITECT_URL=http://localhost:4390
NEXT_PUBLIC_BLUEPRINT_COMPILER_URL=http://localhost:4391
NEXT_PUBLIC_HOJAI_CLOUD_URL=http://localhost:4380
```

## Wizard Flow

1. **Idea** → Founder types company idea
2. **Questions** → 12 questions via AI Architect API
3. **Blueprint** → Review generated blueprint
4. **Generating** → Compile + deploy via Blueprint Compiler
5. **Success** → Show deployed URL + next steps

## Backend Services Required

| Service | Port | Purpose |
|---------|------|---------|
| **AI Architect** | 4390 | Interview + blueprint generation |
| **Blueprint Compiler** | 4391 | Template rendering + file generation |
| **HOJAI Cloud** | 4380 | Deployment target |
