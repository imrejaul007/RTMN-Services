# REZ Invoice OCR

**Port:** 5002

AI-powered invoice scanning and data extraction service using Claude.

## Features

- **AI Extraction** - Claude-powered extraction of invoice data
- **Multi-format Support** - PDF, JPG, PNG support
- **GST Validation** - Indian GSTIN format and tax validation
- **Duplicate Detection** - Levenshtein-based similarity detection
- **Line Item Parsing** - HSN code extraction and categorization
- **Export** - JSON and CSV export formats

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and MONGODB_URI

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Upload & Extract

```bash
# Upload invoice
POST /api/upload
Content-Type: multipart/form-data
file: <invoice.pdf or image>

# Extract data from uploaded document
POST /api/extract/:id

# Validate extracted data
POST /api/validate/:id

# Retry failed extraction
POST /api/invoices/:id/retry
```

### Query

```bash
# List processed invoices
GET /api/invoices
GET /api/invoices?status=completed&page=1&limit=20

# Get invoice details
GET /api/invoices/:id

# Export invoice
GET /api/invoices/:id/export?format=json
GET /api/invoices/:id/export?format=csv
```

## Example Usage

### 1. Upload Invoice
```bash
curl -X POST http://localhost:5002/api/upload \
  -H "X-Tenant-ID: tenant_123" \
  -F "file=@invoice.pdf"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "filename": "invoice.pdf",
    "status": "uploaded",
    "mimeType": "application/pdf",
    "size": 245678
  }
}
```

### 2. Extract Data
```bash
curl -X POST http://localhost:5002/api/extract/inv_abc123 \
  -H "X-Tenant-ID: tenant_123"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "status": "completed",
    "extractedData": {
      "vendorName": "ABC Supplies Pvt Ltd",
      "vendorGstin": "27AABCU9603R1ZM",
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15",
      "lineItems": [
        {
          "description": "Office Supplies",
          "hsnCode": "9403",
          "quantity": 100,
          "rate": 500,
          "amount": 50000,
          "cgst": 4500,
          "sgst": 4500
        }
      ],
      "subtotal": 50000,
      "totalTax": 9000,
      "totalAmount": 59000,
      "confidence": 0.95
    }
  }
}
```

### 3. Validate GST
```bash
curl -X POST http://localhost:5002/api/validate/inv_abc123 \
  -H "X-Tenant-ID: tenant_123"
```

Response:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "checks": {
      "gstinFormat": { "valid": true },
      "gstinChecksum": { "valid": true },
      "taxCalculation": { "valid": true },
      "duplicate": { "valid": true, "duplicate": false }
    },
    "warnings": []
  }
}
```

## Extracted Data Structure

```typescript
interface ExtractedInvoice {
  // Vendor Information
  vendorName: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorPan?: string;

  // Invoice Details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;

  // Line Items
  lineItems: LineItem[];

  // Financials
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  totalAmount: number;

  // Metadata
  confidence: number;
  extractedAt: Date;
  rawText?: string;
}

interface LineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
}
```

## GST Validation

The service validates:
- GSTIN format (15 characters)
- GSTIN checksum digit
- Tax calculations (CGST/SGST or IGST)
- Invoice totals consistency

## Duplicate Detection

Uses Levenshtein distance to detect:
- Same invoice submitted twice
- Similar vendor + amount combinations
- Invoice number collisions

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5002 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-invoice-ocr |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `ANTHROPIC_MODEL` | Claude model | claude-3-5-sonnet-20241022 |
| `UPLOAD_DIR` | File storage directory | ./uploads |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 (10MB) |
| `NODE_ENV` | Environment | development |

## Authentication

Multi-tenant via headers:
```
X-Tenant-ID: tenant_123
Authorization: Bearer <token>
```

## Health Checks

```bash
curl http://localhost:5002/health
```

## License

MIT
