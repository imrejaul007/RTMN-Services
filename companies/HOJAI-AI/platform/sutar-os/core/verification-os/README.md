# Verification OS

AI output verification and quality control service for LLM outputs, documents, code, images, and audio.

**Port:** 4866

## Purpose

Verification OS ensures AI-generated content meets quality standards before deployment. It provides automated validation against configurable rules, scoring, and actionable feedback.

## Features

- Multi-type verification (LLM output, document, code, image, audio)
- Configurable verification rules with severity levels
- Batch verification for multiple items
- Retry failed verifications with score improvement
- Verification statistics and pass rate tracking
- Rule management (CRUD operations)
- Verification history with filtering

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness probe |
| POST | `/api/verify/output` | Verify single output |
| GET | `/api/verify/:id` | Get verification result |
| POST | `/api/verify/batch` | Batch verify multiple items |
| POST | `/api/verify/:id/retry` | Retry failed verification |
| GET | `/api/verify/stats` | Verification statistics |
| GET | `/api/verify/history` | Verification history |
| GET | `/api/verify/rules` | List all rules |
| POST | `/api/verify/rules` | Create new rule |
| PUT | `/api/verify/rules/:id` | Update rule |
| DELETE | `/api/verify/rules/:id` | Delete rule |

## Request/Response Examples

### Verify LLM Output

```bash
curl -X POST http://localhost:4866/api/verify/output \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "type": "llm_output",
    "content": "The quarterly revenue increased by 15% due to improved marketing campaigns.",
    "criteria": ["revenue", "marketing"],
    "metadata": {
      "model": "gpt-4",
      "userId": "user_123"
    }
  }'
```

### Verify Code

```bash
curl -X POST http://localhost:4866/api/verify/output \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "type": "code",
    "content": "function calculateSum(a, b) { return a + b; }",
    "criteria": ["function", "return"]
  }'
```

## Verification Types

| Type | Min Score | Key Checks |
|------|-----------|------------|
| `llm_output` | 70 | Length, criteria match, error indicators, refusal language |
| `code` | 70 | Functions/classes, TODOs, console.log count, error handling |
| `document` | 70 | Length, topic coverage, header structure |
| `image` | 70 | Basic format validation |
| `audio` | 70 | Basic format validation |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4866 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication (from @rtmn/shared) |

## Dependencies

- `@rtmn/shared` - Shared utilities (auth, logging)
- `express` - HTTP framework
- `helmet` - Security headers
- `cors` - CORS support
- `zod` - Schema validation
- `uuid` - ID generation

## Commands

```bash
npm install        # Install dependencies
npm start          # Start the service
npm test           # Run tests
npm run dev        # Development mode
```

## Default Verification Rules

| ID | Name | Type | Severity |
|----|------|------|----------|
| rule-1 | Minimum Length | llm_output | medium |
| rule-2 | Criteria Match | llm_output | critical |
| rule-3 | Error Indicators | llm_output | high |
| rule-4 | Refusal Language | llm_output | medium |
| rule-5 | Function Found | code | critical |
| rule-6 | No TODO markers | code | low |
| rule-7 | Error Handling | code | high |
| rule-8 | Debug Statements | code | medium |
| rule-9 | Module Export | code | medium |
| rule-10 | Minimum Length | document | medium |
| rule-11 | Topic Coverage | document | critical |
