# AI Waiter - Features

**Company:** HOJAI AI
**Employee Type:** L2 Specialist
**Industry:** Restaurant/Hospitality
**Port:** 5600
**Status:** ✅ Connected & Working

---

## Core Features

### 1. Order Taking
- [x] Natural language order parsing
- [x] WhatsApp menu browsing
- [x] Item recommendations
- [x] Customization handling (no onion, extra cheese, etc.)
- [x] Special requests
- [x] Order confirmation
- [x] Payment link generation
- [x] Kitchen display notification

### 2. Menu Management
- [x] Full menu retrieval
- [x] Category-based browsing
- [x] Dietary filtering (veg, vegan, Jain, gluten-free, nut-free)
- [x] Item search
- [x] Price display
- [x] Vegetarian/Non-vegetarian indicators
- [x] Menu caching for performance

### 3. Reservations
- [x] Table booking
- [x] Guest count handling
- [x] Date/time extraction
- [x] Special occasion notes (birthday, anniversary, etc.)
- [x] Time slot management
- [x] Confirmation messages
- [x] Customer name storage

### 4. Customer Support
- [x] Menu questions
- [x] Dietary restrictions handling
- [x] Allergen information
- [x] Opening hours query
- [x] Location/Directions
- [x] Parking info
- [x] Multi-language support (Hindi, English, +8 Indian languages)

### 5. Upselling
- [x] Combo suggestions
- [x] Beverages with meals
- [x] Desserts after main course
- [x] Special offers/deals
- [x] Order confirmation upsell

### 6. Memory & Personalization
- [x] Customer session memory
- [x] Guest preferences storage
- [x] Dietary restrictions recall
- [x] Favorite items tracking
- [x] Occasion memory

---

## Service Connections

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| REZ Menu Service | 4030 | HTTP | ✅ Connected |
| REZ POS Service | 4081 | HTTP | ✅ Connected |
| REZ KDS | 4080 | HTTP | ✅ Connected |
| REZ Table Booking | 4070 | HTTP | ✅ Connected |
| HOJAI Memory | 4520 | HTTP | ✅ Connected |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Handle chat message |
| POST | `/api/whatsapp/webhook` | WhatsApp webhook |
| POST | `/api/reservations` | Create reservation |
| POST | `/api/orders` | Create order |
| GET | `/api/menu` | Get full menu |
| GET | `/api/menu/dietary` | Get dietary options |
| GET | `/api/orders/active` | Get active orders |
| POST | `/api/customer/info` | Set customer info |

---

## Intent Detection

| Intent | Keywords | Response |
|--------|----------|----------|
| order | order, buy, want, need, get, have | Order flow |
| reservation | book, reserve, table, tonight, tomorrow | Reservation flow |
| menu_query | menu, what have, what serve, items, dishes | Show menu |
| dietary | veg, vegan, vegetarian, jain, allergy | Filter dietary |
| hours | open, close, hour, time | Show hours |
| location | address, where, location, directions | Show location |
| cancel | cancel | Cancel order |
| modify | change, modify, update, edit | Modify order |

---

## Menu Categories

| Category | Sample Items |
|----------|-------------|
| South Indian | Masala Dosa, Rava Idli, Pongal, Uttapam, Filter Coffee |
| Main Course | Butter Chicken, Dal Makhani, Biryani, Paneer Butter Masala, Naan |
| Beverages | Cappuccino, Cold Coffee, Fresh Lime Soda, Mango Lassi, Green Tea |
| Desserts | Gulab Jamun, Rasmalai, Ice Cream |

---

## Story Coverage

| Chapter | Description | Status |
|---------|------------|--------|
| Ch 6 | Coffee order → Kitchen | ✅ Working |
| Ch 8 | Restaurant experience | ✅ Working |

---

**Last Updated:** June 14, 2026
