# Business Context Wrapper

Natural language Q&A for business owners. Wraps Genie Gateway with business context from CXO OS, Sales OS, and Marketing OS.

## Quick Start

```bash
npm install
npm start
```

## API

- `POST /api/business/ask` - Ask any question about your business
- `GET /api/business/insights` - Get proactive insights
- `GET /api/business/dashboard` - Quick stats
- `POST /api/business/recommend` - Get AI recommendations

## Example

```bash
curl -X POST http://localhost:5451/api/business/ask \
  -H 'Content-Type: application/json' \
  -d '{"question": "How many carts abandoned today?", "companyId": "my-company"}'
```
