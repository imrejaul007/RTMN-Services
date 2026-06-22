# Migration to Shared Database

## Goal
All ReZ ecosystem apps share ONE database called `rez_ecosystem`.

## Current Databases

| App | Current DB |
|-----|------------|
| Hotel OTA | hotel_ota |
| Rendez | rendez_dev |
| Resturistan | restauranthub |

## New Shared Database

```
Database: rez_ecosystem
Host: (same as Hotel OTA)
User: ota_user (or create new user)
```

## Steps

### 1. Create Shared Database

```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create shared database
CREATE DATABASE rez_ecosystem;

-- Grant access
GRANT ALL PRIVILEGES ON DATABASE rez_ecosystem TO ota_user;
```

### 2. Generate Prisma Client with Hotel OTA Schema

```bash
cd packages/rez-intent-graph

# Use Hotel OTA's schema (most complete)
export DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"

# Generate Prisma client
npx prisma generate --schema=../../Hotel\ OTA/packages/database/prisma/schema.prisma

# Run migrations
npx prisma migrate deploy
```

### 3. Update All Apps to Use Shared Database

#### Hotel OTA
```bash
# Update .env
DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"
```

#### Rendez
```bash
# Update .env
DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"
```

#### Resturistan
```bash
# Update .env
DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"
```

### 4. Deploy ReZ Mind

```bash
cd packages/rez-intent-graph
export DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"
npm run build && npm run start
```

---

## Database Schema

The shared database includes ALL models from Hotel OTA:

```
rez_ecosystem
├── Users
├── Hotels
├── Bookings
├── Orders
├── Products
├── Intents ←── RTMN Intent Graph
├── IntentSignals
├── DormantIntents
├── MerchantKnowledge
├── Nudges
└── ... all other models
```

---

## Environment Variable

All apps should use:
```env
DATABASE_URL="postgresql://ota_user:ota_password@localhost:5432/rez_ecosystem"
```
