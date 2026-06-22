# Hojai Multilingual Service

**Port:** 4870

Supports 10 Indian languages for voice AI.

## Languages

| Code | Language | Script | Status |
|------|----------|--------|--------|
| en | English | Latin | ✅ |
| hi | Hindi | Devanagari | ✅ |
| bn | Bengali | Bengali | ✅ |
| ta | Tamil | Tamil | ✅ |
| te | Telugu | Telugu | ✅ |
| kn | Kannada | Kannada | ✅ |
| ml | Malayalam | Malayalam | ✅ |
| mr | Marathi | Devanagari | ✅ |
| gu | Gujarati | Gujarati | ✅ |
| pa | Punjabi | Gurmukhi | ✅ |

## API

### Detect Language

```bash
curl -X POST http://localhost:4870/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "नमस्ते, कैसे हो आप"}'
```

### Get Translation Template

```bash
curl -X POST http://localhost:4870/api/translate/template \
  -H "Content-Type: application/json" \
  -d '{
    "template": "greeting",
    "lang": "hi"
  }'
```

### Translate Text

```bash
curl -X POST http://localhost:4870/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Book an appointment",
    "to": "hi"
  }'
```

## Voice Templates

Pre-built phrases for common voice AI scenarios:

- `greeting` - Welcome messages
- `book_appointment` - Booking confirmation
- `confirm_booking` - Appointment confirmation
- `order_placed` - Order confirmation
- `payment_confirm` - Payment receipt
- `support_response` - Support acknowledgment

## Environment

```bash
SARVAM_API_KEY=your_api_key  # Optional - for advanced translation
PORT=4870
```

## Quick Start

```bash
cd hojai-multilingual
npm install
npm run dev
```
