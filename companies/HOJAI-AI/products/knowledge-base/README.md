# Knowledge Base (RAG) - HOJAI SiteOS

RAG-powered FAQ, document management, and URL crawling for intelligent Q&A.

## Quick Start

```bash
cd knowledge-base
npm install
npm start
```

## Features

- **RAG-Powered Q&A**: Retrieval-augmented generation for accurate answers
- **FAQ Management**: Create, import, and track FAQ usage
- **Document Storage**: Reference PDFs, DOCs, and other files
- **URL Crawling**: Store URLs for external content reference
- **Analytics**: Track what questions are being asked
- **Helpfulness Ratings**: User feedback on FAQ quality

## Setup

### Create Knowledge Base
```bash
curl -X POST http://localhost:5466/api/kb \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "your-company",
    "name": "Support Knowledge Base",
    "description": "Customer support FAQs and documentation"
  }'
```

## FAQs

### Add FAQ
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/faqs \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "How do I track my order?",
    "answer": "Go to the Orders section in your account and click Track Order.",
    "category": "orders",
    "tags": ["order", "tracking", "delivery"]
  }'
```

### Import FAQs (JSON)
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/faqs/import \
  -H 'Content-Type: application/json' \
  -d '{
    "faqs": [
      {
        "question": "What is your return policy?",
        "answer": "You can return items within 30 days of purchase with receipt.",
        "category": "returns"
      },
      {
        "question": "How long does shipping take?",
        "answer": "Standard shipping takes 3-5 business days.",
        "category": "shipping"
      }
    ]
  }'
```

### List FAQs
```bash
curl "http://localhost:5466/api/kb/kb_abc123/faqs?category=shipping"
```

### Update FAQ
```bash
curl -X PUT http://localhost:5466/api/kb/kb_abc123/faqs/faq_xyz789 \
  -H 'Content-Type: application/json' \
  -d '{
    "answer": "Express shipping takes 1-2 business days.",
    "tags": ["shipping", "express", "delivery"]
  }'
```

## Documents

### Add Document
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/documents \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Product User Guide",
    "fileUrl": "https://cdn.example.com/guides/user-guide.pdf",
    "fileType": "pdf",
    "metadata": {
      "version": "2.1",
      "pages": 45
    }
  }'
```

### Bulk Upload Documents
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/documents/bulk \
  -H 'Content-Type: application/json' \
  -d '{
    "files": [
      { "name": "Getting Started", "fileUrl": "https://cdn.example.com/getting-started.pdf" },
      { "name": "API Documentation", "fileUrl": "https://cdn.example.com/api-docs.pdf" },
      { "name": "FAQ Sheet", "fileUrl": "https://cdn.example.com/faq.pdf" }
    ]
  }'
```

## URLs

### Add URL
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/urls \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://help.example.com/articles/shipping",
    "name": "Shipping Help Articles"
  }'
```

### Bulk Add URLs
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/urls/bulk \
  -H 'Content-Type: application/json' \
  -d '{
    "urlList": [
      { "url": "https://help.example.com/returns", "name": "Returns Help" },
      { "url": "https://help.example.com/payment", "name": "Payment Help" },
      { "url": "https://help.example.com/account", "name": "Account Help" }
    ]
  }'
```

## Query (RAG)

### Ask a Question
```bash
curl -X POST http://localhost:5466/api/kb/kb_abc123/query \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "How can I return an item?",
    "topK": 3
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "question": "How can I return an item?",
    "answer": "You can return items within 30 days of purchase with receipt. Visit the Returns section in your account to initiate a return.",
    "sources": [
      {
        "type": "faq",
        "id": "faq_return123",
        "question": "What is your return policy?",
        "answer": "You can return items within 30 days of purchase with receipt.",
        "score": 1.0
      }
    ]
  }
}
```

### Provide Feedback
```bash
# Mark as helpful
curl -X POST http://localhost:5466/api/kb/kb_abc123/faqs/faq_return123/feedback \
  -H 'Content-Type: application/json' \
  -d '{"helpful": true}'

# Mark as not helpful
curl -X POST http://localhost:5466/api/kb/kb_abc123/faqs/faq_return123/feedback \
  -H 'Content-Type: application/json' \
  -d '{"helpful": false}'
```

## Analytics

### Get Knowledge Base Analytics
```bash
curl http://localhost:5466/api/kb/kb_abc123/analytics
```

Response:
```json
{
  "success": true,
  "data": {
    "stats": {
      "documents": 15,
      "faqs": 120,
      "urls": 25,
      "chunks": 580
    },
    "faqAnalytics": {
      "totalQueries": 5420,
      "helpfulCount": 4890,
      "notHelpfulCount": 320,
      "helpfulRate": "93.86",
      "byCategory": {
        "orders": 35,
        "shipping": 28,
        "returns": 25,
        "general": 32
      }
    },
    "topFaqs": [
      {
        "faqId": "faq_abc123",
        "question": "How do I track my order?",
        "usageCount": 890,
        "helpfulRate": "96.50"
      }
    ]
  }
}
```

## Environment Variables

```bash
KB_PORT=5466
MEMORY_OS_URL=http://localhost:4703
AI_INTELLIGENCE_URL=http://localhost:4881
```

## FAQ Categories

| Category | Description |
|----------|-------------|
| `general` | General questions |
| `account` | Account-related |
| `orders` | Order management |
| `shipping` | Shipping and delivery |
| `returns` | Returns and refunds |
| `payment` | Payment and billing |
| `support` | Technical support |

## License

Proprietary - HOJAI AI
