# REZ WPS Service

**Port:** 4313  
**Company:** RABTUL Technologies  
**Category:** Regional Compliance - UAE WPS

## Overview

UAE Wage Protection System (WPS) Compliance Service for managing employee salaries, MOL file generation, and government submission.

## Features

- **Company Registration**: MOL and establishment card validation
- **Employee Management**: Register and manage employees under WPS
- **IBAN Validation**: UAE IBAN format and checksum validation
- **MOL File Generation**: Generate compliant WPS salary files
- **Payment Tracking**: Record and track salary payments
- **Bank Integration**: Support for 16 WPS-participating UAE banks

## API Endpoints

### Health
```
GET /health
```

### Validation
```
POST /api/validate/iban           # Validate UAE IBAN
POST /api/validate/establishment  # Validate establishment card
POST /api/validate/mol            # Validate MOL number
```

### Companies
```
POST /api/companies               # Register company
GET /api/companies                # List companies
```

### Employees
```
POST /api/employees               # Register employee
GET /api/employees                # List employees
```

### Salary Files
```
POST /api/salary/file             # Generate MOL WPS file
GET /api/salary/files             # List WPS file submissions
GET /api/salary/files/:id         # Get file details
PATCH /api/salary/files/:id/status # Update file status
```

### Payments
```
POST /api/payments                # Record salary payment
GET /api/payments                 # List payments
```

### Reference
```
GET /api/banks                    # List WPS participating banks
```

## Quick Start

```bash
npm install
npm start
```

## License

MIT
