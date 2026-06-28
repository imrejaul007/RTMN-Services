# Brand OS

Brand guidelines management, asset library, and brand compliance checking.

**Port:** 4879

## Purpose

Brand OS provides centralized brand management with guidelines, asset storage, color/font specifications, and compliance verification for brand consistency across all touchpoints.

## Features

- Brand asset management and storage
- Brand guidelines with versioning
- Color palette management
- Typography guidelines
- Brand compliance checking
- Asset tagging and categorization
- Brand export for external use
- Compliance audit trail

## API Endpoints

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets |
| GET | `/api/assets/:id` | Get asset details |
| POST | `/api/assets` | Upload asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |

### Guidelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guidelines` | List guidelines |
| GET | `/api/guidelines/:id` | Get guideline |
| POST | `/api/guidelines` | Create guideline |
| PUT | `/api/guidelines/:id` | Update guideline |

### Colors & Fonts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/colors` | Get color palette |
| GET | `/api/fonts` | Get font specifications |

### Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance` | List compliance checks |
| POST | `/api/compliance/check` | Run compliance check |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export` | Export brand package |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Request/Response Examples

### Upload Asset

```bash
curl -X POST http://localhost:4879/api/assets \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Logo Primary",
    "type": "logo",
    "url": "https://cdn.example.com/brand/logo-primary.png",
    "tags": ["primary", "horizontal", "brand-approved"],
    "uploadedBy": "designer@company.com",
    "size": 45000,
    "format": "png"
  }'
```

### Create Guideline

```bash
curl -X POST http://localhost:4879/api/guidelines \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Social Media Guidelines",
    "category": "digital",
    "content": "Use brand colors in all posts. Maintain 4:5 aspect ratio for Instagram. Include logo in footer.",
    "version": "1.0"
  }'
```

### Run Compliance Check

```bash
curl -X POST http://localhost:4879/api/compliance/check \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "assetId": "asset-123",
    "guidelineId": "logo"
  }'
```

### Export Brand Package

```bash
curl http://localhost:4879/api/export
```

## Default Brand Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary | #0066FF | 0, 102, 255 | Main brand color, CTAs |
| Secondary | #00AA66 | 0, 170, 102 | Accent color |
| Dark | #1A1A1A | 26, 26, 26 | Text and headers |
| Light | #F5F5F5 | 245, 245, 245 | Backgrounds |
| Accent | #FF6B35 | 255, 107, 53 | Highlights |

## Default Fonts

| Name | Family | Weights | Usage |
|------|--------|---------|-------|
| Inter | Inter, sans-serif | 400, 500, 600, 700 | Body text |
| Roboto | Roboto, sans-serif | 400, 500, 700 | Headings |

## Default Guidelines

| ID | Name | Category | Version |
|----|------|---------|---------|
| logo | Logo Usage | identity | 2.0 |
| colors | Color Palette | identity | 1.5 |
| typography | Typography | identity | 1.2 |
| voice | Brand Voice | tone | 1.0 |
| imagery | Imagery Guidelines | visuals | 1.1 |

## Asset Types

| Type | Description |
|------|-------------|
| `logo` | Brand logos |
| `icon` | Icons and symbols |
| `photo` | Photography |
| `illustration` | Illustrations |
| `template` | Design templates |
| `document` | Brand documents |

## Guideline Categories

| Category | Description |
|----------|-------------|
| `identity` | Core brand identity |
| `tone` | Voice and tone |
| `visuals` | Visual elements |
| `digital` | Digital applications |
| `print` | Print materials |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4879 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
```
