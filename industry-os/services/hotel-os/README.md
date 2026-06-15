# Hotel OS

Industry-specific digital twin service for the hotel and hospitality industry within RTMN.

## Overview

Hotel OS provides comprehensive management capabilities for hotels including room management, booking system, guest profiles, hotel services, invoicing, and analytics.

## Quick Start

```bash
# Install dependencies
cd services/hotel-os
npm install

# Run locally
npm start

# Run with Docker
docker build -t rtmn-hotel-os .
docker run -p 5025:5025 rtmn-hotel-os
```

## API Endpoints

### Room Management
- `GET /api/rooms` - List rooms (with filters)
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Booking Management
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Get booking
- `PUT /api/bookings/:id` - Update booking
- `PATCH /api/bookings/:id/status` - Update status
- `DELETE /api/bookings/:id` - Cancel booking

### Guest Management
- `POST /api/guests` - Register guest
- `GET /api/guests` - List guests
- `GET /api/guests/:id` - Get guest
- `PUT /api/guests/:id` - Update guest
- `POST /api/guests/:id/points` - Add loyalty points

### Hotel Services
- `GET /api/services` - List services
- `POST /api/services/request` - Request service
- `GET /api/services/requests` - Get service requests
- `PATCH /api/services/requests/:id` - Update request

### Invoicing
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice
- `POST /api/invoices/:id/pay` - Pay invoice

### Analytics
- `GET /api/analytics` - Get daily analytics

### Digital Twins
- `GET /api/twins` - All twins status
- `GET /api/twins/:name` - Specific twin
- `POST /api/twins/sync` - Sync twins

## Digital Twins

| Twin | Purpose |
|------|---------|
| room-twin | Real-time room inventory |
| booking-twin | Active bookings |
| guest-twin | Guest profiles |
| service-twin | Active services |
| revenue-twin | Revenue tracking |

## Port

**5025** - Hotel OS Port

## Health Check

```bash
curl http://localhost:5025/health
```
