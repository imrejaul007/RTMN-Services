# Subscription Box AI — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹25L / 5 weeks | **ARR:** ₹2.0Cr

---

## 1. Concept & Vision

AI-powered subscription box curation platform personalizing product selections based on user preferences, behavior, and feedback.

---

## 2. Core Features

### 2.1 Personalization Engine (P0)
```python
def curate_box(user_id, box_type):
    user_prefs = get_preferences(user_id)
    history = get_purchase_history(user_id)
    feedback = get_feedback_history(user_id)
    
    candidates = get_product_candidates(box_type)
    scored = score_products(candidates, user_prefs, history, feedback)
    return select_box_items(scored, box_type.item_count)
```

### 2.2 Box Types (P0)
- Beauty/Grooming box
- Snack/food box
- Lifestyle box
- Custom category boxes

### 2.3 User Preferences (P0)
- Category preferences
- Brand preferences
- Allergy/restrictions
- Style preferences

### 2.4 Feedback Loop (P1)
- Rate received items
- Swipe preferences
- Seasonal adjustments
- Churn prediction

---

## 3. API Endpoints

```
POST /api/boxes/curate
GET  /api/boxes/:id/items
POST /api/preferences/update
GET  /api/feedback/:boxId/ratings
```

---

*Spec created: June 28, 2026*
