# Contributing to NextaBizz

## Quick Start

```bash
git clone git@github.com:imrejaul007/nextabizz.git
cd nextabizz
corepack enable
pnpm install
pnpm build
```

## Repository Structure

```
apps/
  web/              # Merchant-facing dashboard (Next.js)
  supplier-portal/  # Supplier-facing portal (Next.js)
packages/
  shared-types/     # Canonical TypeScript types + Zod schemas
  webhook-sdk/       # Webhook verification + handlers
  rez-auth-client/  # REZ Auth SSO integration
services/
  reorder-engine/   # Signal → ReorderSignal processor
  scoring-engine/   # Supplier score calculator
  payment-settlement/ # B2B payment flows
supabase/
  migrations/       # Postgres schema
  seed.sql          # Seed data
```

## Build

```bash
pnpm build        # Build all packages
pnpm dev          # Dev mode all packages
pnpm lint         # Lint all packages
```

## Type Checking

```bash
cd packages/shared-types && pnpm build
cd packages/webhook-sdk && pnpm build
# ... then build apps
```

## Adding a New Package

1. Create the package under `packages/` or `services/`
2. Add it to `pnpm-workspace.yaml`
3. Add it to `turbo.json` `pipeline.build.inputs`
4. If it uses workspace packages, add them as `peerDependencies` in its package.json

## Environment Variables

Copy `.env.example` to `.env.local` in the relevant app directory.

## Adding Types

All canonical types live in `packages/shared-types/src/entities/`.
Each entity should have:
- TypeScript interface
- Zod schema (`EntityNameSchema`)
- `z.infer<>` type export

Event schemas live in `packages/shared-types/src/events/`.

## API Conventions

- All API routes use Next.js App Router handlers
- Request validation via Zod schemas from shared-types
- Webhook endpoints verify HMAC-SHA256 signatures before processing

## Database Migrations

Add new migrations to `supabase/migrations/` following the naming convention `XXX_description.sql`.

Apply locally with:
```bash
supabase db push
```

## Webhook Integration

Webhook SDK lives in `packages/webhook-sdk/src/`. To add a new source:
1. Define payload schema in `packages/shared-types/src/events/`
2. Create handler in `packages/webhook-sdk/src/handlers/`
3. Create route handler in `apps/web/api/webhooks/{source}/route.ts`

## Tech Stack

- **Apps:** Next.js 15, TypeScript, Tailwind CSS v4
- **Packages:** TypeScript, Zod
- **Services:** Node.js, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Monorepo:** Turborepo, pnpm workspaces
- **Auth:** REZ Auth (service-to-service SSO)
