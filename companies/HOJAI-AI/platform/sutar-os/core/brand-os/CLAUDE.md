# BrandOS - Port 4879

## Overview
Tone, identity, communication style management.

## Purpose
Maintains brand consistency across AI-generated content.

## Key Features
- Brand identity
- Tone management
- Voice guidelines
- Content templates
- Style enforcement

## API Endpoints

### Brands
- `GET /api/brands` - List brands
- `POST /api/brands` - Create brand
- `GET /api/brands/:id` - Get brand

### Generation
- `POST /api/generate` - Generate content

## Brand Types
- `corporate` - Corporate brand
- `product` - Product brand
- `campaign` - Campaign brand
- `personal` - Personal brand

## Tone Options
- `formal` - Formal
- `professional` - Professional
- `friendly` - Friendly
- `casual` - Casual
- `bold` - Bold

## Tests
Vitest tests: `__tests__/brand-os.test.ts`

## Environment
- Port: 4879

## Startup
```bash
cd platform/sutar-os/core/brand-os && npm run dev
```
