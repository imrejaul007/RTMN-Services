# ReZ Mind - MongoDB Deployment Guide

## MongoDB Connection Strings

**IMPORTANT:** ReZ ecosystem uses MongoDB (NOT PostgreSQL). There are two MongoDB databases:

| Database | Purpose | Connection String |
|----------|---------|-------------------|
| **rez-app** | All ReZ apps | `mongodb+srv://work_db_user:RmptskyDLFNSJGCA@cluster0.ku78x6g.mongodb.net/rez-app` |
| **rez-hotel-pms** | Hotel PMS | `mongodb+srv://work_db_user:KWQ5Te51URo9hPtq@rez-hotel-pms.xlr3tsy.mongodb.net/rez-hotel-pms` |

---

## Intent Graph Collections (add to rez-app database)

### Core Collections

Mongoose auto-generates collection names as lowercase pluralized model names:

| Collection | Model | Purpose |
|-----------|-------|---------|
| `intents` | Intent | User purchase intents with signals |
| `intentsequences` | IntentSequence | Event sequences leading to intents |
| `dormantintents` | DormantIntent | Dormant intent tracking |
| `crossappintentprofiles` | CrossAppIntentProfile | Cross-app user profiles |
| `nudges` | Nudge | Nudge delivery tracking |
| `nudgeschedules` | NudgeSchedule | User nudge preferences |
| `merchantknowledge` | MerchantKnowledge | Merchant knowledge base |
| `merchantdemandsignals` | MerchantDemandSignal | Merchant demand aggregation |

---

## Environment Variables

Create `.env` file in `packages/rez-intent-graph/`:

```env
# MongoDB Connection (ReZ ecosystem database)
MONGODB_URI=mongodb+srv://work_db_user:RmptskyDLFNSJGCA@cluster0.ku78x6g.mongodb.net/rez-app

# Server
PORT=3005
NODE_ENV=production

# Optional: Redis for session/queue
REDIS_URL=redis://localhost:6379
```

---

## Build & Deploy

### 1. Install Dependencies

```bash
cd packages/rez-intent-graph
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Create MongoDB Indexes

Run the following in MongoDB shell or use mongoose.syncIndexes():

```javascript
// Connect to rez-app database
db.intents.createIndex({ userId: 1, appType: 1, intentKey: 1 }, { unique: true });
db.intents.createIndex({ userId: 1, status: 1 });
db.intents.createIndex({ status: 1, lastSeenAt: 1 });
db.intents.createIndex({ category: 1, status: 1 });
db.intents.createIndex({ appType: 1, category: 1 });
db.intents.createIndex({ merchantId: 1, category: 1 });

// Dormant intents
db.dormantintents.createIndex({ userId: 1, appType: 1, intentKey: 1 }, { unique: true });
db.dormantintents.createIndex({ userId: 1, status: 1 });
db.dormantintents.createIndex({ status: 1, revivalScore: 1 });
db.dormantintents.createIndex({ idealRevivalAt: 1 }, { sparse: true });

// Cross-app profiles
db.crossappintentprofiles.createIndex({ userId: 1 }, { unique: true });

// Nudges
db.nudges.createIndex({ dormantIntentId: 1 });

// Nudge schedules
db.nudgeschedules.createIndex({ userId: 1, active: 1 });

// Merchant knowledge
db.merchantknowledge.createIndex({ merchantId: 1, active: 1 });
db.merchantknowledge.createIndex({ title: "text", content: "text", tags: "text" });

// Merchant demand signals
db.merchantdemandsignals.createIndex({ merchantId: 1, category: 1 }, { unique: true });
db.merchantdemandsignals.createIndex({ category: 1, demandCount: -1 });
```

### 4. Start Server

```bash
npm start
# Or with PM2:
pm2 start dist/server/server.js --name rez-mind
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3005
ENV MONGODB_URI=mongodb+srv://work_db_user:RmptskyDLFNSJGCA@cluster0.ku78x6g.mongodb.net/rez-app

EXPOSE 3005

CMD ["npm", "start"]
```

### Build & Run

```bash
docker build -t rez-mind:latest -f Dockerfile .
docker run -d -p 3005:3005 --env-file .env rez-mind:latest
```

---

## Health Check

```bash
curl http://localhost:3005/health

# Response:
{
  "status": "healthy",
  "service": "intent-graph",
  "mongodb": "connected",
  "timestamp": "2026-04-27T00:00:00.000Z"
}
```

---

## API Endpoints

### Intent Capture

```bash
# Capture intent
curl -X POST http://localhost:3005/api/intent/capture \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "appType": "hotel_ota",
    "eventType": "search",
    "category": "TRAVEL",
    "intentKey": "hotel_mumbai_weekend",
    "intentQuery": "hotels in mumbai for weekend",
    "metadata": {"city": "Mumbai", "dates": "Apr 28-30"}
  }'
```

### User Intents

```bash
# Get active intents
curl http://localhost:3005/api/intent/user/user123

# Get dormant intents
curl http://localhost:3005/api/intent/user/user123/dormant
```

---

## Integration with Apps

All ReZ apps should send intent data to:

```
POST http://localhost:3005/api/intent/capture
```

Each app's intent capture service should map its events to the intent graph.

---

## Production Checklist

- [x] MongoDB connection configured
- [ ] MongoDB indexes created
- [ ] Environment variables set
- [ ] Health check verified
- [ ] Load balancer configured (for multiple instances)
- [ ] SSL/TLS termination
- [ ] Logging aggregated
- [ ] Monitoring enabled
