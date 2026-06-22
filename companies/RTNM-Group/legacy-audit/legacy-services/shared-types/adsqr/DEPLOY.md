# AdsQr — Deploy to Vercel

## Prerequisites

1. Vercel account
2. Supabase project created

## Quick Deploy

```bash
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/adsqr

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | `https://adsqr.vercel.app` |

## Database Setup

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Run `supabase/migrations/001_initial_schema.sql`
4. Run `supabase/migrations/002_attribution_tracking.sql`

## Domain Setup (Optional)

1. Go to Vercel Dashboard
2. Settings → Domains
3. Add `adsqr.yourdomain.com`
4. Update DNS records

## Post-Deploy Checklist

- [ ] Test scan endpoint
- [ ] Verify Supabase connection
- [ ] Check cron jobs configured
- [ ] Monitor for errors in Vercel Analytics

## Rollback

```bash
vercel rollback
```
