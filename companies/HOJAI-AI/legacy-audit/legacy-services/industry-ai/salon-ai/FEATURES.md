# SalonAI - Features Documentation

**Version:** 1.0.0  
**Date:** June 15, 2026  
**Location:** `industry-ai/salon-ai/`

---

## Overview

**SalonAI** is an AI-powered salon & spa management system with 3 microservices and 6 AI employees.

---

## Microservices

### 1. Booking Service (Port 4810)

**Location:** `services/booking-service/`  
**Lines:** 530

| Feature | Description |
|---------|-------------|
| Customer Management | Register, search, view history |
| Service Management | CRUD for salon services |
| Staff Management | Add, list, filter staff |
| Appointment Booking | Create, list, check-in, complete, cancel |
| Slot Availability | Real-time slot checking |
| Packages | Create and manage service packages |
| Daily Schedule | View daily appointment schedule |

### 2. Staff Scheduler (Port 4811)

**Location:** `services/staff-scheduler/`  
**Lines:** 175

| Feature | Description |
|---------|-------------|
| Shift Management | Create and manage shifts |
| Schedule Generation | Weekly/monthly schedules |
| Availability Tracking | Staff availability |

### 3. Inventory Service (Port 4812)

**Location:** `services/inventory-service/`  
**Lines:** 227

| Feature | Description |
|---------|-------------|
| Product Tracking | Track salon products |
| Usage Recording | Record product usage per service |
| Low Stock Alerts | Alert when products are low |
| Supplier Management | Track suppliers |

---

## API Endpoints

### Booking Service (4810)

```
POST   /customers                    - Register customer
GET    /customers                    - List/search customers
GET    /customers/:id               - Get customer with history

POST   /services                     - Create service
GET    /services                     - List services
GET    /services/:id                 - Get service details

POST   /staff                       - Add staff
GET    /staff                       - List staff

POST   /appointments                 - Book appointment
GET    /appointments                 - List appointments
GET    /slots                       - Available slots
POST   /appointments/:id/checkin    - Check-in
POST   /appointments/:id/complete   - Complete appointment
DELETE /appointments/:id            - Cancel appointment

GET    /schedule/daily              - Daily schedule
POST   /packages                    - Create package
GET    /packages                    - List packages
```

### Staff Scheduler (4811)

```
POST   /shifts                      - Create shift
GET    /shifts/:staffId            - Get staff shifts
GET    /schedule/weekly            - Weekly schedule
```

### Inventory Service (4812)

```
GET    /inventory                   - List inventory
POST   /inventory/alerts            - Create alert
```

---

## AI Employees (6 Agents)

### 1. Booking Agent

```
Role: Appointment automation
Skills:
  - WhatsApp booking integration
  - Natural language appointment booking
  - Reminder notifications
  - Rescheduling automation
Channels: WhatsApp, App, Web
```

### 2. Reception Agent

```
Role: Customer check-in
Skills:
  - Digital check-in
  - Customer recognition
  - Walk-in management
  - Waiting list handling
Channels: In-person, Kiosk
```

### 3. Service Advisor

```
Role: Service recommendations
Skills:
  - Hair/skin analysis
  - Service matching
  - Upselling
  - Cross-selling
Channels: App, WhatsApp
```

### 4. Stylist Manager

```
Role: Staff allocation
Skills:
  - Stylist matching
  - Load balancing
  - Performance tracking
  - Schedule optimization
```

### 5. Inventory Agent

```
Role: Stock management
Skills:
  - Usage tracking
  - Reorder automation
  - Expiry alerts
  - Cost optimization
```

### 6. Customer Agent

```
Role: Follow-up & retention
Skills:
  - Post-service follow-up
  - Review collection
  - Loyalty engagement
  - Re-booking reminders
Channels: WhatsApp, SMS, Email
```

---

## Integration Hub

**Location:** `src/connectors/index.ts`

```typescript
import { salonAIHub } from './src/connectors';
await salonAIHub.healthCheck();
```

| Connector | Purpose | Status |
|-----------|---------|--------|
| Booking | Appointment automation | Built |
| Inventory | Stock management | Built |
| Staff | Scheduling | Built |

---

## External Integrations

| Service | Port | Purpose |
|---------|------|---------|
| RABTUL Auth | 4002 | Staff authentication |
| RABTUL Payment | 4001 | Payments |
| RABTUL Wallet | 4004 | Loyalty points |
| GlamAI | 4830 | Beauty memory |

---

## Comparison

| Feature | Generic Salon | SalonAI |
|---------|---------------|---------|
| Booking | Manual | ✅ AI-powered |
| Scheduling | Excel | ✅ Auto |
| Inventory | Manual | ✅ Auto-track |
| WhatsApp | None | ✅ Built-in |
| AI Agents | None | ✅ 6 agents |

---

**Last Updated:** June 15, 2026
