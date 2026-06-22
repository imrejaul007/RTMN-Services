# @rez/mongodb - Standardized MongoDB Connection

> Standardized MongoDB connection for all REZ services

## Features

- ✅ Connection pooling with configurable pool size
- ✅ Retry logic with exponential backoff
- ✅ Health check support
- ✅ Automatic reconnection
- ✅ Type-safe configuration
- ✅ Metrics collection

## Installation

```bash
npm install @rez/mongodb
```

## Usage

```typescript
import { createConnection, getConnection } from '@rez/mongodb';

// Create connection with standard config
await createConnection({
  uri: process.env.MONGODB_URI!,
  database: 'myapp',
  options: {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
  },
});

// Use in services
const db = getConnection();
const users = db.collection('users');
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `uri` | required | MongoDB connection URI |
| `database` | required | Database name |
| `maxPoolSize` | 20 | Maximum connections in pool |
| `minPoolSize` | 5 | Minimum connections in pool |
| `serverSelectionTimeoutMS` | 5000 | Server selection timeout |
| `socketTimeoutMS` | 45000 | Socket timeout |
| `retryWrites` | true | Retry failed writes |
| `w` | 'majority' | Write concern |

## Health Check

```typescript
import { healthCheck } from '@rez/mongodb';

app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.json(health);
});
```

## License

Proprietary - RTNM Digital