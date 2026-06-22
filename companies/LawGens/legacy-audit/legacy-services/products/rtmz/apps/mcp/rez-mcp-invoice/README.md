# REZ MCP Invoice

MCP server for invoice OCR processing.

## Features

- Upload invoices for processing
- Extract data via OCR
- AI-powered field extraction
- Invoice validation

## Usage

```bash
npm install
npm run build
npm start
```

## Environment

```
PORT=3111
INVOICE_OCR_URL=http://invoice-ocr:5002
AUTH_SERVICE_URL=http://rez-auth:4002
```