# REZ Sales Tax Service

**Port:** 4310  
**Company:** RABTUL Technologies  
**Category:** Regional Compliance - Tax

## Overview

Regional Sales Tax Compliance Service supporting US States, Canada GST/HST/PST, and India GST calculations.

## Features

- **US Sales Tax**: 50 states + DC with base rates
- **Canada GST/HST/PST**: All provinces and territories
- **India GST**: 0%, 5%, 12%, 18%, 28% slabs
- **Nexus Management**: Track business tax obligations
- **Batch Calculations**: Multiple tax calculations in one request

## API Endpoints

### Health
```
GET /health
```

### Tax Rates
```
GET /api/rates/us        # US state tax rates
GET /api/rates/canada    # Canada provincial rates
GET /api/rates/india     # India GST rates
```

### Tax Calculations
```
POST /api/calculate/us       # Calculate US sales tax
POST /api/calculate/canada   # Calculate Canada GST/HST/PST
POST /api/calculate/india    # Calculate India GST
POST /api/batch-calculate    # Batch calculations
```

### Nexus Management
```
POST /api/nexus              # Register nexus
GET /api/nexus/:businessId   # Get business nexus
```

### Records
```
GET /api/records             # List all records
GET /api/records/:recordId   # Get specific record
```

## Quick Start

```bash
npm install
npm start
```

## Environment

No external environment variables required.

## License

MIT
