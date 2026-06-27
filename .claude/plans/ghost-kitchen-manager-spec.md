# Ghost Kitchen Manager — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹30L / 6 weeks | **ARR:** ₹2.0Cr

---

## 1. Concept & Vision

Centralized operations for ghost kitchens managing multiple food brands from single kitchen - brand menus, aggregated orders, unified inventory.

---

## 2. Core Features

### 2.1 Multi-Brand Menu Management (P0)
- Create/manage multiple virtual brands
- Brand-specific menus and pricing
- Shared kitchen inventory

### 2.2 Order Aggregation (P0)
- Aggregate orders from Swiggy, Zomato, direct
- Unified kitchen queue
- Priority management

### 2.3 Kitchen Display System (P0)
- Real-time order queue
- Brand color coding
- Prep time tracking

### 2.4 Shared Inventory (P0)
- Ingredient pooling across brands
- Automatic consumption tracking
- Low stock alerts

---

## 3. API Endpoints

```
GET/POST /api/brands
GET/POST /api/menus
GET      /api/orders/aggregated
GET      /api/inventory
```

---

*Spec created: June 28, 2026*
