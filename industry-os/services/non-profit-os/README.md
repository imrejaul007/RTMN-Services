# NonProfit OS

**Port:** 5160  
**Industry:** non_profit

NonProfit OS provides complete management for non profit businesses.

## Quick Start

```bash
cd non-profit-os
npm install
npm start
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register
- `POST /auth/login` - Login
- `GET /auth/verify` - Verify token

### Non Profit Management
- `GET /api/conts` - List conts
- `POST /api/conts` - Create cont
- `GET /api/conts/:id` - Get cont
- `PUT /api/conts/:id` - Update cont
- `DELETE /api/conts/:id` - Delete cont
- `GET /api/conts` - List conts
- `POST /api/conts` - Create cont
- `GET /api/conts/:id` - Get cont
- `PUT /api/conts/:id` - Update cont
- `DELETE /api/conts/:id` - Delete cont
- `GET /api/conts` - List conts
- `POST /api/conts` - Create cont
- `GET /api/conts/:id` - Get cont
- `PUT /api/conts/:id` - Update cont
- `DELETE /api/conts/:id` - Delete cont
- `GET /api/conts` - List conts
- `POST /api/conts` - Create cont
- `GET /api/conts/:id` - Get cont
- `PUT /api/conts/:id` - Update cont
- `DELETE /api/conts/:id` - Delete cont

### Analytics
- `GET /api/analytics` - Get analytics

### Twins
- `POST /api/twins/sync` - Sync twins

### Health
- `GET /health` - Health check
