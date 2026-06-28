# HOJAI SiteOS Subscription Billing
**Port:** 5494

## Features
- Plan management (Free, Basic, Pro, Enterprise)
- Subscription lifecycle
- Usage tracking (metered billing)
- Invoice generation

## API
- GET /api/plans
- POST /api/subscriptions
- POST /api/subscriptions/:id/usage
- GET /api/invoices
- POST /api/invoices

## Start
```bash
npm install && npm start
```
