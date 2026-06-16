# REZ SEPA Payment Service

**Port:** 4312  
**Company:** RABTUL Technologies  
**Category:** Regional Compliance - European Payments

## Overview

SEPA (Single Euro Payments Area) Payment Service supporting SEPA Credit Transfers (SCT) and Direct Debits (SDD) with IBAN/BIC validation.

## Features

- **IBAN Validation**: Full IBAN validation including MOD-97 checksum
- **BIC Validation**: SWIFT/BIC code format validation
- **Credit Transfers**: SEPA SCT for bank-to-bank transfers
- **Direct Debits**: SEPA SDD with mandate management
- **Mandate Management**: Create, update, cancel mandates
- **Virtual Accounts**: Account registration and management

## API Endpoints

### Health
```
GET /health
```

### Validation
```
POST /api/validate/iban     # Validate IBAN
POST /api/validate/bic       # Validate BIC/SWIFT
```

### Payments
```
POST /api/credit-transfer   # Create SEPA credit transfer
POST /api/direct-debit      # Create SEPA direct debit
GET /api/payments           # List payments
GET /api/payments/:id       # Get payment details
```

### Mandates
```
POST /api/mandates          # Create mandate
GET /api/mandates           # List mandates
GET /api/mandates/:id       # Get mandate details
PATCH /api/mandates/:id     # Update mandate status
```

### Accounts
```
POST /api/accounts          # Create virtual account
GET /api/accounts/:id       # Get account details
```

### Reference
```
GET /api/countries          # List SEPA countries
```

## Quick Start

```bash
npm install
npm start
```

## License

MIT
