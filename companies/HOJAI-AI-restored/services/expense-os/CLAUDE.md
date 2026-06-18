# HOJAI ExpenseOS

**Port:** 5250 | **MongoDB:** expense | **Status:** ✅ PRODUCTION READY

---

## Overview

ExpenseOS provides multi-channel expense capture with AI-powered receipt extraction and policy validation.

## Features

- Multi-channel capture (WhatsApp/Email/Mobile/API)
- AI receipt OCR extraction
- Configurable policy engine
- Multi-level approval workflow
- Category classification
- Duplicate detection
- Multi-currency support
- GST/VAT extraction

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/expenses | Create expense |
| GET | /api/expenses | List expenses |
| GET | /api/expenses/:id | Get expense |
| PATCH | /api/expenses/:id/status | Approve/Reject |
| GET | /api/categories | List categories |
| GET | /api/analytics | Expense analytics |

## Quick Start

```bash
npm install && npm start
```

## Environment Variables

- `PORT` - HTTP port (default: 5250)
- `MONGO_URI` - MongoDB connection string

**Last Updated:** June 17, 2026