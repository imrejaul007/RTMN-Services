# Stripe Connector

## Overview
Payment processing integration for TwinOS.

## Purpose
Syncs Stripe payments with wallet twins.

## Key Features
- Payment sync
- Subscription tracking
- Refund handling
- Invoice mapping

## API Endpoints
- `GET /connect` - Test connection
- `POST /sync` - Trigger sync
- `POST /webhooks/stripe` - Webhook receiver

## Startup
```bash
cd platform/connectors/stripe-connector && npm run dev
```
