# HOJAI BrandPulse Dashboard

Real-time brand analytics dashboard.

## Quick Start

```bash
npm install
npm run dev
```

## Usage

Visit: http://localhost:4780/?brandId=demo-brand

Make sure BrandPulse API is running on port 4770 first.

## Generate Demo Data

```bash
curl -X POST http://localhost:4770/api/v1/demo/generate \
  -H "Content-Type: application/json" \
  -d '{"brandName":"Demo Hotel","industry":"hotel"}'
```
