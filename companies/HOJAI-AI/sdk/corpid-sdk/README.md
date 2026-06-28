# CorpID SDK

> Official JavaScript/TypeScript SDK for CorpID Universal Identity OS

## Installation

```bash
npm install @hojai/corpid-sdk
```

## Quick Start

```typescript
import { CorpID } from '@hojai/corpid-sdk';

// Initialize client
const client = new CorpID({
  baseUrl: 'http://localhost:4702',
  apiKey: 'your-api-key'  // or use login() for JWT
});

// Register and login
await client.register({
  email: 'alice@example.com',
  name: 'Alice Smith',
  password: 'secure-password'
});

await client.login({
  email: 'alice@example.com',
  password: 'secure-password'
});

// Get current user
const user = await client.me();
console.log(`Logged in as ${user.name}`);
```

## Authentication

### Login with Password

```typescript
const { accessToken, user } = await client.login({
  email: 'alice@example.com',
  password: 'password123'
});
```

### Login with MFA

```typescript
const { mfaRequired, mfaToken } = await client.login({
  email: 'alice@example.com',
  password: 'password123'
});

if (mfaRequired) {
  const codes = prompt('Enter 6-digit MFA code:');
  const { accessToken, user } = await client.loginWithMFA(mfaToken, codes);
}
```

### API Key Authentication

```typescript
const client = new CorpID({
  baseUrl: 'http://localhost:4702',
  apiKey: process.env.CORPID_API_KEY
});
```

## Users

### Create User

```typescript
const user = await client.userCreate({
  email: 'bob@example.com',
  name: 'Bob Smith',
  password: 'secure-password',
  role: 'user'
});
```

### List Users

```typescript
const users = await client.usersList({
  businessId: 'CI-BIZ-xxx',
  role: 'user',
  limit: 50
});
```

### Update User

```typescript
const updated = await client.userUpdate('CI-IND-xxx', {
  name: 'Robert Smith'
});
```

## AI Agents

### Create Agent Passport

```typescript
const agent = await client.agentCreate({
  name: 'sales-bot',
  description: 'AI sales assistant',
  permissions: ['leads:read', 'orders:write', 'emails:send'],
  scopes: ['read:all'],
  budget: { monthly: 50000, currency: 'USD' },
  capabilities: ['nlp', 'crm-integration']
});
```

### Manage Agent

```typescript
// Get agent
const agent = await client.agentGet('CI-AGT-xxx');

// Add permissions
await client.agentAddPermissions('CI-AGT-xxx', ['reports:generate']);

// Check budget
const budget = await client.agentBudget('CI-AGT-xxx');
console.log(`Spent: $${(budget.spent / 100).toFixed(2)} / $${(budget.monthly / 100).toFixed(2)}`);

// Suspend agent
await client.agentSuspend('CI-AGT-xxx', 'Suspicious activity detected');

// Resume agent
await client.agentResume('CI-AGT-xxx');
```

## Workload Identity

### Register Workload

```typescript
const workload = await client.workloadCreate({
  name: 'data-sync-cron',
  type: 'cron',
  scopes: ['memory:read', 'memory:write'],
  rotationPolicy: {
    intervalDays: 30,
    autoRotate: true
  },
  runtime: {
    environment: 'production',
    region: 'us-east-1'
  }
});
```

### Rotate Credentials

```typescript
const { nextRotationAt } = await client.workloadRotate('CI-WRK-xxx');
```

## Delegation

### Create Delegation

```typescript
const delegation = await client.delegationCreate({
  delegateId: 'CI-AGT-sales-bot',
  scope: ['leads:read', 'orders:read'],
  attenuationFactor: 0.8,
  expiresAt: '2027-01-01T00:00:00Z',
  constraints: {
    maxValue: 10000,
    allowedEntities: ['CI-BIZ-merchant-1']
  }
});
```

### Check Authority

```typescript
const { authorized, effectiveTrust } = await client.authorityCheck(
  'CI-AGT-sales-bot',
  'orders:write',
  { value: 5000, entityId: 'CI-BIZ-merchant-1' }
);

if (!authorized) {
  throw new Error('Agent not authorized for this action');
}
```

### Get Delegation Chain

```typescript
const { chain, chainLength } = await client.delegationChain('CI-AGT-xxx');
console.log(`Delegation chain: ${chainLength} hops`);
```

## Trust

### Get Trust Score

```typescript
const trust = await client.trustScore('CI-AGT-sales-bot');
console.log(`Trust Score: ${trust.score} (${trust.level})`);
```

### Get Trust Dimensions

```typescript
const trust = await client.trustDimensions('CI-AGT-sales-bot');
console.log('Dimensions:', trust.dimensions?.map(d => ({
  name: d.dimension,
  score: d.score,
  weight: d.weight
})));
```

## Timeline

### Get Entity Timeline

```typescript
const events = await client.timeline('CI-IND-user1', {
  category: 'authentication',
  limit: 50
});

for (const event of events) {
  console.log(`${event.icon} ${event.title} - ${event.timestamp}`);
}
```

### Get Timeline Summary

```typescript
const summary = await client.timelineSummary('CI-IND-user1', '30d');
console.log(`
  Total Events: ${summary.totalEvents}
  Most Active: ${summary.mostActiveDay}
  Highlights: ${summary.highlights.join(', ')}
`);
```

### Add Annotation

```typescript
await client.timelineAnnotate('CI-IND-user1', {
  title: 'Promoted to Senior Engineer',
  description: 'Completed promotion review',
  category: 'lifecycle',
  impact: 'positive'
});
```

## MFA

### Setup MFA

```typescript
const { secret, qrCodeUrl, backupCodes } = await client.mfaSetup();

// Save backup codes securely!
console.log('Backup codes:', backupCodes);
```

### Verify and Enable MFA

```typescript
const code = prompt('Enter code from authenticator:');
await client.mfaVerify(code);
```

### Check MFA Status

```typescript
const { enabled, backupCodesRemaining } = await client.mfaStatus();
```

## Relationships

### Create Relationship

```typescript
// Create node
const node = await client.relationshipNodeCreate('user', 'CI-IND-user1', {
  department: 'Engineering'
});

// Create edge
await client.relationshipEdgeCreate(
  node.nodeId,
  orgNode.nodeId,
  'member_of'
);
```

## Sessions

### List Sessions

```typescript
const sessions = await client.sessions();
console.log(`Active sessions: ${sessions.length}`);
```

### Revoke All Sessions

```typescript
await client.sessionsRevokeAll();
```

## Error Handling

```typescript
import { CorpID, CorpIDError } from '@hojai/corpid-sdk';

try {
  const user = await client.userGet('invalid-id');
} catch (error) {
  if (error instanceof CorpIDError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

## TypeScript Support

Full TypeScript support with all types exported:

```typescript
import type {
  User,
  Agent,
  WorkloadIdentity,
  Delegation,
  TrustScore,
  TimelineEntry
} from '@hojai/corpid-sdk';
```

## License

MIT
