# HOSPITALITY VERTICAL - Complete Documentation

**Date:** May 10, 2026  
**Version:** 1.0

---

## SERVICES

| Service | Path | Purpose |
|---------|------|---------|
| Hotel OTA | `Hotel-OTA/` | Complete hotel booking platform |
| Hotel Service | `rez-hotel-service/` | Property management |
| StayOwn | `rez-habixo-service/` | Home rentals |
| Room QR | `verify-service/` | In-room ordering |

---

## FEATURES (68+)

### Booking Engine
- Real-time availability
- Multi-property management
- Channel manager integration
- Dynamic pricing
- Promo codes & discounts
- Corporate rates
- Group bookings
- Cancellation policies

### Room Service
- Digital menus
- Housekeeping requests
- Maintenance requests
- Guest messaging
- Wake-up calls
- Restaurant integration

### Front Desk
- Check-in/out
- Room status tracking
- Guest messaging
- Incident logging
- Key card management
- Bell service requests

### Housekeeping
- Task management
- Room inspection
- Staff scheduling
- Supply inventory
- Laundry tracking
- Lost & found

### Revenue Management
- Dynamic pricing engine
- Occupancy analytics
- RevPAR tracking
- Forecast reports
- Competitive analysis
- Rate shopping

---

## REZ MIND INTEGRATION

All hospitality services are powered by REZ Mind for:
- Personalized guest recommendations
- Predictive pricing
- Sentiment analysis
- Automated responses
- Revenue optimization

---

## API ENDPOINTS

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/hotels | List properties |
| POST | /api/bookings | Create reservation |
| PATCH | /api/rooms/{id}/status | Update room status |

---

## DEPLOYMENT

| Component | URL |
|-----------|-----|
| Hotel OTA Web | https://hotel-ota.vercel.app |
| Hotel API | https://hotel-ota-api.onrender.com |
| Admin Panel | https://hotel-ota-admin.vercel.app |

---

**Last Updated:** May 10, 2026
