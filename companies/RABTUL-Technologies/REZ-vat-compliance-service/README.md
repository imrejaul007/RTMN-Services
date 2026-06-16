# REZ VAT Compliance Service

**Port:** 4311  
**Company:** RABTUL Technologies  
**Category:** Regional Compliance - EU VAT

## Overview

EU VAT Compliance Service supporting VAT number validation, rate calculations, OSS/MOSS registration, and reverse charge determination.

## Features

- **VAT Validation**: Format and checksum validation for EU VAT numbers
- **Rate Calculations**: Standard, reduced, and super-reduced rates for all 27 EU member states
- **Reverse Charge**: B2B cross-border transaction handling
- **OSS Registration**: One-Stop Shop registration for non-resident sellers
- **MOSS Registration**: Mini-One-Stop Shop for non-EU digital services

## API Endpoints

### Health
```
GET /health
```

### VAT Validation
```
POST /api/validate          # Validate VAT number format
```

### Rate Information
```
GET /api/countries          # List EU countries with VAT rates
```

### Tax Calculations
```
POST /api/calculate         # Calculate VAT for an amount
POST /api/reverse-charge    # Check reverse charge applicability
```

### OSS/MOSS Registration
```
POST /api/oss/register      # Register for OSS
POST /api/moss/register     # Register for MOSS
```

### Records
```
GET /api/records            # List compliance records
GET /api/transactions       # List VAT transactions
```

## Quick Start

```bash
npm install
npm start
```

## License

MIT
