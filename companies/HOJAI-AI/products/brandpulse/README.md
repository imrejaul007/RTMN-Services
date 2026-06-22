# HOJAI BrandPulse

Brand intelligence and sentiment analysis service for the RTNM ecosystem.

## Features

- **Sentiment Analysis**: AFINN-based sentiment analysis with aspect extraction
- **Review Management**: Collect, moderate, and manage reviews from multiple sources
- **Brand Analytics**: Comprehensive brand health metrics and trends
- **Alert System**: Real-time alerts for negative reviews and sentiment spikes
- **RTNM Integration**: Seamless integration with RTNM Gateway

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+ (optional)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Brands
- `POST /api/v1/brands` - Create brand
- `GET /api/v1/brands/:brandId` - Get brand
- `PATCH /api/v1/brands/:brandId` - Update brand
- `DELETE /api/v1/brands/:brandId` - Delete brand

### Reviews
- `POST /api/v1/reviews` - Create review
- `POST /api/v1/reviews/bulk` - Bulk import
- `GET /api/v1/reviews/brand/:brandId` - List reviews
- `PATCH /api/v1/reviews/:reviewId/moderate` - Moderate review

### Analytics
- `GET /api/v1/analytics/brand/:brandId/overview` - Brand overview
- `GET /api/v1/analytics/brand/:brandId/sentiment` - Sentiment trend
- `GET /api/v1/analytics/brand/:brandId/ratings` - Rating distribution
- `GET /api/v1/analytics/brand/:brandId/aspects` - Aspect analysis

### Sentiment
- `POST /api/v1/sentiment/analyze` - Analyze text
- `POST /api/v1/sentiment/analyze/batch` - Batch analysis

## RTNM Integration

BrandPulse integrates with RTNM Gateway for:
- Brand context synchronization
- Customer loyalty rewards
- Alert notifications
- Signal emission

### Webhooks

- `POST /webhook/rtnm/reviews` - Receive reviews from RTNM
- `POST /webhook/rtnm/sentiment` - Trigger sentiment aggregation

## Docker

```bash
# Build
docker build -t hojai/brandpulse .

# Run
docker-compose up -d
```

## License

MIT
