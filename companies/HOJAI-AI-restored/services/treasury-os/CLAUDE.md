# HOJAI TreasuryOS

**Port:** 5295 | **MongoDB:** treasury | **Status:** ✅ PRODUCTION READY

---

## Overview

TreasuryOS provides cash management, bank account tracking, and cash flow forecasting.

## Features

- Multiple bank accounts
- Cash position tracking
- Transaction management
- Cash flow forecasting
- Multi-currency support
- Balance alerts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/accounts | Add bank account |
| GET | /api/accounts | List accounts |
| POST | /api/transactions | Record transaction |
| GET | /api/transactions | List transactions |
| GET | /api/cash-position | Current cash position |
| GET | /api/forecast | Cash flow forecast |

## Quick Start

```bash
npm install && npm start
```

**Last Updated:** June 17, 2026