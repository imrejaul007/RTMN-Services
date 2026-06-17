# Hotel OS

**Industry:** Hospitality  
**Port:** 5025  
**Status:** ✅ RUNNING  
**Digital Twins:** Room, Booking, Guest, Service, Revenue

## Overview

Hotel OS is a comprehensive hotel management system that handles:
- Room management
- Booking engine
- Guest management
- Hotel services
- Invoicing

## Quick Start

```bash
cd hotel-os
npm install
npm start
```

## API Endpoints

### Rooms
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Add room
- `GET /api/rooms/:id` - Get room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Guests
- `GET /api/guests` - List guests
- `POST /api/guests` - Register guest
- `GET /api/guests/:id` - Get guest
- `PUT /api/guests/:id` - Update guest
- `POST /api/guests/:id/points` - Add loyalty points

### Services
- `GET /api/services` - List services
- `POST /api/services/request` - Request service
- `GET /api/services/requests` - Get requests

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/pay` - Pay invoice

### Analytics
- `GET /api/analytics` - Dashboard analytics

### Twins
- `GET /api/twins` - All twins
- `POST /api/twins/sync` - Sync twins

### Health
- `GET /health` - Health check

## Room Types

| Type | Description |
|------|-------------|
| Standard | Basic room |
| Deluxe | Enhanced amenities |
| Suite | Premium suite |
| Executive | Business travelers |
| Presidential | Luxury suite |