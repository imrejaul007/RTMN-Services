# Hospitality OS

Unified cross-industry hospitality platform within RTMN, managing hotels, restaurants, spas, bars, and event venues.

## Overview

Hospitality OS provides a unified platform for managing multiple hospitality establishments, staff, customers, transactions, and events across the hospitality industry.

## Quick Start

```bash
cd services/hospitality-os
npm install
npm start
```

## API Endpoints

### Establishments
- `GET /api/establishments` - List establishments
- `GET /api/establishments/:id` - Get establishment
- `POST /api/establishments` - Create establishment
- `PUT /api/establishments/:id` - Update establishment
- `DELETE /api/establishments/:id` - Delete establishment

### Staff
- `GET /api/staff` - List staff
- `GET /api/staff/:id` - Get staff member
- `POST /api/staff` - Add staff
- `PUT /api/staff/:id` - Update staff
- `PATCH /api/staff/:id/status` - Update status

### Customers
- `POST /api/customers` - Register customer
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `POST /api/customers/:id/points` - Add loyalty points

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List transactions

### Events
- `POST /api/events` - Create event
- `GET /api/events` - List events
- `GET /api/events/:id` - Get event
- `POST /api/events/:id/book` - Book tickets

### Loyalty
- `GET /api/loyalty` - Loyalty program stats

### Analytics & Twins
- `GET /api/analytics` - Analytics dashboard
- `GET /api/twins` - All twins
- `POST /api/twins/sync` - Sync twins

## Port

**5050** - Hospitality OS Port
