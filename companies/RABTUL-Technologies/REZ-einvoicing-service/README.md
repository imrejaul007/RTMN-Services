# REZ-eInvoicing Service

**Version:** 1.0.0  
**Port:** 4320  
**Company:** RABTUL Technologies

EU-compliant e-invoicing service supporting international standards for B2B and B2G transactions across the European Union.

---

## Supported Formats

| Format | Standard | Description | Countries |
|--------|----------|-------------|-----------|
| **Peppol BIS 3.0** | EN 16931 | Pan-European e-invoicing via Peppol network | All EU |
| **ZUGFeRD 2.1** | EN 16931 | German/Austrian hybrid PDF+XML format | DE, AT |
| **XRechnung** | EN 16931 | German CIUS for Peppol | DE |
| **Factur-X** | EN 16931 | French hybrid PDF+XML format | FR |

---

## Quick Start

```bash
# Install dependencies
cd REZ-einvoicing-service
npm install

# Start service
npm start

# Service available at
curl http://localhost:4320/health
```

---

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "REZ-eInvoicing Service",
  "version": "1.0.0",
  "port": 4320,
  "supportedFormats": ["PEPPOL_BIS_3_0", "ZUGFeRD_2_1", "XRechnung", "Factur-X"],
  "features": ["invoice_crud", "format_conversion", "pdf_generation", "peppol_integration", "vat_validation"]
}
```

---

## Invoice Operations

### Create Invoice

```
POST /api/invoices
```

**Request Body:**
```json
{
  "invoiceNumber": "INV-2024-001",
  "issueDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "currency": "EUR",
  "type": "invoice",
  "seller": {
    "id": "SE123456789",
    "scheme": "SE",
    "name": "Acme GmbH",
    "vatNumber": "DE123456789",
    "address": {
      "street": "Hauptstrasse 1",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "DE"
    }
  },
  "buyer": {
    "id": "FR987654321",
    "scheme": "FR",
    "name": "Company SARL",
    "vatNumber": "FR987654321",
    "address": {
      "street": "Rue de la Paix 10",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    }
  },
  "lineItems": [
    {
      "description": "Professional Services",
      "productCode": "SERV-001",
      "quantity": 10,
      "unitPrice": 150.00,
      "amount": 1500.00,
      "vatRate": 19
    },
    {
      "description": "Software License",
      "productCode": "SOFT-001",
      "quantity": 1,
      "unitPrice": 500.00,
      "amount": 500.00,
      "vatRate": 19
    }
  ],
  "notes": "Payment terms: Net 30"
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "uuid-xxxx-xxxx",
    "invoiceNumber": "INV-2024-001",
    "status": "draft",
    "totals": {
      "netAmount": 2000.00,
      "vatAmount": 380.00,
      "totalAmount": 2380.00,
      "currency": "EUR"
    }
  }
}
```

---

### Get All Invoices

```
GET /api/invoices
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (draft, sent, accepted) |
| sellerId | string | Filter by seller ID |
| buyerId | string | Filter by buyer ID |
| fromDate | string | Filter from date (YYYY-MM-DD) |
| toDate | string | Filter to date (YYYY-MM-DD) |
| limit | number | Max results (default: 100) |

---

### Get Invoice by ID

```
GET /api/invoices/:id
```

---

### Update Invoice

```
PUT /api/invoices/:id
```

**Note:** Cannot update invoices with status `sent` or `accepted`.

---

### Delete Invoice

```
DELETE /api/invoices/:id
```

**Note:** Cannot delete invoices with status `sent` or `accepted`.

---

### Send Invoice via Peppol

```
POST /api/invoices/:id/send
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice sent via Peppol network",
  "invoiceId": "uuid-xxxx-xxxx",
  "sentTo": "FR987654321",
  "sentAt": "2024-01-15T10:30:00Z"
}
```

---

## Format Conversion

### Get Invoice in Specific Format

```
GET /api/invoices/:id/format/:format
```

**Formats:** `PEPPOL_BIS_3_0`, `ZUGFeRD_2_1`, `XRECHNUNG`, `FACTUR-X`

**Response:** XML document with appropriate Content-Type header

---

### Convert Invoice Format

```
POST /api/invoices/:id/convert
```

**Request:**
```json
{
  "targetFormat": "ZUGFeRD_2_1"
}
```

**Response:**
```json
{
  "success": true,
  "invoiceId": "uuid-xxxx-xxxx",
  "sourceFormat": "INTERNAL",
  "targetFormat": "ZUGFeRD_2_1",
  "xml": "<?xml version=\"1.0\"...>"
}
```

---

## VAT Operations

### Validate VAT Number

```
POST /api/vat/validate
```

