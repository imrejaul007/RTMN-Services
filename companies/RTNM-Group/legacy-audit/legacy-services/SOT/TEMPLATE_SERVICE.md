# Service Template

## Creating a New Service

### 1. Initialize
```bash
npx create-next-service my-service
cd my-service
```

### 2. Add to monorepo
```bash
pnpm add @rez/shared-types
```

### 3. Configure ports
Add to port registry in SOT/README.md

### 4. Add environment variables
```env
PORT=400X
MONGODB_URI=mongodb://localhost:27017
SERVICE_NAME=my-service
```

### 5. Add to API Gateway
Update routes in rez-api-gateway

### 6. Document
Create entry in SOT/1_COMMON_SERVICES/

## Service Structure
```
my-service/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── models/          # Database models
│   └── middleware/       # Auth, validation
├── tests/
├── Dockerfile
├── docker-compose.yml
└── README.md
```
