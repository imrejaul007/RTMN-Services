# RTMN Billing Service

A comprehensive Stripe-powered billing service for RTMN BrandPulse - providing subscription management, client portal access, and payment processing.

## Overview

This service handles all billing-related operations including:
- Subscription management (create, update, cancel)
- Stripe Checkout integration
- Customer Portal access
- Webhook handling for payment events
- Usage tracking for metered billing
- Invoice retrieval

## Features

### Subscription Plans

| Plan | Price | Brands | Reviews/Month | Sentiment Analysis | Webhooks | Support |
|------|-------|--------|---------------|-------------------|----------|---------|
| Free | $0 | 1 | 100 | Basic | 0 | Community |
| Starter | $99/mo | 5 | 5,000 | AFINN | 1 | Email |
| Professional | $299/mo | 25 | 50,000 | AI | 5 | Priority |
| Enterprise | Custom | Unlimited | Unlimited | AI | Unlimited | Dedicated |

### API Capabilities

- **Checkout Sessions**: Create Stripe Checkout for new subscriptions
- **Customer Portal**: Redirect users to Stripe's hosted portal for self-service
- **Subscription Management**: View, update, cancel subscriptions
- **Usage Tracking**: Report usage for metered billing
- **Invoice Access**: Retrieve customer invoices
- **Webhook Processing**: Handle subscription and payment events

## Quick Start

### Prerequisites

- Node.js 18+
- Stripe account (test mode)
- npm or yarn

### Installation

```bash
# Navigate to service directory
cd companies/HOJAI-AI/services/billing

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your Stripe keys
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Configuration

1. **Get Stripe API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy your test secret key

2. **Set up Webhook Secret**:
   - Run `stripe listen --forward-to localhost:4005/webhook`
   - Copy the webhook signing secret to `.env`

3. **Create Products and Prices** (in Stripe Dashboard):
   - Create products for each paid plan
   - Copy the Price IDs to `.env`

### Running the Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Run tests
npm test
```

### Verify Service Health

```bash
curl http://localhost:4005/health
```

## API Reference

### Plans

#### Get All Plans
```bash
GET /api/v1/plans
```

**Response:**
```json
{
  "data": [
    {
      "id": "price_starter_monthly",
      "name": "Starter",
      "price": 99,
      "brands": 5,
      "reviewsPerMonth": 5000,
      "sentimentAnalysis": "afinn",
      "webhooks": 1,
      "support": "email"
    }
  ]
}
```

### Checkout

#### Create Checkout Session
```bash
POST /api/v1/checkout
Content-Type: application/json

{
  "planId": "price_starter_monthly",
  "customerEmail": "customer@example.com",
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/pricing"
}
```

**Response:**
```json
{
  "data": {
    "sessionId": "cs_xxx",
    "url": "https://checkout.stripe.com/c/pay/xxx"
  }
}
```

### Customer Portal

#### Create Portal Session
```bash
POST /api/v1/portal
Content-Type: application/json

{
  "customerId": "cus_xxx",
  "returnUrl": "http://localhost:3000/settings"
}
```

**Response:**
```json
{
  "data": {
    "url": "https://billing.stripe.com/session/xxx"
  }
}
```

### Subscriptions

#### Get Subscription Status
```bash
GET /api/v1/subscription/:customerId
```

**Response:**
```json
{
  "data": {
    "subscriptionId": "sub_xxx",
    "plan": "price_starter_monthly",
    "planName": "Starter",
    "status": "active",
    "currentPeriodEnd": 1700000000,
    "cancelAtPeriodEnd": false
  }
}
```

#### Cancel Subscription
```bash
POST /api/v1/subscription/:customerId/cancel
Content-Type: application/json

{
  "immediately": false
}
```

#### Update Subscription
```bash
POST /api/v1/subscription/:customerId/update
Content-Type: application/json

{
  "newPlanId": "price_professional_monthly"
}
```

### Invoices

#### Get Invoices
```bash
GET /api/v1/invoices/:customerId?limit=10
```

### Usage Tracking

#### Record Usage
```bash
POST /api/v1/usage/:subscriptionItemId
Content-Type: application/json

{
  "quantity": 100,
  "timestamp": 1700000000
}
```

### Customers

#### Get Customer
```bash
GET /api/v1/customer/:customerId
```

#### Create Customer
```bash
POST /api/v1/customer
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "John Doe",
  "metadata": {}
}
```

#### Update Customer
```bash
PATCH /api/v1/customer/:customerId
Content-Type: application/json

{
  "email": "newemail@example.com",
  "name": "Jane Doe"
}
```

### Payment Methods

#### Get Payment Methods
```bash
GET /api/v1/payment-methods/:customerId
```

#### Attach Payment Method
```bash
POST /api/v1/payment-methods/:customerId/attach
Content-Type: application/json

{
  "paymentMethodId": "pm_xxx"
}
```

