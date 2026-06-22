# Room QR Backend API Documentation

## Overview

This document describes the Room QR backend API endpoints for the Hotel OTA (Stayeon) service. These endpoints enable guests to access room services via QR codes in their hotel rooms.

**Base URL:** `https://hotel-ota-api.onrender.com/v1`

**Authentication:** Bearer JWT token (obtained via REZ SSO)

---

## Table of Contents

1. [Room Service](#room-service)
   - [Get Room Service Menu](#get-room-service-menu)
   - [Create Room Service Request](#create-room-service-request)
   - [Get My Room Service Requests](#get-my-room-service-requests)
   - [Enhanced Room Service Request](#enhanced-room-service-request)
2. [Minibar](#minibar)
   - [Get Minibar Menu](#get-minibar-menu)
   - [Get Minibar Bill](#get-minibar-bill)
   - [Record Minibar Consumption](#record-minibar-consumption)
3. [Feedback](#feedback)
   - [Submit Guest Feedback](#submit-guest-feedback)
   - [Get Guest Feedback](#get-guest-feedback)
4. [Room Preferences](#room-preferences)
   - [Get Room Preferences](#get-room-preferences)
   - [Update Room Preferences](#update-room-preferences)
5. [Checkout Bill](#checkout-bill)
   - [Get Checkout Bill (Folio)](#get-checkout-bill-folio)
6. [Room Chat](#room-chat)
7. [Room Engagement Tracking](#room-engagement-tracking)

---

## Room Service

### Get Room Service Menu

```
GET /v1/room-service/menu/:hotelId
```

Returns the room service menu for a hotel.

**Response:**
```json
{
  "success": true,
  "data": {
    "beverages": [
      { "id": "tea", "name": "Masala Tea", "pricePaise": 5000, "category": "beverages" }
    ],
    "snacks": [...],
    "meals": [...],
    "housekeeping": [...],
    "laundry": [...]
  }
}
```

---

### Create Room Service Request

```
POST /v1/room-service
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bookingId": "string",
  "roomId": "string",
  "serviceType": "housekeeping | room_service | laundry | maintenance | concierge | spa | transport | fitness",
  "description": "string (optional)",
  "items": [
    {
      "id": "string",
      "name": "string",
      "pricePaise": 0,
      "quantity": 1,
      "category": "string"
    }
  ],
  "priority": "low | medium | high | now"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "bookingId": "string",
    "serviceType": "housekeeping",
    "status": "pending",
    "totalAmountPaise": 0,
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

---

### Get My Room Service Requests

```
GET /v1/room-service/guest/my-requests
```

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [...],
    "page": 1,
    "limit": 20,
    "totalCount": 10,
    "totalPages": 1
  }
}
```

---

### Enhanced Room Service Request

```
POST /v1/room-service/enhanced
```

Create a room service request with priority and scheduling support.

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "hotelId": "string",
  "roomId": "string",
  "guestId": "string (bookingId)",
  "category": "housekeeping | room_service | laundry | maintenance | spa | transport | concierge",
  "itemId": "string (optional)",
  "priority": "low | medium | high | urgent",
  "scheduledFor": "string (ISO datetime, optional)",
  "notes": "string (optional)",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "bookingId": "string",
    "category": "housekeeping",
    "priority": "high",
    "scheduledFor": "2026-05-03T14:00:00Z",
    "notes": "Please clean before 3 PM",
    "totalAmountPaise": 0,
    "status": "pending",
    "createdAt": "2026-05-03T10:00:00Z"
  }
}
```

---

## Minibar

### Get Minibar Menu

```
GET /v1/room-service/minibar/:hotelId/menu
```

**Response:**
```json
{
  "success": true,
  "data": {
    "beverages": [
      { "id": "water_small", "name": "Mineral Water (500ml)", "pricePaise": 2000, "category": "beverages", "isAvailable": true }
    ],
    "snacks": [...],
    "instant": [...]
  }
}
```

---

### Get Minibar Bill

```
GET /v1/room-service/minibar/:roomId/bill
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "string",
    "bookingId": "string",
    "items": [
      {
        "id": "water_small",
        "name": "Mineral Water (500ml)",
        "pricePaise": 2000,
        "quantity": 2,
        "consumedAt": "2026-05-03T10:00:00Z"
      }
    ],
    "subtotalPaise": 4000,
    "taxPaise": 720,
    "totalPaise": 4720
  }
}
```

---

### Record Minibar Consumption

```
POST /v1/room-service/minibar/:roomId/consume
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "itemId": "string",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "itemId": "water_small",
    "quantity": 1,
    "pricePaise": 2000,
    "consumedAt": "2026-05-03T10:00:00Z"
  }
}
```

---

## Feedback

### Submit Guest Feedback

```
POST /v1/room-service/feedback
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bookingId": "string",
  "roomId": "string",
  "overallRating": 4,
  "categories": {
    "cleanliness": 5,
    "service": 4,
    "amenities": 4,
    "comfort": 4
  },
  "comment": "Great stay!",
  "issues": ["noisy corridors"],
  "wouldRecommend": true
}
```

**Validation:**
- `overallRating`: 1-5
- All category ratings: 1-5

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "bookingId": "string",
    "overallRating": 4,
    "wouldRecommend": true,
    "submittedAt": "2026-05-03T10:00:00Z"
  }
}
```

---

### Get Guest Feedback

```
GET /v1/room-service/feedback/:bookingId
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "bookingId": "string",
    "roomId": "string",
    "overallRating": 4,
    "categories": {
      "cleanliness": 5,
      "service": 4,
      "amenities": 4,
      "comfort": 4
    },
    "comment": "Great stay!",
    "issues": ["noisy corridors"],
    "wouldRecommend": true,
    "submittedAt": "2026-05-03T10:00:00Z"
  }
}
```

---

## Room Preferences

### Get Room Preferences

```
GET /v1/room-service/preferences/:guestId/:roomId
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "temperature": 22,
    "lighting": "dim",
    "pillowType": "soft",
    "dietaryRestrictions": ["vegetarian"],
    "allergies": ["dust"],
    "language": "en",
    "isDefault": false,
    "updatedAt": "2026-05-03T10:00:00Z"
  }
}
```

**Default Values (if no preferences set):**
```json
{
  "temperature": 22,
  "lighting": "dim",
  "pillowType": "soft",
  "dietaryRestrictions": [],
  "allergies": [],
  "language": "en",
  "isDefault": true
}
```

---

### Update Room Preferences

```
PUT /v1/room-service/preferences/:guestId/:roomId
```

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "temperature": 24,
  "lighting": "bright",
  "pillowType": "extra_pillows",
  "dietaryRestrictions": ["vegetarian", "vegan"],
  "allergies": ["peanuts", "dust"],
  "language": "hi"
}
```

**Validation:**
- `temperature`: 16-30
- `lighting`: "bright" | "dim" | "dark"
- `pillowType`: "soft" | "firm" | "extra_pillows"
- `language`: "en" | "hi"

**Response:**
```json
{
  "success": true,
  "data": {
    "temperature": 24,
    "lighting": "bright",
    "pillowType": "extra_pillows",
    "dietaryRestrictions": ["vegetarian", "vegan"],
    "allergies": ["peanuts", "dust"],
    "language": "hi",
    "updatedAt": "2026-05-03T10:00:00Z"
  }
}
```

---

## Checkout Bill

### Get Checkout Bill (Folio)

```
GET /v1/room-service/checkout/:bookingId/bill
```

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "string",
    "guestName": "John Doe",
    "roomNumber": "101",
    "checkIn": "2026-05-01T12:00:00Z",
    "checkOut": "2026-05-03T11:00:00Z",
    "roomCharges": [
      {
        "id": "room_charge",
        "description": "Room Charges (2 nights)",
        "quantity": 2,
        "unitPricePaise": 500000,
        "totalPaise": 1000000,
        "date": "2026-05-01T12:00:00Z",
        "category": "room"
      }
    ],
    "minibar": [
      {
        "id": "string",
        "description": "water_small (charged)",
        "quantity": 2,
        "unitPricePaise": 2000,
        "totalPaise": 4000,
        "date": "2026-05-02T10:00:00Z",
        "category": "minibar"
      }
    ],
    "laundry": [],
    "restaurant": [],
    "spa": [],
    "transport": [],
    "other": [],
    "subtotalPaise": 1004000,
    "taxesPaise": 180720,
    "totalPaise": 1184720
  }
}
```

---

## Room Chat

### Get or Create Chat Thread

```
POST /v1/room-chat/threads
```

**Request Body:**
```json
{
  "bookingId": "string",
  "roomId": "string",
  "message": "string (optional initial message)"
}
```

### Get Chat Thread

```
GET /v1/room-chat/threads/:threadId
```

### Send Message

```
POST /v1/room-chat/threads/:threadId/messages
```

**Request Body:**
```json
{
  "content": "string",
  "messageType": "text | image | system"
}
```

---

## Room Engagement Tracking

### Track Engagement Event

```
POST /v1/room-engagement/track
```

**Request Body:**
```json
{
  "bookingId": "string",
  "roomId": "string",
  "roomNumber": "string",
  "hotelId": "string",
  "eventType": "scan | view_menu | order | call_waiter | request_bill | chat_sent | service_requested",
  "metadata": {}
}
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**HTTP Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Types Reference

```typescript
type ServiceType = 'housekeeping' | 'room_service' | 'laundry' | 'maintenance' | 'concierge' | 'spa' | 'transport' | 'fitness';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

type LightingPreference = 'bright' | 'dim' | 'dark';
type PillowPreference = 'soft' | 'firm' | 'extra_pillows';
type LanguagePreference = 'en' | 'hi';

type RoomServiceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
```

---

## Rate Limits

- Public endpoints: 100 requests/minute per IP
- Authenticated endpoints: 500 requests/minute per user
- Engagement tracking: Non-blocking (fire-and-forget)

---

## Changelog

### 2026-05-03
- Added `POST /v1/room-service/enhanced` - Enhanced room service with priority and scheduling
- Added Minibar endpoints (menu, bill, consume)
- Added Guest Feedback endpoints
- Added Room Preferences endpoints (GET/PUT)
- Added Checkout Bill (Folio) endpoint
