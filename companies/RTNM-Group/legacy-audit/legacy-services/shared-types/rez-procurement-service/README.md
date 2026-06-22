# REZ Procurement Service

B2B procurement microservice integrating with NextaBizz for corporate purchasing.

## Purpose

The Procurement Service manages:
- Product catalog for businesses
- Bulk ordering
- Procurement workflows
- Supplier management
- Integration with NextaBizz API

## Environment Variables

```env
# Service
PORT=4012
NODE_ENV=production

# CORS
CORS_ORIGIN=https://admin.rez.money,https://rez-app.vercel.app

# NextaBizz API
NEXTABIZZ_API_URL=https://api.nextabizz.com
NEXTABIZZ_API_KEY=your_api_key_here
NEXTABIZZ_CLIENT_ID=your_client_id
NEXTABIZZ_CLIENT_SECRET=your_client_secret

# Internal Service Auth
INTERNAL_SERVICE_TOKEN=your_internal_token_here
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## API Endpoints

### Products

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/nextabizz/products | Search products |
| GET | /api/nextabizz/products/:productId | Product details |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/nextabizz/orders | Create order |
| GET | /api/nextabizz/orders | List orders |
| POST | /api/nextabizz/quotes | Request quote |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |

## Procurement Workflow

```
Cart -> Order Request -> Approval -> Supplier Processing -> Delivery -> Invoice -> Payment
```

### Approval Levels
1. Employee creates order
2. Manager approves (if over limit)
3. Finance reviews (if over threshold)
4. Order dispatched

## Data Models

### ProcurementOrder
```typescript
{
  orderId: string;
  corpId: string;
  employeeId: string;
  items: ProcurementItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Supplier
```typescript
{
  supplierId: string;
  name: string;
  contact: ContactInfo;
  categories: string[];
  rating: number;
  paymentTerms: string;
  status: 'active' | 'inactive';
}
```

## Partner Integration

### NextaBizz API
- Product catalog sync
- Order placement
- Inventory check
- Delivery tracking

## Deployment

### Render.com
1. Connect GitHub repository
2. Build command: `npm run build`
3. Start command: `npm start`
4. Configure NextaBizz credentials

### Docker
```bash
docker build -t rez-procurement-service .
docker run -p 4012:4012 --env-file .env rez-procurement-service
```

## Related Services

- **rez-payment-service** - Payment processing
- **rez-corpperks-service** - Corp account management
- **rez-order-service** - Order processing

## License

MIT