#### Detach Payment Method
```bash
POST /api/v1/payment-methods/:paymentMethodId/detach
```

## Stripe Dashboard Setup

### 1. Create Products

1. Go to **Products** in Stripe Dashboard
2. Click **Add Product**
3. Enter product details:
   - **Name**: Starter Plan
   - **Pricing Model**: Recurring
   - **Amount**: $99
   - **Interval**: Monthly
4. Copy the **Price ID** (starts with `price_`)

### 2. Configure Webhook

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Copy the **Signing Secret**

### 3. Test Mode

Always test in Stripe test mode first:
- Use test card numbers: `4242 4242 4242 4242`
- Access test data via Stripe Dashboard test mode toggle

## Webhook Testing

### Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local service
stripe listen --forward-to localhost:4005/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Webhook Event Handlers

The service handles these events:

| Event | Handler | Purpose |
|-------|---------|---------|
| `customer.subscription.created` | `handleSubscriptionUpdate` | Create/update subscription record |
| `customer.subscription.updated` | `handleSubscriptionUpdate` | Sync subscription changes |
| `customer.subscription.deleted` | `handleSubscriptionUpdate` | Mark subscription as inactive |
| `invoice.payment_succeeded` | `handlePaymentSucceeded` | Record payment, send receipt |
| `invoice.payment_failed` | `handlePaymentFailed` | Notify customer, pause service |
| `checkout.session.completed` | `handleCheckoutComplete` | Create account, send welcome email |

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4005
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  billing:
    build: .
    ports:
      - "4005:4005"
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_STARTER_PRICE_ID=${STRIPE_STARTER_PRICE_ID}
      - STRIPE_PROFESSIONAL_PRICE_ID=${STRIPE_PROFESSIONAL_PRICE_ID}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - DASHBOARD_URL=${DASHBOARD_URL}
    restart: unless-stopped
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: billing
  template:
    metadata:
      labels:
        app: billing
    spec:
      containers:
        - name: billing
          image: rtmnbilling:latest
          ports:
            - containerPort: 4005
          env:
            - name: STRIPE_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: stripe-secrets
                  key: secret-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Yes | Starter plan price ID |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Yes | Professional plan price ID |
| `STRIPE_ENTERPRISE_PRICE_ID` | No | Enterprise plan price ID |
| `PORT` | No | Server port (default: 4005) |
| `CORS_ORIGIN` | No | Allowed CORS origins |
| `DASHBOARD_URL` | No | Frontend dashboard URL |

## Security Considerations

1. **Never expose Stripe secret key** - Use environment variables
2. **Validate webhook signatures** - Always verify Stripe webhooks
3. **Use HTTPS** - Ensure all production traffic is encrypted
4. **Rate limiting** - Implement rate limiting in production
5. **Input validation** - Sanitize all user inputs

## Error Handling

All API errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `INVALID_PLAN` - Plan not found or invalid
- `CHECKOUT_ERROR` - Error creating checkout session
- `PORTAL_ERROR` - Error creating portal session
- `SUBSCRIPTION_ERROR` - Error with subscription operation
- `CANCEL_ERROR` - Error canceling subscription
- `NO_SUBSCRIPTION` - No active subscription found
- `MISSING_CUSTOMER` - Customer ID required

## Integration with Frontend

### Frontend Flow

1. User selects plan on pricing page
2. Frontend calls `POST /api/v1/checkout` with plan ID
3. Backend returns Stripe Checkout URL
4. Frontend redirects user to Stripe Checkout
5. User completes payment
6. Stripe sends webhook to `/webhook`
7. Webhook handler creates/updates customer subscription
8. Stripe redirects user back to success URL

### Example Frontend Code

```typescript
async function subscribeToPlan(planId: string, email: string) {
  const response = await fetch('http://localhost:4005/api/v1/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      customerEmail: email,
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/pricing`,
    }),
  });

  const { data } = await response.json();
  window.location.href = data.url;
}

async function openBillingPortal(customerId: string) {
  const response = await fetch('http://localhost:4005/api/v1/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      returnUrl: window.location.origin,
    }),
  });

  const { data } = await response.json();
  window.location.href = data.url;
}
```

## Monitoring

### Health Check

```bash
curl http://localhost:4005/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "billing",
  "timestamp": "2026-06-15T10:00:00.000Z"
}
```

### Logging

The service logs:
- All API requests (method, path, status)
- Webhook events received
- Errors with full stack traces

Configure logging level via `LOG_LEVEL` environment variable.

## Support

For issues or questions:
- Check the [Stripe Documentation](https://stripe.com/docs)
- Review webhook logs in Stripe Dashboard
- Enable debug logging for troubleshooting

## License

MIT License - RTMN BrandPulse
