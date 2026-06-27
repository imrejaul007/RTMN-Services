# Rental Yield Optimizer — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹25L / 5 weeks | **ARR:** ₹1.2Cr

---

## 1. Concept & Vision

AI-powered rental management that maximizes rental income through dynamic pricing, optimal tenant matching, and predictive maintenance.

---

## 2. Core Features

### 2.1 Dynamic Pricing Engine (P0)
```python
# Optimal rent calculation
def calculate_optimal_rent(property_id):
    base_rate = get_market_rate(property_id)
    demand_factor = get_demand_indicator(property_id)
    seasonality = get_seasonality_factor()
    
    optimal_rent = base_rate * demand_factor * seasonality
    return optimal_rent
```

### 2.2 Tenant Matching (P0)
- Profile-based matching (budget, lifestyle, tenure)
- Tenant history & reliability scoring
- Automated screening
- Lease term optimization

### 2.3 Yield Dashboard (P0)
- Gross yield: (Annual Rent / Property Value) × 100
- Net yield: (Annual Rent - Expenses) / Property Value × 100
- Comparison with market average
- Expense tracking

### 2.4 Maintenance Prediction (P1)
- Track appliance age
- Predict failure probability
- Schedule preventive maintenance

---

## 3. API Endpoints

```
GET    /api/properties/rental
POST   /api/properties/rental/:id/optimize-rent
GET    /api/properties/rental/:id/yield
POST   /api/tenants/match/:propertyId
GET    /api/maintenance/predictions
```

---

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| Average yield | 6%+ |
| Occupancy rate | 95%+ |
| Tenant retention | 80%+ |

---

*Spec created: June 28, 2026*
