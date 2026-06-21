# NeXha Portal

> **Version:** 1.0.0
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4

The NeXha B2B portal. Provides sign-in, business registration, guest
onboarding (no GST), reputation viewing, and guest-to-supplier upgrade.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create the env file
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Run the dev server
npm run dev
# Open http://localhost:3000
```

The portal expects a running `commerce-identity` backend (port 8000 by
default). See [../RUNBOOK.md](../RUNBOOK.md) for the full local stack.

---

## Routes

11 App-Router routes. See [../CLAUDE.md § 3. portal](../CLAUDE.md#3-portal-port-3000)
for the full table.

| Route | Auth |
|-------|------|
| `/` | public |
| `/login`, `/onboard-guest`, `/onboard-supplier` | public (write) |
| `/dashboard`, `/profile`, `/products`, `/rfqs`, `/ratings` | required |
| `/upgrade` | guest only |

---

## Auth model

Browser sessions use **httpOnly cookies** set by the backend on
`/api/auth/login`, `/api/auth/register`, and `/api/auth/guest-token`.
The portal's API client uses `credentials: 'include'` and never reads or
writes `localStorage`. Sign-out calls `/api/auth/logout`.

For server-to-server callers, `Authorization: Bearer <token>` continues
to work on the backend.

---

## Build / deploy

```bash
# Local type-check
npx tsc --noEmit

# Production build
npm run build
# Output: standalone server in .next/standalone

# Docker
docker build -t nexha-portal .
```

Production deploy is to Vercel:

1. Import the `portal/` directory from GitHub
2. Framework preset: Next.js (auto-detected)
3. Set `NEXT_PUBLIC_API_URL` env var to the Render URL of
   `nexha-commerce-identity`
4. Deploy

The `Dockerfile` is provided for non-Vercel deploys (Render, Fly.io, etc.).

---

## Layout

```
portal/
├── app/                  # 11 App-Router routes
│   ├── page.tsx          # landing
│   ├── login/
│   ├── onboard-guest/
│   ├── onboard-supplier/
│   ├── dashboard/
│   ├── profile/
│   ├── products/
│   ├── rfqs/
│   ├── ratings/
│   └── upgrade/
├── lib/
│   └── api.ts            # typed API client (credentials: 'include')
├── public/               # static assets
├── package.json
├── next.config.ts        # output: 'standalone'
├── tsconfig.json
├── tailwind (via globals.css + @theme)
├── Dockerfile
├── .env.example
├── .gitignore
├── AGENTS.md             # agent rules (Next 16 compat warning)
├── CLAUDE.md
└── README.md             # this file
```

---

## Known limitations

- `/products` and `/rfqs` are UI shells. The real product catalog and RFQ
  endpoints live in the full NeXha monorepo (`RTNM-Group/nexha`,
  `procurement-os` and `distribution-os` services).
- The login page accepts `corpId` directly; the production flow is to
  use the email-based password reset (not in L1; planned for Phase 7+).

---

*Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
