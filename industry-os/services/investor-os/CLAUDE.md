# InvestorOS v1.0.0

**Version:** 1.0.0  
**Port:** 4802  
**Status:** ✅ **BUILT** (Phase 2 Complete)

---

## Overview

InvestorOS is a **complete investment management system** covering cap tables, fundraising, ESOP, board management, and due diligence.

This fills the critical gap in every finance stack — startups need investor management, not just accounting.

---

## Modules

| Module | Description | Status |
|--------|-------------|--------|
| **CapTableOS** | Shareholders, equity, dilution | ✅ Built |
| **FundraisingOS** | Rounds, SAFEs, YCCSAs | ✅ Built |
| **ESOPOS** | Options, vesting, exercise | ✅ Built |
| **BoardOS** | Meetings, resolutions | ✅ Built |
| **DataRoomOS** | Due diligence rooms | ✅ Built |

---

## Quick Start

```bash
cd industry-os/services/investor-os
npm install
npm start

# Runs on http://localhost:4802
```

---

## API Endpoints

### Cap Table

```bash
# Setup company
POST /api/company/setup
{ "companyId": "acme", "companyName": "ACME Inc" }

# Add shareholder
POST /api/cap-table/:companyId/shareholders
{ "name": "John", "type": "founder", "initialShares": 1000000 }

# Add equity
POST /api/cap-table/:companyId/equity
{ "shareholderId": "...", "shares": 1000000, "pricePerShare": 1 }

# Calculate dilution
POST /api/cap-table/:companyId/dilution
{ "newInvestment": 5000000, "preMoney": 20000000 }

# Get ownership
GET /api/cap-table/:companyId/ownership
```

### Fundraising

```bash
# Create round
POST /api/rounds
{ "companyId": "acme", "name": "Seed Round", "targetAmount": 5000000 }

# Add investor
POST /api/rounds/:roundId/investor
{ "name": "Sequoia", "type": "vc", "amount": 3000000 }

# Close round
POST /api/rounds/:roundId/close
```

### SAFEs

```bash
# Create SAFE
POST /api/safes
{ "investorId": "...", "companyId": "acme", "amount": 500000, "valuationCap": 5000000 }

# Convert SAFE
POST /api/safes/:safeId/convert
{ "preMoney": 20000000, "totalShares": 10000000 }
```

### ESOP

```bash
# Create option pool
POST /api/esop/pool
{ "companyId": "acme", "totalShares": 2000000 }

# Grant options
POST /api/esop/grants
{ "companyId": "acme", "employeeId": "...", "shares": 50000, "strikePrice": 1 }

# Get vesting
GET /api/esop/grants/:grantId/vesting

# Exercise
POST /api/esop/grants/:grantId/exercise
{ "shares": 10000, "fairMarketValue": 10 }
```

### Board

```bash
# Create meeting
POST /api/board/meetings
{ "companyId": "acme", "date": "2024-12-15" }

# Add resolution
POST /api/board/meetings/:meetingId/resolutions
{ "title": "Approve Series A", "type": "financial", "proposedBy": "CEO" }

# Cast vote
POST /api/resolutions/:resolutionId/vote
{ "voterId": "...", "voterName": "Director", "vote": "for" }
```

### Data Room

```bash
# Create room
POST /api/data-rooms
{ "companyId": "acme", "name": "Series B DD", "type": "fundraising" }

# Add access
POST /api/data-rooms/:roomId/access
{ "name": "Sequoia", "email": "team@sequoiacap.com", "accessLevel": "member" }

# Upload document
POST /api/data-rooms/:roomId/documents
{ "folderId": "...", "name": "Financials Q3.pdf", "type": "pdf", "size": 2048576 }
```

### Dashboard

```bash
GET /api/dashboard/:companyId
```

---

## Health Check

```bash
curl http://localhost:4802/health
```

---

## Models

### CapTable
- Shareholders (founder, employee, investor, advisor)
- Equity (common, preferred, series)
- Option pool
- Dilution calculation

### FundraisingRound
- Rounds (pre-seed, seed, series-a, etc.)
- Investors
- Term sheets
- Auto cap table update on close

### SAFE
- Pre-money, post-money, post-money-cap
- Valuation cap
- Discount
- Auto conversion

### ESOPGrant
- Vesting schedule (48 months, 12 month cliff)
- Tax calculation (India: 194A, 192A)
- Exercise workflow

### BoardMeeting
- Agenda items
- Resolutions
- Voting
- Minutes

### DataRoom
- Folder structure
- Access control
- Activity tracking

---

*InvestorOS - Complete Investment Management*
