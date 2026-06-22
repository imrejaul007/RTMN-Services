# BrandPulse - End-to-End Testing Guide

## Prerequisites

```bash
# 1. Start MongoDB
mongod --dbpath /data/db

# 2. Navigate to BrandPulse
cd products/brandpulse
```

## Start Services

### Terminal 1: BrandPulse API
```bash
npm run dev
# API running at http://localhost:4770
```

### Terminal 2: BrandPulse Dashboard
```bash
cd products/brandpulse-dashboard
npm run dev
# Dashboard at http://localhost:4780
```

---

## API Tests

### 1. Health Check
```bash
curl http://localhost:4770/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "brandpulse",
  "version": "1.0.0"
}
```

---

### 2. Generate Demo Data
```bash
curl -X POST http://localhost:4770/api/v1/demo/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Grand Hotel Bangalore",
    "industry": "hotel",
    "brandId": "grand-hotel-blr",
    "tenantId": "stayown-tenant"
  }'
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "brand": { "name": "Grand Hotel Bangalore", ... },
    "reviewsGenerated": 32,
    "message": "Demo data generated for Grand Hotel Bangalore"
  }
}
```

---

### 3. Create a Brand
```bash
curl -X POST http://localhost:4770/api/v1/brands \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "my-hotel-001",
    "tenantId": "my-tenant",
    "name": "My Test Hotel",
    "slug": "my-test-hotel",
    "industry": "hotel"
  }'
```

---

### 4. Get Brand Overview
```bash
curl http://localhost:4770/api/v1/analytics/brand/grand-hotel-blr/overview
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "brand": { "id": "grand-hotel-blr", "name": "Grand Hotel Bangalore" },
    "stats": {
      "totalReviews": 32,
      "averageRating": 4.1,
      "sentimentScore": 0.32,
      "positivePercent": 68.75,
      "neutralPercent": 18.75,
      "negativePercent": 12.5
    },
    "trends": { ... },
    "alerts": { "active": 0, "critical": 0, "high": 0 }
  }
}
```

---

### 5. Get Sentiment Trend
```bash
curl "http://localhost:4770/api/v1/analytics/brand/grand-hotel-blr/sentiment?period=day&days=30"
```

---

### 6. Get Rating Distribution
```bash
curl http://localhost:4770/api/v1/analytics/brand/grand-hotel-blr/ratings
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "distribution": { "1": 2, "2": 2, "3": 6, "4": 12, "5": 10 },
    "average": 4.1,
    "median": 4
  }
}
```

---

### 7. Create a Review
```bash
curl -X POST http://localhost:4770/api/v1/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "grand-hotel-blr",
    "tenantId": "stayown-tenant",
    "source": "google",
    "content": "Absolutely loved our stay! The staff was incredibly helpful and the room was spotless. Will definitely come back.",
    "rating": 5,
    "title": "Amazing stay!",
    "author": {
      "name": "John D.",
      "isVerified": true
    }
  }'
```

---

### 8. Get Reviews List
```bash
curl "http://localhost:4770/api/v1/reviews/brand/grand-hotel-blr?limit=5&sortBy=publishedAt&sortOrder=desc"
```

---

### 9. Analyze Sentiment
```bash
curl -X POST http://localhost:4770/api/v1/sentiment/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "The service was terrible. Room was dirty and staff was rude. Never staying here again!"}'
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "score": -0.85,
    "label": "negative",
    "confidence": 0.92,
    "aspects": [
      { "name": "service", "score": -0.8, "mentions": 1 },
      { "name": "cleanliness", "score": -0.9, "mentions": 1 }
    ],
    "keywords": ["terrible", "dirty", "rude"]
  }
}
```

---

### 10. Batch Sentiment Analysis
```bash
curl -X POST http://localhost:4770/api/v1/sentiment/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Great hotel, loved the breakfast!",
      "Terrible experience, would not recommend",
      "Average stay, nothing special"
    ]
  }'
```

---

### 11. Get Aspect Analysis
```bash
curl http://localhost:4770/api/v1/analytics/brand/grand-hotel-blr/aspects
```

---

### 12. Get Alerts
```bash
curl http://localhost:4770/api/v1/analytics/brand/grand-hotel-blr/alerts
```

---

### 13. View Swagger Docs
```
http://localhost:4770/api/docs/ui
```

---

## Dashboard Test

### Open Dashboard
```
http://localhost:4780/?brandId=grand-hotel-blr
```

### Should see:
- Total Reviews count
- Average Rating with stars
- Sentiment Score percentage
- Active Alerts count
- Sentiment Trend chart
- Rating Distribution bars
- Aspect Analysis
- Recent Reviews feed

---

## RTNM Integration Test

### Through Hotel OS Integration (3899)
```bash
# Get brand overview
curl http://localhost:3899/api/rtnm/brand/grand-hotel-blr/overview

# Get sentiment trend
curl "http://localhost:3899/api/rtnm/brand/grand-hotel-blr/sentiment?period=day&days=30"

# Create review
curl -X POST http://localhost:3899/api/rtnm/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "grand-hotel-blr",
    "tenantId": "stayown-tenant",
    "source": "direct",
    "content": "Test review through RTNM",
    "rating": 4,
    "author": { "name": "Test User" }
  }'
```

---

## WebSocket Test

### Connect via Browser Console
```javascript
const ws = new WebSocket('ws://localhost:4770/ws');

// Subscribe to brand updates
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { brandIds: ['grand-hotel-blr'] }
}));

// Listen for events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('WS Event:', data.type, data.payload);
};

// Create a review to trigger event
// POST http://localhost:4770/api/v1/reviews
// Should receive 'new_review' event
```

---

## Docker Deployment Test

```bash
cd products/brandpulse

# Start with Docker Compose
docker-compose up -d

# Check logs
docker logs brandpulse

# Test health
curl http://localhost:4770/health
```

---

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"
```

### Port Already in Use
```bash
# Find and kill process
lsof -i :4770
kill -9 <PID>
```

### Demo Data Not Working
```bash
# Reset and regenerate
curl -X DELETE http://localhost:4770/api/v1/demo/reset \
  -H "Content-Type: application/json" \
  -d '{"brandId": "grand-hotel-blr"}'

curl -X POST http://localhost:4770/api/v1/demo/generate \
  -H "Content-Type: application/json" \
  -d '{"brandId": "grand-hotel-blr", "brandName": "Grand Hotel", "industry": "hotel"}'
```
