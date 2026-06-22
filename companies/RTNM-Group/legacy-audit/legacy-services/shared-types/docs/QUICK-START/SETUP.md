# Quick Start Guide - Basic Setup

> **Get all QR systems running in under 15 minutes**

---

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Git installed
- Supabase account (free tier works)
- MongoDB Atlas account (for merchant backend) - optional

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/ReZ-Full-App.git
cd ReZ-Full-App
```

---

## Step 2: Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

---

## Step 3: Configure Environment Variables

Create a `.env` file in the root with:

```env
# Supabase (Required for all apps)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ReZ Services (if running locally)
REZ_AUTH_URL=http://localhost:3001
REZ_WALLET_URL=http://localhost:3002
REZ_PAYMENT_URL=http://localhost:3003
REZ_MERCHANT_URL=http://localhost:3004
INTENT_GRAPH_URL=http://localhost:3005

# Internal (for service-to-service auth)
INTERNAL_SERVICE_TOKEN=your-secure-token
```

---

## Step 4: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Wait for the database to be ready (2-3 minutes)
3. Go to SQL Editor
4. Run the migration files from each app's `supabase/migrations/` folder

For AdBazaar specifically:
```sql
-- Run supabase/migrations/001_initial.sql
-- Run supabase/migrations/002_attribution_tracking.sql
```

---

## Step 5: Start Development Servers

### Option A: All Apps at Once

```bash
# Start all apps concurrently
npm run dev:all
```

### Option B: Individual Apps

**Rez Now (Room QR + Profiles):**
```bash
cd rez-now
npm run dev
# Opens at http://localhost:3000
```

**Hotel OTA (Menu QR + Booking):**
```bash
cd "Hotel OTA"
npm run dev
# Opens at http://localhost:3001
```

**AdBazaar (Ads QR):**
```bash
cd adBazaar
npm run dev
# Opens at http://localhost:3002
```

**Merchant Backend (if using local):**
```bash
cd rez-app-merchant/admin-project/backend
npm run dev
# Runs at http://localhost:3001 (API)
```

---

## Step 6: Verify Installation

### Health Check

Run the health check script:

```bash
npx tsx scripts/health-check.ts
```

Expected output:
```
Overall Status: HEALTHY
Total Services: 10
  Healthy: 10
  Degraded: 0
  Unhealthy: 0
```

### Integration Tests

Run the QR integration tests:

```bash
npx tsx scripts/test-qr-integration.ts
```

Expected output:
```
Room QR Flow: PASS (5/5 tests)
Menu QR Flow: PASS (5/5 tests)
Rez Now Flow: PASS (4/4 tests)
Ads QR Flow:  PASS (4/4 tests)
```

---

## Step 7: Create Test Data

### Create a Test Profile

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "title": "Hotel Guest"
  }'
```

### Create a Test Campaign

```bash
curl -X POST http://localhost:3002/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale",
    "budget": 10000,
    "landingUrl": "https://example.com/sale",
    "rewards": {
      "scan": 10,
      "visit": 25
    }
  }'
```

---

## Troubleshooting

### Common Issues

**Supabase connection error:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check if Supabase project is running
- Verify API key has correct permissions

**Port already in use:**
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

**Missing environment variables:**
- Copy `.env.example` to `.env` and fill in values
- Restart the dev server after adding variables

---

## Next Steps

| Task | Guide |
|------|-------|
| Set up Room QR | [Room QR Guide](./ROOM-QR.md) |
| Set up Menu QR | [Menu QR Guide](./MENU-QR.md) |
| Set up Rez Now | [Rez Now Guide](./REZ-NOW.md) |
| Set up Ads QR | [Ads QR Guide](./ADS-QR.md) |
| Run tests | [Testing Guide](./TESTING.md) |

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start all apps
npm run dev:rez-now           # Start rez-now only
npm run dev:hotel             # Start Hotel OTA only
npm run dev:adbazaar          # Start AdBazaar only

# Testing
npx tsx scripts/health-check.ts          # Health check
npx tsx scripts/test-qr-integration.ts   # Integration tests

# Database
npx supabase db reset          # Reset local DB
npx supabase db push          # Push schema changes

# Build
npm run build                  # Build all apps
npm run build --workspace=rez-now   # Build specific app
```

---

**Ready to go?** Jump to [Room QR Setup](./ROOM-QR.md) to start.
