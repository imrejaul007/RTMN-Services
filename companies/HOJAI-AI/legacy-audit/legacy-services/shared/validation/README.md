# @rez/validation - Zod Validation Schemas

> Standardized validation schemas for all REZ services

## Features

- ✅ Common schemas (email, phone, password)
- ✅ API request/response schemas
- ✅ Database entity schemas
- ✅ Event schemas
- ✅ Extensible with custom schemas

## Installation

```bash
npm install @rez/validation
```

## Usage

```typescript
import { schemas, createSchema } from '@rez/validation';

// User schemas
const { user, createUser, updateUser } = schemas.user;

// Use with @rez/security
import { validate } from '@rez/security';
import { z } from 'zod';

app.post('/users', validate(createUser), handler);
app.put('/users/:id', validate(updateUser), handler);

// Custom schema
const customSchema = createSchema({
  name: z.string().min(1),
  email: schemas.email,
});
```

## License

Proprietary - RTNM Digital