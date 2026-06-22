# ReZ Mind Deployment - Using Hotel OTA's Database

Since Hotel OTA already has the Intent Graph models in its database, ReZ Mind can share the same database!

## Option 1: Connect to Hotel OTA's Existing Database

### Find Hotel OTA's Database URL

Check Hotel OTA's environment:
```bash
# Check Hotel OTA env
cat Hotel\ OTA/apps/api/.env
# or
cat Hotel\ OTA/.env
```

Look for `DATABASE_URL`:
```
DATABASE_URL="postgresql://user:pass@host:5432/hotel_ota"
```

### Deploy ReZ Mind with Shared Database

```bash
cd packages/rez-intent-graph

# Set the same DATABASE_URL as Hotel OTA
export DATABASE_URL="postgresql://user:pass@host:5432/hotel_ota"

# Generate Prisma Client (using Hotel OTA's schema)
npx prisma generate --schema=../../Hotel\ OTA/packages/database/prisma/schema.prisma

# Run migrations (adds MerchantKnowledge table if not exists)
npx prisma migrate deploy

# Build and start
npm run build && npm run start
```

---

## Option 2: Add to Hotel OTA Package Directly

Since Hotel OTA already has the database package, you can integrate ReZ Mind directly:

### 1. Install @rez/intent-graph in Hotel OTA

```bash
cd Hotel\ OTA/apps/api
npm install @rez/intent-graph
```

### 2. Import and Use

```typescript
// In Hotel OTA API routes
import { intentCaptureService, autonomousChatService } from '@rez/intent-graph';

// Use intent capture
await intentCaptureService.captureHotelSearch({
  userId: req.user.userId,
  city: 'Mumbai',
  checkin: '2024-04-01',
  checkout: '2024-04-05'
});

// Use autonomous chat
const response = await autonomousChatService.processMessage({
  userId: req.user.userId,
  merchantId: hotel.merchantId,
  message: "What's on the menu?"
});
```

### 3. Run Migrations

```bash
cd Hotel\ OTA
npx prisma generate
npx prisma migrate deploy
```

---

## Option 3: ReZ Mind as Separate Service (Recommended)

For production, keep ReZ Mind as a separate service but connect to Hotel OTA's database:

### Architecture

```
┌─────────────────────────────────────────────┐
│            Hotel OTA Database               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Users  │  │ Intents  │  │ Orders  │  │
│  │ Hotels  │  │ Signals  │  │ Bookings│  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
        ↑                    ↑
        │                    │
   Hotel OTA API      ReZ Mind API
        │                    │
        └──┬─────────────────┘
           │
        Same Database
```

### Deploy ReZ Mind

```bash
# Set DATABASE_URL to Hotel OTA's database
export DATABASE_URL="postgresql://user:pass@host:5432/hotel_ota"

# Deploy
./scripts/deploy-rez-mind.sh
```

---

## Database Models Available

Hotel OTA's database now includes:

| Model | Purpose |
|-------|---------|
| `Intent` | User purchase intents |
| `IntentSignal` | Individual events |
| `DormantIntent` | Cold intents for revival |
| `IntentSequence` | Event order tracking |
| `CrossAppIntentProfile` | Cross-app user profiles |
| `Nudge` | Revive messages |
| `MerchantKnowledge` | Merchant knowledge base |

---

## Environment Variables

For Hotel OTA's database:

```env
# Use Hotel OTA's database
DATABASE_URL="postgresql://postgres:password@localhost:5432/hotel_ota"

# Optional: Redis for shared memory
REDIS_URL="redis://localhost:6379"
```

---

## Quick Deploy Command

```bash
# Assuming Hotel OTA runs on localhost:5432
cd packages/rez-intent-graph

export DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/hotel_ota"
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start
```

Server will be available at **http://localhost:3005**
