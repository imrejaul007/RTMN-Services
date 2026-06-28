# Review Collection Service - HOJAI SiteOS

> **Service:** Review Collection Service
> **Port:** 5480
> **Type:** REST API Microservice
> **Status:** Production Ready

A microservice for actively collecting and managing product reviews. Part of the HOJAI SiteOS Commerce suite.

## Quick Start

```bash
cd review-collection
npm install
npm start        # Start server on port 5480
npm test         # Run vitest tests
```

## Authentication

All endpoints (except `/health`) require API key authentication:

```
Header: X-API-Key: your-api-key
Header: X-Company-Id: company-uuid
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns service health status.

---

### Send Review Request

```bash
POST /api/reviews/request
```

Schedule a review request to be sent via email or WhatsApp.

**Request Body:**
```json
{
  "companyId": "company-uuid",
  "customerId": "customer-uuid",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "productId": "product-uuid",
  "orderId": "order-uuid",
  "channel": "email|whatsapp",
  "scheduledFor": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "pending",
    "channel": "email"
  },
  "message": "Review request email scheduled"
}
```

---

### Submit Review

```bash
POST /api/reviews/submit
```

Submit a new product review.

**Request Body:**
```json
{
  "companyId": "company-uuid",
  "productId": "product-uuid",
  "orderId": "order-uuid",
  "customerId": "customer-uuid",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "rating": 5,
  "title": "Great Product!",
  "content": "Really loved the quality and fast delivery.",
  "images": ["https://example.com/image1.jpg"],
  "verified": true,
  "source": "website"
}
```

**Validation:**
- `rating` must be 1-5
- `companyId`, `productId`, `customerId` are required

**Response:**
```json
{
  "success": true,
  "data": {
    "reviewId": "uuid",
    "status": "pending",
    "sentiment": "positive",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Review submitted successfully"
}
```

---

### Get Review by ID

```bash
GET /api/reviews/:reviewId
Headers: X-Company-Id: company-uuid
```

---

### Get Product Reviews

```bash
GET /api/reviews/product/:productId?status=approved
Headers: X-Company-Id: company-uuid
```

Query parameters:
- `status`: Filter by status (`pending`, `approved`, `rejected`). Default: `approved`

---

### Get Customer Reviews

```bash
GET /api/reviews/customer/:customerId
Headers: X-Company-Id: company-uuid
```

---

### Update Review

```bash
PUT /api/reviews/:reviewId
Headers: X-Company-Id: company-uuid
```

**Request Body:**
```json
{
  "rating": 4,
  "title": "Updated title",
  "content": "Updated content"
}
```

---

### Moderate Review

```bash
PUT /api/reviews/:reviewId/moderate
Headers: X-Company-Id: company-uuid
```

**Request Body:**
```json
{
  "decision": "approved|rejected",
  "moderatorNotes": "Optional notes"
}
```

---

### Delete Review

```bash
DELETE /api/reviews/:reviewId
Headers: X-Company-Id: company-uuid
```

---

### Get Review Statistics

```bash
GET /api/reviews/stats?productId=optional
Headers: X-Company-Id: company-uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "approved": 120,
    "pending": 20,
    "rejected": 10,
    "verified": 80,
    "averageRating": 4.2,
    "ratingDistribution": { "1": 5, "2": 10, "3": 25, "4": 40, "5": 40 },
    "sentimentDistribution": { "positive": 80, "neutral": 30, "negative": 10 },
    "totalHelpful": 250,
    "withImages": 45,
    "withOwnerResponse": 35
  }
}
```

---

### Add Owner Response

```bash
POST /api/reviews/:reviewId/respond
Headers: X-Company-Id: company-uuid
```

**Request Body:**
```json
{
  "response": "Thank you for your feedback!"
}
```

---

### Mark Review Helpful

```bash
POST /api/reviews/:reviewId/helpful
Headers: X-Company-Id: company-uuid
```

---

## Review Schema

```javascript
{
  reviewId: string (UUID),
  companyId: string,
  productId: string,
  orderId: string,
  customerId: string,
  customerName: string,
  customerEmail: string,
  rating: number (1-5),
  title: string,
  content: string,
  images: string[],
  verified: boolean,
  helpful: number,
  status: 'pending' | 'approved' | 'rejected',
  ownerResponse: string,
  ownerResponseAt: timestamp,
  sentiment: 'positive' | 'neutral' | 'negative',
  source: 'website' | 'email' | 'whatsapp',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Features

### Auto-Sentiment Analysis
Reviews are automatically analyzed for sentiment based on keywords:
- **Positive:** excellent, amazing, great, love, perfect, best, etc.
- **Negative:** terrible, awful, horrible, waste, broken, disappointed, etc.
- **Neutral:** No strong sentiment keywords detected

### Verified Purchase Badge
Reviews from actual purchasers are marked with `verified: true`.

### Helpful Vote Counting
Users can mark reviews as helpful, tracked via the `helpful` counter.

### Average Rating Calculation
Statistics endpoint calculates:
- Average rating per product/company
- Rating distribution (1-5 stars)
- Sentiment distribution

### Review Request Scheduling
Schedule review requests to be sent:
- X days after delivery
- Via email or WhatsApp
- Customizable message templates

## Data Storage

Reviews are persisted to JSON files:
```
/tmp/siteos-reviews-{companyId}.json
/tmp/siteos-review-requests-{companyId}.json
```

## File Structure

```
review-collection/
├── package.json
├── vitest.config.js
├── CLAUDE.md
├── src/
│   ├── index.js              # Main Express app
│   ├── middleware/
│   │   └── auth.js           # API key authentication
│   └── services/
│       └── reviewService.js  # Business logic
└── __tests__/
    └── unit/
        └── review-collection.test.js
```

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common status codes:
- `400` - Bad request / validation error
- `401` - Missing or invalid API key
- `404` - Resource not found
- `500` - Internal server error

---

**Service Version:** 1.0.0
**Last Updated:** June 2026
