# Crop Advisory AI — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹25L / 5 weeks | **ARR:** ₹1.5Cr

---

## 1. Concept & Vision

AI-powered crop advisory for farmers with personalized advice, pest detection, weather alerts, market prices.

---

## 2. Core Features

### 2.1 Crop Recommendation (P0)
- Soil analysis, weather-based suggestions
- Market price consideration

### 2.2 Pest Detection (P0)
- Image-based detection, treatment recommendations

### 2.3 Weather Advisory (P0)
- 7-day forecast, irrigation recommendations

### 2.4 Market Prices (P1)
- Real-time mandi prices, price trends

---

## 3. API Endpoints

```
POST /api/crops/recommend
POST /api/pest/detect
GET  /api/weather/:location
GET  /api/market/prices/:region
```

---

*Spec created: June 28, 2026*
