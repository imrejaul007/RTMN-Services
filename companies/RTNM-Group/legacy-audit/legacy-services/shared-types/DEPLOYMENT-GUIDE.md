# REZ Mind - Deployment Guide

## Quick Deploy to Render

### 1. Get Render API Key

1. Go to: https://dashboard.render.com/settings/api-keys
2. Click "Create API Key"
3. Copy the key

### 2. Set Environment Variable

```bash
export RENDER_API_KEY=your_api_key_here
```

### 3. Deploy Services

```bash
cd "/Users/rejaulkarim/Documents/ReZ Full App"

# Deploy Event Platform
cd rez-event-platform
render deploy --service=rez-event-platform --type=web --region=singapore --plan=free

# Deploy Action Engine
cd ../rez-action-engine
render deploy --service=rez-action-engine --type=web --region=singapore --plan=free

# Deploy Feedback Service
cd ../rez-feedback-service
render deploy --service=rez-feedback-service --type=web --region=singapore --plan=free

# Deploy Merchant Copilot
cd ../rez-merchant-copilot
render deploy --service=rez-merchant-copilot --type=web --region=singapore --plan=free

# Deploy Feature Flags
cd ../rez-feature-flags
render deploy --service=rez-feature-flags --type=web --region=singapore --plan=free
```

---

## Alternative: Deploy via Dashboard

### 1. Event Platform

1. Go to: https://dashboard.render.com
2. Click "New +" > "Web Service"
3. Connect GitHub: `imrejaul007/REZ-event-platform`
4. Settings:
   - Name: `rez-event-platform`
   - Region: Singapore
   - Branch: main
   - Build Command: `npm install`
   - Start Command: `npx ts-node src/index-simple.ts`
5. Environment Variables:
   - `MONGODB_URI`: `mongodb+srv://work_db_user:ZAFYAYH1zK0C74Ap@rez-intent-graph.a8ilqgi.mongodb.net/rez-events`
   - `ACTION_ENGINE_URL`: `https://rez-action-engine.onrender.com`

### 2. Action Engine

1. New > Web Service
2. Connect GitHub: `imrejaul007/REZ-action-engine`
3. Settings:
   - Name: `rez-action-engine`
   - Start Command: `npx ts-node src/index-adaptive.ts`
4. Environment Variables:
   - `MONGODB_URI`: MongoDB connection string
   - `FEEDBACK_SERVICE_URL`: `https://rez-feedback-service.onrender.com`

### 3. Feedback Service

1. New > Web Service
2. Connect GitHub: `imrejaul007/REZ-feedback-service`
3. Settings:
   - Name: `rez-feedback-service`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index-learning.js`
4. Environment Variables:
   - `MONGODB_URI`: MongoDB connection string
   - `EVENT_PLATFORM_URL`: `https://rez-event-platform.onrender.com`

---

## Live URLs (After Deploy)

| Service | URL |
|---------|-----|
| Event Platform | https://rez-event-platform.onrender.com |
| Action Engine | https://rez-action-engine.onrender.com |
| Feedback Service | https://rez-feedback-service.onrender.com |
| Merchant Copilot | https://rez-merchant-copilot.onrender.com |
| Feature Flags | https://rez-feature-flags.onrender.com |

---

## Connect Apps to Live

After deploying, update your apps to use:

```javascript
// Merchant App
const EVENT_PLATFORM = 'https://rez-event-platform.onrender.com';

// Send inventory event
fetch(`${EVENT_PLATFORM}/webhook/merchant/inventory`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    merchant_id: 'merchant_123',
    item_id: 'biryani',
    current_stock: 3,
    threshold: 5
  })
});
```

---

## Verify Deployment

```bash
# Check Event Platform
curl https://rez-event-platform.onrender.com/health

# Check Action Engine
curl https://rez-action-engine.onrender.com/health

# Check Feedback Service
curl https://rez-feedback-service.onrender.com/health

# Send test event
curl -X POST https://rez-event-platform.onrender.com/webhook/merchant/inventory \
  -H "Content-Type: application/json" \
  -d '{"merchant_id":"test","item_id":"item1","current_stock":2,"threshold":5}'
```

---

## Feature Flags (Live)

After deploying feature flags service:

```bash
# Check flags
curl https://rez-feature-flags.onrender.com/flags

# Disable learning
curl -X POST https://rez-feature-flags.onrender.com/flags/learning_enabled/disable
```

---

Last updated: 2026-05-01
