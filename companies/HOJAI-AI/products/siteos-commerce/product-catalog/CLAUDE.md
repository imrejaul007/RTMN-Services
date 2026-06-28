# HOJAI SiteOS Product Catalog Service

**Version:** 1.0.0
**Port:** 5476
**Service:** `@hojai/siteos-product-catalog`

REST API microservice for managing product catalogs in the HOJAI SiteOS ecosystem. Provides CRUD operations, search, filtering, pagination, and category management.

## Quick Start

```bash
# Install dependencies
cd products/siteos-commerce/product-catalog
npm install

# Start the service
npm start
# Service runs on http://localhost:5476

# Run tests
npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PRODUCT_CATALOG_PORT` | `5476` | Service port |
| `PRODUCT_CATALOG_STORAGE` | `/tmp` | JSON file storage directory |
| `PRODUCT_CATALOG_REQUIRE_AUTH` | `true` | Require API key authentication |
| `PRODUCT_CATALOG_API_KEY` | `dev-api-key` | API key for authentication |

## Authentication

All `/api/*` endpoints require Bearer token authentication:

```bash
curl -H "Authorization: Bearer your-api-key" \
     -H "x-company-id: your-company-id" \
     http://localhost:5476/api/products
```

Set `PRODUCT_CATALOG_REQUIRE_AUTH=false` for development mode (auth disabled).

## API Endpoints

### Health & Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/` | Service info and endpoint list |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products with pagination |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/products/search` | Search products |
| `POST` | `/api/products` | Create product (admin) |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Delete product |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/categories` | List categories |
| `POST` | `/api/categories` | Create category |

## Product Schema

```javascript
{
  id: string,              // UUID v4
  companyId: string,       // Company identifier
  name: string,            // Product name (required)
  description: string,     // Product description
  price: number,           // Current price (>= 0)
  compareAtPrice: number,  // Original/suggested price
  category: string,        // Category name
  images: string[],        // Image URLs
  variants: [              // Product variants
    {
      id: string,
      name: string,        // e.g., "Small", "Large"
      price: number,
      inventory: number
    }
  ],
  inventory: number,       // Total stock count
  sku: string,             // Stock Keeping Unit
  tags: string[],          // Searchable tags
  status: string,          // 'active' | 'draft' | 'archived'
  createdAt: string,       // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

## API Examples

### List Products with Pagination

```bash
curl -X GET "http://localhost:5476/api/products?limit=10&offset=0" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"
```

Response:
```json
{
  "products": [...],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Filter Products

```bash
# Filter by category
curl -X GET "http://localhost:5476/api/products?category=electronics" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"

# Filter by status
curl -X GET "http://localhost:5476/api/products?status=active" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"

# Filter by price range
curl -X GET "http://localhost:5476/api/products?minPrice=10&maxPrice=100" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"
```

### Search Products

```bash
curl -X POST "http://localhost:5476/api/products/search" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "wireless",
    "category": "electronics",
    "minPrice": 50,
    "maxPrice": 500,
    "tags": ["sale"],
    "limit": 20,
    "offset": 0
  }'
```

### Create Product

```bash
curl -X POST "http://localhost:5476/api/products" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Premium noise-canceling headphones",
    "price": 199.99,
    "compareAtPrice": 249.99,
    "category": "electronics",
    "images": ["https://example.com/headphones.jpg"],
    "variants": [
      {"name": "Black", "price": 199.99, "inventory": 50},
      {"name": "White", "price": 199.99, "inventory": 30}
    ],
    "inventory": 80,
    "sku": "WH-001",
    "tags": ["wireless", "audio", "sale"],
    "status": "active"
  }'
```

### Update Product

```bash
curl -X PUT "http://localhost:5476/api/products/PRODUCT_ID" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 179.99,
    "inventory": 100,
    "status": "active"
  }'
```

### Delete Product

```bash
curl -X DELETE "http://localhost:5476/api/products/PRODUCT_ID" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"
```

### Manage Categories

```bash
# Create category
curl -X POST "http://localhost:5476/api/categories" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics", "description": "Electronic devices"}'

# List categories with product counts
curl -X GET "http://localhost:5476/api/categories?includeCount=true" \
  -H "Authorization: Bearer dev-api-key" \
  -H "x-company-id: my-company"
```

## Data Storage

Products are stored as JSON files in the configured storage directory:

```
/tmp/siteos-products-{companyId}.json
/tmp/siteos-categories-{companyId}.json
```

Each company has its own isolated data file.

## Validation Rules

| Field | Rules |
|-------|-------|
| `name` | Required, non-empty string |
| `price` | Non-negative number |
| `compareAtPrice` | Non-negative number |
| `status` | One of: `active`, `draft`, `archived` |
| `images` | Array of strings |
| `variants` | Array of objects with `name`, `price` (>=0), `inventory` (>=0) |
| `tags` | Array of strings |
| `sku` | Must be unique within company |

## Error Responses

```json
{
  "error": "error message",
  "details": ["validation error 1", "validation error 2"]
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Validation error or bad request |
| 401 | Missing bearer token |
| 403 | Invalid API key |
| 404 | Resource not found |
| 409 | Conflict (duplicate SKU/category) |
| 500 | Internal server error |

## Integration

This service is part of the HOJAI SiteOS suite and can be integrated with:

- **SiteOS Gateway** (port 5450) - API gateway
- **Business Context Wrapper** (port 5451) - Business logic
- **Channel Stitcher** (port 5452) - Multi-channel publishing
- **Review Scrapers** (port 5456) - Social proof aggregation
- **Lookalike Generator** (port 5457) - Audience expansion
- **Lead Scoring** (port 5458) - Conversion optimization

## Testing

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Watch mode
npm test -- --watch
```

## Files

```
product-catalog/
├── package.json           # Package configuration
├── vitest.config.js       # Test configuration
├── CLAUDE.md              # This documentation
├── src/
│   └── index.js           # Main service implementation
└── __tests__/
    └── unit/
        └── product-catalog.test.js  # Unit tests (15 tests)
```