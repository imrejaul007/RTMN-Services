# @hojai/sdk

TypeScript SDK for HOJAI AI.

## Install
```
npm install @hojai/sdk
```

## Usage
```typescript
import { HojaiClient } from '@hojai/sdk';
const client = new HojaiClient({ baseUrl: 'http://localhost:4399' });
const twins = await client.twins();
```
