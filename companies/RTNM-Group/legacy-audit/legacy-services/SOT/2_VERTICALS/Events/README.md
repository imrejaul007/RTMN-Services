# EVENTS VERTICAL - Complete Documentation

**Date:** May 11, 2026  
**Version:** 1.0

---

## OVERVIEW

Events vertical covers event discovery, booking, and management across the ReZ platform.

---

## SERVICES

| Service | Path | Purpose |
|---------|------|---------|
| Event Booking | `rez-event-platform/` | Event discovery & tickets |
| Event Management | `rez-booking-service/` | Event scheduling |

---

## FEATURES

| Feature | Description |
|---------|-------------|
| Event Discovery | Browse by category, location |
| Ticket Booking | Purchase tickets online |
| Event Creation | Create and manage events |
| Seat Selection | Choose seats/tickets |
| QR Entry | Digital tickets with QR |
| Guest Management | Attendee lists |
| Analytics | Event performance |

---

## EVENT TYPES

| Type | Examples |
|------|----------|
| Concerts | Music, DJ nights |
| Sports | Matches, tournaments |
| Workshops | Learning, training |
| Conferences | Business events |
| Festivals | Cultural events |
| Meetups | Community gatherings |

---

## API ENDPOINTS

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/events | List events |
| POST | /api/events | Create event |
| GET | /api/events/:id | Event details |
| POST | /api/bookings | Book tickets |
| GET | /api/bookings/:id | Booking details |

---

## INTEGRATION POINTS

| Service | Connection |
|---------|------------|
| `rez-auth-service` | User authentication |
| `rez-payment-service` | Payment processing |
| `REZ Mind` | Event recommendations |
| `rez-notifications` | Event alerts |

---

**Last Updated:** May 11, 2026
