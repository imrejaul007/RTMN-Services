# ReZ Ecosystem - RTMN Commerce Memory Deployment Checklist

## Pre-Deployment

### 1. Generate Secure Token
```bash
openssl rand -hex 32
```
Copy the output - this is your `INTERNAL_SERVICE_TOKEN`

### 2. Set Token in 1Password
Add `INTERNAL_SERVICE_TOKEN` to your 1Password vault for all services.

---

## Intent Graph (rez-intent-graph) - Priority 1

### Upgrade Render Plan
1. Go to: https://dashboard.render.com
2. Select: `rez-intent-api`
3. Click: **Plan** → **Starter** ($7/month)
4. Confirm upgrade

### Add Redis To Go
1. Go to: `rez-intent-api` → **Environment**
2. Click: **Add Redis To Go**
3. Select: **Starter** ($5/month)
4. Copy the `REDIS_URL` auto-generated

### Set Environment Variables
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `MONGODB_URI` | (existing) | Don't change |
| `REDIS_URL` | (from Redis To Go) | Auto-populated |
| `INTERNAL_SERVICE_TOKEN` | `<your-token>` | Same for all services |
| `INTENT_CAPTURE_URL` | `https://rez-intent-graph.onrender.com` | Source of truth |
| `ENABLE_DORMANT_CRON` | `true` | |
| `ENABLE_AGENTS` | `false` | Enable later if needed |
| `OPENAI_API_KEY` | (optional) | For better embeddings |

### Deploy
```bash
cd /Users/rejaulkarim/Documents/rez-intent-graph
git pull origin main
git push origin main  # Triggers auto-deploy
```

### Verify
```bash
curl https://rez-intent-graph.onrender.com/health
curl https://rez-intent-graph.onrender.com/metrics
```

---

## All Consumer Services

### Environment Variables Required

For **each** service below, set:
```bash
INTENT_CAPTURE_URL=https://rez-intent-graph.onrender.com
INTERNAL_SERVICE_TOKEN=<your-token>
```

### Services to Update

#### rez-search-service
- **Repo**: `https://github.com/imrejaul007/rez-search-service`
- **Render**: `rez-search-api`
- **Variables**: Add to Render dashboard

#### rez-order-service
- **Repo**: `https://github.com/imrejaul007/rez-order-service`
- **Render**: `rez-order-api`
- **Variables**: Add to Render dashboard

#### rez-ads-service
- **Repo**: `https://github.com/imrejaul007/rez-ads-service`
- **Render**: `rez-ads-api`
- **Variables**: Add to Render dashboard

#### rez-gamification-service
- **Repo**: `https://github.com/imrejaul007/rez-gamification-service`
- **Render**: `rez-gamification-api`
- **Variables**: Add to Render dashboard

#### rez-marketing-service
- **Repo**: `https://github.com/imrejaul007/rez-marketing-service`
- **Render**: `rez-marketing-api`
- **Variables**: Add to Render dashboard

#### rez-finance-service
- **Repo**: `https://github.com/imrejaul007/rez-finance-service`
- **Render**: `rez-finance-api`
- **Variables**: Add to Render dashboard

#### Hotel OTA
- **Repo**: `https://github.com/imrejaul007/hotel-ota`
- **Render**: `hotel-ota-api`
- **Variables**: Add to Render dashboard

#### Hotel PMS
- **Repo**: `Hotel OTA/hotel-pms/hotel-management-master`
- **Render**: `hotel-pms-api`
- **Variables**: Add to Render dashboard

#### ReZ Now
- **Repo**: `https://github.com/imrejaul007/rez-now`
- **Render**: `rez-now-api`
- **Variables**: Add to Render dashboard

#### NextaBiZ
- **Repo**: `https://github.com/imrejaul007/nextabizz`
- **Render**: `nextabizz-api`
- **Variables**: Add to Render dashboard

#### Resturistan
- **Repo**: `https://github.com/imrejaul007/resturistan`
- **Render**: `resturistan-api`
- **Variables**: Add to Render dashboard

---

## Quick Deploy Command (All Services)

```bash
# Pull latest on all services
cd "/Users/rejaulkarim/Documents/ReZ Full App"

# rez-intent-graph
cd rez-intent-graph && git pull && git push && cd ..

# Consumer services
for service in rez-search-service rez-order-service rez-ads-service rez-gamification-service rez-marketing-service rez-finance-service; do
  cd "$service" && git pull && git push && cd ..
done

# Hotel OTA
cd "Hotel OTA" && git pull && git push && cd ..

# ReZ Now
cd rez-now && git pull && git push && cd ..

# NextaBiZ
cd nextabizz && git pull && git push && cd ..

echo "All services updated!"
```

---

## Post-Deployment Verification

### 1. Health Checks
```bash
# Intent Graph
curl https://rez-intent-graph.onrender.com/health

# Should return:
# {"status":"healthy","service":"intent-graph","mongodb":"connected",...}
```

### 2. Test Intent Capture
```bash
curl -X POST https://rez-intent-graph.onrender.com/api/intent/capture \
  -H "Content-Type: application/json" \
  -H "x-internal-token: <your-token>" \
  -d '{
    "userId": "test-user-123",
    "appType": "rez_now",
    "eventType": "search",
    "category": "DINING",
    "intentKey": "coffee_shop",
    "intentQuery": "best coffee near me"
  }'

# Should return:
# {"success":true,"data":{...}}
```

### 3. Check Prometheus Metrics
```bash
curl https://rez-intent-graph.onrender.com/metrics | grep intent_graph

# Should see:
# intent_graph_intents_captured_total
# intent_graph_nudges_sent_total
# etc.
```

### 4. Test Recommendation API
```bash
curl "https://rez-intent-graph.onrender.com/api/intent/recommendations?userId=test-user-123" \
  -H "x-internal-token: <your-token>"
```

---

## Rollback Plan

If something breaks:

```bash
# Revert to previous commit
git revert HEAD
git push

# Or manual rollback on Render:
# Render dashboard → Service → History → Click previous deploy
```

---

## Monitoring

### Prometheus Alerts (Prometheus/Grafana)

```yaml
groups:
  - name: intent-graph-alerts
    rules:
      - alert: IntentGraphDown
        expr: up{job="intent-graph"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Intent Graph is down"

      - alert: IntentCaptureLatencyHigh
        expr: histogram_quantile(0.99, rate(intent_graph_capture_latency_ms[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Intent capture latency above 1s"

      - alert: IntentCaptureErrorRateHigh
        expr: rate(intent_graph_capture_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Intent capture error rate above 1%"
```

---

## Checklist

- [ ] Generate `INTERNAL_SERVICE_TOKEN`
- [ ] Store token in 1Password
- [ ] Upgrade `rez-intent-api` to Starter plan
- [ ] Add Redis To Go to `rez-intent-api`
- [ ] Set env vars in `rez-intent-api`
- [ ] Deploy `rez-intent-api`
- [ ] Verify health check
- [ ] Verify metrics endpoint
- [ ] Set `INTERNAL_SERVICE_TOKEN` in all 10 services
- [ ] Pull & deploy all 10 services
- [ ] Test intent capture works
- [ ] Check for 200 OK responses

---

## Support

- **GitHub**: https://github.com/imrejaul007/rez-intent-graph/issues
- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
