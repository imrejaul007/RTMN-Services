# AdBazaar Knowledge Base Service

Self-service knowledge base management for AdBazaar support operations.

## Features

- Create and manage support articles
- Hierarchical category structure
- Full-text search
- Article feedback tracking
- Popular articles tracking
- Related articles suggestions
- Tag-based organization

## API Endpoints

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/articles` | Create a new article |
| GET | `/api/articles` | List articles with filters |
| GET | `/api/articles/search` | Search articles |
| GET | `/api/articles/popular` | Get popular articles |
| GET | `/api/articles/:id` | Get article by ID |
| GET | `/api/articles/slug/:slug` | Get article by slug |
| PUT | `/api/articles/:id` | Update article |
| DELETE | `/api/articles/:id` | Delete article |
| POST | `/api/articles/:id/feedback` | Record article feedback |
| GET | `/api/articles/:id/related` | Get related articles |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/categories` | Create a new category |
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/tree` | Get category tree |
| GET | `/api/categories/:id` | Get category by ID |
| GET | `/api/categories/slug/:slug` | Get category by slug |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |
| POST | `/api/categories/reorder` | Reorder categories |

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 5083 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/knowledge-base |
| LOG_LEVEL | Logging level | info |
| SERVICE_API_KEY | API key for authentication | adbazaar-service-key |
| INTERNAL_SERVICE_TOKEN | Internal service token | - |

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Health Check

```bash
curl http://localhost:5083/health
```

## Metrics

Prometheus metrics available at `/metrics`.

## License

Proprietary - AdBazaar