# REZ Now Backend API Documentation

## Overview

This document describes the backend API endpoints for the REZ Now store pages, including store links management, analytics tracking, QR code generation, services catalog, and gallery management.

**Base URL:** `https://api.rez.money` (production)
**Service:** `rez-merchant-service` (port 4005)

All endpoints require merchant authentication via Bearer token.

---

## Table of Contents

1. [Store Links](#store-links)
2. [Store Analytics](#store-analytics)
3. [QR Code Generation](#qr-code-generation)
4. [Services Catalog](#services-catalog)
5. [Gallery Management](#gallery-management)

---

## Store Links

Manage configurable links for REZ Now store pages (website, menu, reservation, order, contact, social).

### Get Store Links

```
GET /api/merchant/store-links/:storeId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storeId": "string",
    "links": [
      {
        "id": "string",
        "type": "website" | "menu" | "reservation" | "order" | "contact" | "social",
        "title": "string",
        "url": "string",
        "icon": "string | null",
        "order": 0,
        "clickCount": 0
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

### Update Store Links

```
POST /api/merchant/store-links/:storeId
```

**Request Body:**
```json
{
  "links": [
    {
      "id": "link_123",
      "type": "menu",
      "title": "View Menu",
      "url": "https://example.com/menu",
      "icon": "utensils",
      "order": 0
    }
  ]
}
```

### Update Single Link

```
PATCH /api/merchant/store-links/:storeId/:linkId
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "url": "https://example.com/new-url",
  "order": 1
}
```

### Delete Link

```
DELETE /api/merchant/store-links/:storeId/:linkId
```

### Track Link Click

```
POST /api/merchant/store-links/:storeId/:linkId/click
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clickCount": 42
  }
}
```

---

## Store Analytics

Track events and retrieve analytics dashboard data for REZ Now store pages.

### Record Analytics Event

```
POST /api/merchant/store-analytics/:storeId/event
```

**Request Body:**
```json
{
  "eventType": "link_click" | "qr_scan" | "page_view" | "download",
  "eventData": {
    "key": "value"
  },
  "timestamp": "ISO8601",
  "linkId": "string"
}
```

**Device Detection:** Automatically detected from `User-Agent` header.

### Get Analytics Dashboard

```
GET /api/merchant/store-analytics/:storeId/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 1234,
    "totalClicks": 567,
    "totalScans": 89,
    "topLinks": [
      { "linkId": "abc123", "clicks": 45 }
    ],
    "deviceBreakdown": {
      "mobile": 600,
      "tablet": 100,
      "desktop": 534
    }
  }
}
```

### Get Timeline Data

```
GET /api/merchant/store-analytics/:storeId/timeline?days=30&eventType=page_view
```

**Parameters:**
- `days` (optional): Number of days to fetch (default: 30, max: 365)
- `eventType` (optional): Filter by event type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-05-01",
      "views": 45,
      "clicks": 12,
      "scans": 3
    }
  ]
}
```

---

## QR Code Generation

Generate styled QR codes for stores and links.

### Generate QR Code

```
POST /api/merchant/qr/generate
```

**Request Body:**
```json
{
  "storeId": "string",
  "type": "store" | "menu" | "reservation" | "custom",
  "url": "https://example.com/store",
  "style": {
    "foregroundColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "width": 300,
    "margin": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "storeId": "string",
    "type": "store",
    "url": "https://example.com/store",
    "qrCode": "data:image/png;base64,...",
    "style": {
      "foregroundColor": "#000000",
      "backgroundColor": "#FFFFFF",
      "width": 300,
      "margin": 2
    }
  }
}
```

### Generate QR Code PNG

```
POST /api/merchant/qr/generate/png
```

**Request Body:**
```json
{
  "storeId": "string",
  "url": "https://example.com/store",
  "style": {
    "foregroundColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "width": 300
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "png": "base64-encoded-png-data"
  }
}
```

### Get QR Codes for Store Links

```
GET /api/merchant/qr/:storeId/links?baseUrl=https://rez.money
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "linkId": "abc123",
      "type": "menu",
      "title": "View Menu",
      "url": "https://example.com/menu",
      "qrCode": "data:image/png;base64,..."
    }
  ]
}
```

---

## Services Catalog

Manage services and appointments for appointment-based businesses (salons, spas, etc.).

### List Services

```
GET /api/merchant/rez-now-services/:storeId?category=hair&active=true
```

