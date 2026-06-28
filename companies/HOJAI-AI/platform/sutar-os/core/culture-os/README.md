# Culture OS

Company values management, culture surveys, and organizational alignment tracking.

**Port:** 4870

## Purpose

Culture OS helps organizations define, communicate, and track their core values. It provides tools for creating culture surveys, measuring employee alignment with company values, and organizing cultural events.

## Features

- Core values management with priority ordering
- Culture surveys with multiple question types
- Employee alignment scoring against values
- Survey response collection and analysis
- Cultural event management
- Organization-wide alignment metrics
- Value examples and best practices

## API Endpoints

### Values

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/values` | List active values |
| GET | `/api/values/:id` | Get value details |
| POST | `/api/values` | Create new value |
| PUT | `/api/values/:id` | Update value |
| DELETE | `/api/values/:id` | Deactivate value |

### Alignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alignment` | Get user alignment scores |
| POST | `/api/alignment` | Record alignment score |
| GET | `/api/alignment/org` | Organization alignment |

### Surveys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/surveys` | List surveys |
| GET | `/api/surveys/:id` | Get survey details |
| POST | `/api/surveys` | Create survey |
| POST | `/api/surveys/:id/publish` | Publish survey |
| POST | `/api/surveys/:id/close` | Close survey |
| POST | `/api/surveys/:id/respond` | Submit response |
| GET | `/api/surveys/:id/results` | Get survey results |

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List cultural events |
| POST | `/api/events` | Create event |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get statistics |

## Request/Response Examples

### Create Value

```bash
curl -X POST http://localhost:4870/api/values \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "name": "Innovation",
    "description": "We embrace change and continuous improvement",
    "examples": [
      "Weekly hackathons",
      "20% time for experiments",
      "Failure is learning"
    ],
    "color": "#FF6B35"
  }'
```

### Create Survey

```bash
curl -X POST http://localhost:4870/api/surveys \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "title": "Q4 Culture Pulse Check",
    "description": "How well are we living our values?",
    "deadline": "2024-12-15T23:59:59Z",
    "questions": [
      {
        "text": "How well does your team embody customer-first principles?",
        "type": "rating",
        "required": true
      },
      {
        "text": "Share an example of innovation you have seen recently.",
        "type": "text",
        "required": false
      },
      {
        "text": "How would you rate communication in the company?",
        "type": "multiple_choice",
        "options": ["Excellent", "Good", "Needs Improvement", "Poor"],
        "required": true
      }
    ]
  }'
```

### Record Alignment

```bash
curl -X POST http://localhost:4870/api/alignment \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "userId": "emp-123",
    "valueId": "v1",
    "score": 85,
    "evidence": "Led customer feedback initiative that improved NPS by 20 points"
  }'
```

### Submit Survey Response

```bash
curl -X POST http://localhost:4870/api/surveys/{surveyId}/respond \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "userId": "emp-123",
    "answers": {
      "q1": 5,
      "q2": "Our team launched a new feature that reduced load time by 40%",
      "q3": "Excellent"
    }
  }'
```

## Default Values

| ID | Name | Priority | Color |
|----|------|----------|-------|
| v1 | Customer First | 1 | #0066FF |
| v2 | Innovation | 2 | #FF6B35 |
| v3 | Transparency | 3 | #00AA66 |
| v4 | Teamwork | 4 | #9B59B6 |
| v5 | Excellence | 5 | #F1C40F |

## Survey Question Types

| Type | Description |
|------|-------------|
| `rating` | 1-5 or 1-10 scale |
| `text` | Free-form text response |
| `multiple_choice` | Single selection from options |

## Alignment Score

- Scale: 0-100
- 90-100: Exceptional demonstration
- 70-89: Strong alignment
- 50-69: Adequate
- Below 50: Needs development

## Event Types

| Type | Description |
|------|-------------|
| `celebration` | Company celebrations |
| `workshop` | Training and learning |
| `team_building` | Team bonding activities |
| `recognition` | Awards and recognition |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4870 | Service port |
| `JWT_SECRET` | - | JWT secret for authentication |

## Dependencies

- `@rtmn/shared` - Shared utilities
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
```
