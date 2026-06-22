# Deployment Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account
- Vercel account (for deployment)
- GitHub account (for CI/CD)

---

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Note your project URL and keys from Settings > API

### Run Database Migrations

```bash
# Connect to your Supabase project
# Run migrations using the Supabase CLI or SQL Editor
# Location: supabase/migrations/
```

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 2. Vercel Deployment

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Connect your GitHub repository
2. Add environment variables from `.env.example`
3. Deploy

### Option B: CLI Deployment

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Required Vercel Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Yes |
| `VERCEL_TOKEN` | Vercel API token (for CI/CD) | CI/CD only |

### Health Check Endpoint

After deployment, verify with:
```
GET https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "supabase": { "status": "pass", "latency": 45 },
    "environment": { "status": "pass" }
  }
}
```

---

## 3. GitHub Actions CI/CD

### Required Secrets

Add these in GitHub > Settings > Secrets and Variables > Actions:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Getting Vercel Credentials

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Link project
cd apps/web
vercel link

# Get credentials
vercel tokens list
vercel projects ls
```

### Workflow Triggers

| Branch | Action |
|--------|--------|
| `main` | Deploy to production |
| `develop` | Deploy to staging |
| `pull_request` | Deploy preview |

---

## 4. Webhook Configuration

### RestoPapa Webhooks

Configure in RestoPapa dashboard:
```
Webhook URL: https://your-app.vercel.app/api/webhooks/restopapa
Events: inventory.signal.received
```

### Hotel PMS Webhooks

Configure in Hotel PMS settings:
```
Webhook URL: https://your-app.vercel.app/api/webhooks/hotel-pms
Events: inventory.signal.received
```

### ReZ Merchant Webhooks

Configure in ReZ Merchant portal:
```
Webhook URL: https://your-app.vercel.app/api/webhooks/rez-merchant
Events: inventory.signal.received
```

---

## 5. Domain Configuration

### Vercel Domain Setup

1. Go to Vercel Dashboard > Domains
2. Add your domain (e.g., `app.nextabizz.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate

### Recommended DNS Records

```
# A Record
A @ 76.76.21.21

# CNAME
CNAME www is alias for cname.vercel-dns.com

# TXT for verification
TXT vercel-domain-verification=your-verification-code
```

---

## 6. Post-Deployment Checklist

- [ ] Health check returns `status: "healthy"`
- [ ] All webhooks are receiving signals
- [ ] Authentication is working
- [ ] Database migrations have run
- [ ] Monitoring is configured (Sentry)
- [ ] Error alerts are set up
- [ ] SSL certificate is active
- [ ] Mobile apps can connect to API

---

## 7. Troubleshooting

### Build Failures

```bash
# Clear Vercel cache
vercel rm --safe --yes
vercel deploy --prod
```

### Database Connection Issues

1. Check Supabase project status
2. Verify environment variables
3. Check IP allowlist in Supabase

### Webhook Not Receiving

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Vercel function logs

### Authentication Issues

1. Verify JWT_SECRET is set
2. Check Supabase URL is correct
3. Clear browser cookies

---

## 8. Scaling Considerations

### Vercel Pro/Enterprise

For production traffic:
- Upgrade to Vercel Pro ($20/month)
- Configure auto-scaling
- Add CDN caching

### Database

For high traffic:
- Enable Supabase Pro
- Configure connection pooling
- Set up read replicas

### Monitoring

Add these services:
- [Sentry](https://sentry.io) - Error tracking
- [Better Uptime](https://betteruptime.com) - Uptime monitoring
- [Datadog](https://datadog.com) - APM (optional)

---

## 9. Security Checklist

Before going live:

- [ ] All secrets are environment variables (not in code)
- [ ] Supabase RLS policies are configured
- [ ] Webhook signatures are being verified
- [ ] Rate limiting is enabled
- [ ] CORS is configured for your domains
- [ ] SSL/TLS is enforced
- [ ] Security headers are set
- [ ] Dependencies are up to date
- [ ] No debug logs in production

---

## 10. Support

For deployment issues:
1. Check Vercel Function logs
2. Check GitHub Actions logs
3. Verify environment variables
4. Contact: your-email@example.com