**Parameters:**
- `category` (optional): Filter by category
- `active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "storeId": "string",
      "name": "Haircut",
      "description": "Professional haircut service",
      "price": 500,
      "duration": 45,
      "category": "hair",
      "staff": [
        { "id": "staff123", "name": "John Doe" }
      ],
      "images": ["https://example.com/image.jpg"],
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

### Create Service

```
POST /api/merchant/rez-now-services/:storeId
```

**Request Body:**
```json
{
  "name": "Haircut",
  "description": "Professional haircut service",
  "price": 500,
  "duration": 45,
  "category": "hair",
  "staff": ["staff-id-1", "staff-id-2"],
  "images": ["https://example.com/image.jpg"],
  "isActive": true,
  "sortOrder": 0
}
```

### Update Service

```
PUT /api/merchant/rez-now-services/:storeId/:serviceId
```

### Delete Service

```
DELETE /api/merchant/rez-now-services/:storeId/:serviceId
```

---

## Appointments

### List Appointments

```
GET /api/merchant/rez-now-services/appointments/:storeId?status=pending&limit=50
```

**Parameters:**
- `status` (optional): pending, confirmed, completed, cancelled
- `staffId` (optional): Filter by staff
- `startDate` (optional): ISO8601 date
- `endDate` (optional): ISO8601 date
- `limit` (optional): Max results (default: 50, max: 100)
- `skip` (optional): Pagination offset

### Create Appointment

```
POST /api/merchant/rez-now-services/appointments
```

**Request Body:**
```json
{
  "serviceId": "service-id",
  "storeId": "store-id",
  "staffId": "staff-id",
  "customerId": "customer-id",
  "dateTime": "2026-05-15T10:00:00Z",
  "notes": "Special requests",
  "customerName": "Jane Doe",
  "customerPhone": "+919876543210"
}
```

**Note:** Automatically calculates end time based on service duration. Returns 409 Conflict if time slot conflicts with existing appointment.

### Update Appointment

```
PATCH /api/merchant/rez-now-services/appointments/:appointmentId
```

**Request Body:**
```json
{
  "status": "confirmed",
  "dateTime": "2026-05-15T11:00:00Z",
  "notes": "Updated notes"
}
```

### Cancel Appointment

```
DELETE /api/merchant/rez-now-services/appointments/:appointmentId
```

---

## Gallery Management

Manage store portfolio and media gallery.

### List Gallery Items

```
GET /api/merchant/gallery/:storeId?type=image&category=interior&active=true
```

**Parameters:**
- `type` (optional): image or video
- `category` (optional): Filter by category
- `active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "storeId": "string",
      "type": "image",
      "url": "https://example.com/image.jpg",
      "caption": "Store Interior",
      "category": "interior",
      "sortOrder": 0,
      "isActive": true,
      "metadata": {
        "width": 1920,
        "height": 1080,
        "thumbnail": "https://example.com/thumb.jpg"
      },
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

### Add Gallery Items

```
POST /api/merchant/gallery/:storeId
```

**Request Body (single item):**
```json
{
  "type": "image",
  "url": "https://example.com/image.jpg",
  "caption": "Store Interior",
  "category": "interior",
  "isActive": true,
  "metadata": {
    "width": 1920,
    "height": 1080
  }
}
```

**Request Body (batch):**
```json
{
  "items": [
    { "type": "image", "url": "..." },
    { "type": "video", "url": "..." }
  ]
}
```

### Update Gallery Item

```
PATCH /api/merchant/gallery/:storeId/:itemId
```

### Delete Gallery Item

```
DELETE /api/merchant/gallery/:storeId/:itemId
```

### Reorder Gallery Items

```
POST /api/merchant/gallery/:storeId/reorder
```

**Request Body:**
```json
{
  "items": [
    { "id": "item-1", "sortOrder": 0 },
    { "id": "item-2", "sortOrder": 1 },
    { "id": "item-3", "sortOrder": 2 }
  ]
}
```

---

## Client SDK

Frontend clients can use the SDK at `rez-now/lib/api/`:

```typescript
import {
  // Store Links
  getStoreLinks,
  updateStoreLinks,
  updateStoreLink,
  deleteStoreLink,
  trackLinkClick,

  // QR Codes
  generateQRCode,
  generateQRCodePNG,
  getStoreLinkQRCodes,
  downloadQRCode,

  // Services
  getServices,
  createService,
  getService,
  updateService,
  deleteService,

  // Appointments
  getAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,

  // Gallery
  getGalleryItems,
  addGalleryItems,
  updateGalleryItem,
  deleteGalleryItem,
  reorderGalleryItems,

  // Analytics
  recordStoreEvent,
  getStoreAnalyticsDashboard,
  getStoreTimeline,
  trackPageView,
  trackStoreLinkClick,
} from '@/lib/api';
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (not owner)
- `404` - Not Found
- `409` - Conflict (e.g., appointment slot taken)
- `500` - Internal Server Error

---

## Rate Limiting

The API uses rate limiting (300 requests per 15 minutes). For batch operations, use the bulk endpoints where available.
