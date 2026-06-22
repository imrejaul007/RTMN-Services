# CLAUDE.md - Finance AI

## Project Overview

**Name:** Finance AI
**Type:** Industry AI Product
**Tagline:** "AI-Powered Accounting & Financial Management"
**Built from:** RIDZA FinanceOS
**Version:** 1.0.0
**Date:** June 12, 2026

## Target Customers

- Startups
- SMEs
- Enterprises

## Port Configuration

| Service | Port | Description |
|---------|------|-------------|
| Accounting Service | 4870 | Chart of accounts, ledger, invoices |

---

## AI EMPLOYEES (4 Agents)

### 1. Accountant AI
```
Role: Bookkeeping
Skills: Transaction categorization, account reconciliation, report generation
Integration: Bank feeds, ledgers
```

### 2. CFO Agent
```
Role: Financial advisory
Skills: Financial analysis, cost-cutting suggestions, growth opportunities
Integration: P&L, balance sheet
```

### 3. Invoice Manager
```
Role: AP/AR
Skills: Invoice tracking, payment reminders, payment management
Integration: Accounts payable/receivable
```

### 4. Tax Filing Agent
```
Role: Compliance
Skills: Tax calculation, return preparation, compliance checking
Integration: GST, TDS
```

---

## FEATURES

### Accounting
- [x] Chart of accounts (customizable)
- [x] Double-entry bookkeeping
- [x] Journal entries
- [x] Bank reconciliation
- [x] Multi-currency support

### Invoice Management
- [x] Create invoices (GST compliant)
- [x] Send invoices (email, WhatsApp)
- [x] Track payments (partial, full)
- [x] Payment reminders
- [x] Credit note generation
- [x] Recurring invoices

### Expense Tracking
- [x] Expense categorization
- [x] Receipt upload
- [x] Approval workflow
- [x] Reimbursement processing

### Reports
- [x] Balance sheet
- [x] Income statement (P&L)
- [x] Cash flow statement
- [x] Trial balance
- [x] GST reports
- [x] TDS reports

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹4,999/mo | Startups |
| **Professional** | ₹14,999/mo | SMEs |
| **Enterprise** | Custom | Large enterprises |

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Cache:** Redis

## Project Structure

```
finance-ai/
├── src/
│   └── index.ts          # Main entry point
├── test/                  # Unit tests
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── README.md
├── PRODUCT.md            # Product documentation
└── CLAUDE.md             # This file
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 4870 | Service port |
| NODE_ENV | No | development | Environment |
| MONGODB_URI | Yes | - | MongoDB connection string |
| JWT_SECRET | Yes | - | JWT signing secret |
| REDIS_URL | No | redis://localhost:6379 | Redis connection URL |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/accounts | List accounts |
| POST | /api/accounts | Create account |
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| GET | /api/invoices | List invoices |
| POST | /api/invoices | Create invoice |
| GET | /api/reports/balance-sheet | Balance sheet |
| GET | /api/reports/pnl | Income statement |

---

## Integration Points

### RABTUL Services

| Service | Port | Integration |
|---------|------|-------------|
| RABTUL Auth | 4002 | JWT validation, user verification |
| RABTUL Payment | 4001 | Payment processing |
| RABTUL Wallet | 4004 | Balance tracking |
| RABTUL Notification | 4005 | Invoice reminders |

### HOJAI AI Services

| Service | Port | Integration |
|---------|------|-------------|
| HOJAI SkillNet | 5120-5140 | Skill marketplace, execution |
| HOJAI BrandPulse | 4770 | Brand intelligence |
| HOJAI Genie | - | Personal AI assistant |
| HOJAI Voice | 4850 | Voice finance queries |

---

## Deployment Checklist

- [x] Codebase exists
- [x] Documentation complete
- [x] AI Employees documented (4 agents)
- [x] Features documented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Health endpoint implemented
- [ ] Docker support added
- [ ] Monitoring configured
- [ ] Security audit passed

---

## Related Products

| Product | Industry | AI Agents |
|---------|----------|-----------|
| retail-ai | Retail | 4 |
| hr-ai | HR/Payroll | 4 |
| fitness-ai | Gym/Fitness | 6 |
| salon-ai | Salon/Spa | 6 |
| manufacturing-ai | Manufacturing | 4 |
| society-ai | Apartments | 4 |
| real-estate-ai | Real Estate | 3 |
| finance-ai | Finance | 4 |
| education-ai | Education | 4 |
| logistics-ai | Logistics | 4 |
| franchise-ai | Franchise | 4 |
| travel-ai | Travel | 4 |

---

**Last Updated:** 2026-06-12
**HOJAI AI - Industry AI Division**