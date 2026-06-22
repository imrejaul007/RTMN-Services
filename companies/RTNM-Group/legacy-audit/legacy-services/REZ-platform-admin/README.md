# REZ Platform Admin - Complete Authority

**Version 2.0 - Single Source of Truth for Entire Ecosystem**

---

## Authority Overview

REZ Platform Admin has **complete control** over:

| Domain | Control | Services |
|--------|---------|-----------|
| **Companies** | Create, manage, suspend | 6 companies |
| **Users** | Create, assign roles, permissions | All platform users |
| **Services** | Deploy, restart, scale, configure | 169+ services |
| **AI/ML** | Train, deploy, monitor models | 12+ models |
| **Finance** | Revenue, transactions, budgets | Payment/Wallet |
| **Security** | API keys, audit logs, SSO | Access control |
| **Notifications** | Broadcast, alerts | Push/Email/SMS |

---

## Role Hierarchy

```
Super Admin (Full Authority)
├── CFO (Finance Dashboard)
├── CTO (Technology Dashboard)
├── CMO (Marketing Dashboard)
├── COO (Operations Dashboard)
├── CHRO (HR Dashboard)
├── CAIO (AI/ML Dashboard)
│
└── Company Admins (Company-scoped)
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@rez.money | admin123 |
| CFO | cfo@rez.money | cfo123 |
| CTO | cto@rez.money | cto123 |
| CMO | cmo@rez.money | cmo123 |
| COO | coo@rez.money | coo123 |
| CHRO | chro@rez.money | chro123 |
| CAIO | caio@rez.money | caio123 |

---

## API Endpoints

### Authentication
```
POST /auth/login
POST /auth/mfa/enable
```

### Users
```
GET    /users         List all users
POST   /users         Create user
PATCH  /users/:id     Update user
DELETE /users/:id     Deactivate user
```

### Companies
```
GET    /companies     List companies
POST   /companies     Create company
PATCH  /companies/:id Update company
```

### Services
```
GET    /services            List all services
POST   /services/deploy    Deploy service
POST   /services/:id/restart  Restart
POST   /services/:id/scale   Scale
```

### Finance
```
GET /finance/revenue       Revenue data
GET /finance/transactions  Transactions
```

### AI/ML
```
GET  /ai/models   List models
POST /ai/train     Train model
```

### Audit & Notifications
```
GET  /audit           Audit logs
GET  /notifications    User notifications
POST /notifications/broadcast  Broadcast
```

---

## Services Under Control

### RABTUL (Infrastructure)
- Auth, Payment, Wallet, Order
- Catalog, Search, Delivery
- Notifications, Profile, Booking
- Circuit Breaker, DLQ, Secrets

### REZ Intelligence
- CDP, Fraud Agent, Prediction Engine
- Signal Aggregator, Recommendation Engine
- Personalization, Realtime Segments
- Intent Predictor

### REZ Media
- Ads Platform, Karma Service
- Attribution Hub, CRM Hub

### Support
- REZ-Care, REZ-Agent

---

## Quick Start

```bash
# Install
npm install

# Development
npm run dev

# Production
npm run build
npm start

# Docker
docker build -t platform-admin .
docker run -p 4000:4000 platform-admin
```

---

## Environment Variables

```env
PORT=4000
MONGODB=mongodb://localhost:27017/admin
JWT_SECRET=your-secret
INTERNAL_KEY=internal-service-key
```

---

## Architecture

```
REZ Platform Admin
│
├── Auth (JWT + MFA)
├── Users (RBAC)
├── Companies
├── Services (Deploy/Restart/Scale)
├── AI Models
├── Finance
├── Audit Logs
├── Notifications
└── Settings
```

---

## Pages

| Page | Purpose |
|------|---------|
| `/` | Main dashboard |
| `/login` | Authentication |
| `/users` | User management |
| `/companies` | Company management |
| `/services` | Service control |
| `/finance` | CFO dashboard |
| `/technology` | CTO dashboard |
| `/marketing` | CMO dashboard |
| `/operations` | COO dashboard |
| `/hr` | CHRO dashboard |
| `/ai` | CAIO dashboard |
| `/audit` | Audit logs |
| `/notifications` | Notifications |
| `/apikeys` | API keys |
| `/settings` | Platform settings |
