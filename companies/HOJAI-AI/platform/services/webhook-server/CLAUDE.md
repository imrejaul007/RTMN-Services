# Webhook Server

> Port: 4002

## Usage

```bash
cd services/webhook-server
npm install
node src/index.js
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/:id` | Receive webhooks |
| GET | `/executions/:id` | Check execution status |
| POST | `/api/webhooks` | Register webhook |
| GET | `/api/webhooks` | List webhooks |
| DELETE | `/api/webhooks/:id` | Remove webhook |
| POST | `/webhooks/stripe` | Stripe events |
| POST | `/webhooks/github` | GitHub events |

## Stripe Events
- `customer.subscription.created`
- `invoice.paid`
- `payment.failed`
- `checkout.session.completed`

## GitHub Events
- `push`
- `pull_request`
- `issues.opened`
