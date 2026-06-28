# HOJAI SiteOS Payment Gateway Service

**Port:** 5479
**Version:** 1.0.0
**Status:** Production Ready

## Overview

Payment Gateway Service handles all payment processing for HOJAI SiteOS including Razorpay, UPI, cards, and wallets.

## Features

- **Razorpay Integration** - Full Razorpay API support with order creation, payment capture, and webhooks
- **UPI Payments** - QR code generation and UPI payment verification
- **Multi-method Support** - Cards, netbanking, wallets, EMI
- **Webhook Handling** - Secure webhook processing with signature verification
- **Payment Status Tracking** - Complete payment lifecycle management
- **Multi-tenant** - Company-based isolation

## API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /api/payments/methods` - Get available payment methods

### Payment Operations
- `POST /api/payments/initiate` - Create a new payment
- `GET /api/payments/:paymentId` - Get payment details
- `PUT /api/payments/:paymentId` - Update payment status
- `POST /api/payments/upi-qr` - Generate UPI QR code
- `POST /api/payments/upi/verify` - Verify UPI payment
- `POST /api/payments/webhook` - Razorpay webhook handler

## Authentication

All API endpoints (except webhook) require:
- `X-API-Key` header or `Authorization: Bearer <key>`
- `X-Company-Id` header for multi-tenant isolation

## Environment Variables

```bash
PORT=5479
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
UPI_ID=hojai@upi
STORAGE_PATH=/tmp
```

## Payment Flow

```
1. Client initiates payment
   POST /api/payments/initiate
   → Returns Razorpay order ID

2. Client completes payment on frontend
   (Razorpay checkout)

3. Webhook receives payment event
   POST /api/payments/webhook
   → Updates payment status

4. Client verifies payment
   GET /api/payments/:paymentId
   → Returns final status
```

## UPI Flow

```
1. Generate QR
   POST /api/payments/upi-qr
   → Returns UPI URL / QR data

2. Customer pays via any UPI app

3. Verify payment
   POST /api/payments/upi/verify
   → With UTR number
```

## Payment Statuses

- `pending` - Payment initiated
- `processing` - Payment in progress (UPI QR shown)
- `completed` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

## Razorpay Webhook Events

Handled events:
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `refund.created` - Refund processed

## Files

```
payment-gateway/
├── src/index.js       # Main service (350 lines)
├── package.json
├── vitest.config.js
├── CLAUDE.md
└── __tests__/unit/
    └── payment-gateway.test.js  # 25 tests
```

## Start

```bash
cd products/siteos-commerce/payment-gateway
npm install
npm start
```