**Request:**
```json
{
  "vatNumber": "DE123456789"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "valid": true,
  "vatNumber": "DE123456789",
  "countryCode": "DE",
  "standardVATRate": 19,
  "message": "Valid EU VAT number for DE"
}
```

---

### Get VAT Rates

```
GET /api/vat/rates
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| country | string | Get rate for specific country (e.g., DE, FR) |

**Response:**
```json
{
  "success": true,
  "rates": {
    "DE": 19, "FR": 20, "AT": 20, "NL": 21, "BE": 21,
    "IT": 22, "ES": 21, "PL": 23, "SE": 25, "DK": 25,
    "FI": 24, "IE": 23, "PT": 23, "GR": 24, "CZ": 21,
    "HU": 27, "SK": 20, "SI": 22, "EE": 22, "LV": 21,
    "LT": 21, "CY": 19, "LU": 17, "MT": 18, "BG": 20,
    "HR": 25, "RO": 19
  },
  "supportedCountries": ["DE", "FR", "AT", ...]
}
```

---

## Validation

### Validate Invoice EN 16931 Compliance

```
POST /api/invoices/:id/validate
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": [],
    "standard": "EN 16931:2017"
  }
}
```

---

### Calculate Invoice Totals

```
POST /api/calculate
```

**Request:**
```json
{
  "lineItems": [
    {
      "description": "Service A",
      "amount": 1000.00,
      "vatRate": 19
    },
    {
      "description": "Service B (VAT Exempt)",
      "amount": 500.00,
      "vatRate": 0,
      "vatExempt": true
    }
  ],
  "currency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "lineItems": [
    {
      "description": "Service A",
      "amount": 1000.00,
      "vatRate": 19,
      "calculated": {
        "netAmount": 1000.00,
        "vatRate": 19,
        "vatAmount": 190.00,
        "grossAmount": 1190.00
      }
    }
  ],
  "totals": {
    "netAmount": 1500.00,
    "vatAmount": 190.00,
    "totalAmount": 1690.00,
    "currency": "EUR"
  }
}
```

---

## EU VAT Information

### Standard VAT Rates by Country

| Country | Code | Standard Rate |
|---------|------|---------------|
| Germany | DE | 19% |
| France | FR | 20% |
| Austria | AT | 20% |
| Netherlands | NL | 21% |
| Belgium | BE | 21% |
| Italy | IT | 22% |
| Spain | ES | 21% |
| Poland | PL | 23% |
| Sweden | SE | 25% |
| Denmark | DK | 25% |
| Finland | FI | 24% |
| Ireland | IE | 23% |
| Portugal | PT | 23% |
| Greece | GR | 24% |

---

## Standards Compliance

### EN 16931:2017

The service implements the European standard for e-invoicing syntax and semantics:

- **Semantic data model** for invoice information
- **Minimum invoice** requirements met
- **Extended invoice** support available
- **Business rules** for validation implemented

### Peppol BIS 3.0

- UBL 2.1 compliant
- Peppol policy 1.0 compliant
- Peppol Transport Infrastructure compatible
- PEPPOL Ready certified format

### ZUGFeRD 2.1

- Profile: Extended
- PDF/A-3 embedding
- XML in UTF-8 encoding
- German/Austrian market compliance

### XRechnung

- German CIUS for Peppol
- EN 16931 compliant
- Mandatory for German B2G invoices

### Factur-X

- French e-invoice standard
- PDF/A-3 with embedded XML
- ZUGFeRD profile based

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Error |

---

## Integration Examples

### Create and Send Invoice (curl)

```bash
# Create invoice
curl -X POST http://localhost:4320/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "INV-001",
    "seller": {"name": "Acme", "vatNumber": "DE123456789"},
    "buyer": {"name": "Company", "vatNumber": "FR987654321"},
    "lineItems": [{"description": "Item", "amount": 100, "vatRate": 19}]
  }'

# Send via Peppol
curl -X POST http://localhost:4320/api/invoices/{id}/send

# Get as ZUGFeRD
curl http://localhost:4320/api/invoices/{id}/format/ZUGFeRD_2_1
```

### Node.js Integration

```javascript
const response = await fetch('http://localhost:4320/api/invoices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invoiceData)
});

const { invoice } = await response.json();
```

---

## Port Registry

This service is part of the RABTUL Technologies suite:

| Service | Port | Description |
|---------|------|-------------|
| REZ-auth-service | 4002 | Authentication |
| REZ-wallet-service | 4004 | Payments |
| REZ-einvoicing-service | 4320 | E-Invoicing |
| REZ-manufacturing-os | 4330 | Manufacturing |

---

## License

MIT License - RABTUL Technologies

---

**Last Updated:** June 2026