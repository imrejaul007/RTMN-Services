# @hojai/cloud-sdk

> Unified SDK for all HOJAI Cloud services

```bash
npm install @hojai/cloud-sdk
```

## Quick Start

```javascript
import { HOJAI } from '@hojai/cloud-sdk';

const client = new HOJAI({
  apiKey: process.env.HOJAI_API_KEY,
  baseUrl: 'http://localhost:4380'
});
```

## Examples

### Deploy an App

```javascript
const deployment = await client.cloud.deploy({
  name: 'my-app',
  manifest: { name: 'My App' },
  files: { 'apps/backend/src/index.js': '...' }
});

console.log(deployment.url); // https://my-app.hojai.app
```

### Track AI Usage

```javascript
await client.cost.trackUsage({
  userId: 'user123',
  model: 'gpt-4',
  inputTokens: 1000,
  outputTokens: 500
});

const summary = await client.cost.getSummary({ userId: 'user123' });
console.log(`Total cost: $${summary.totalCost}`);
```

### Create a Voice Agent

```javascript
const agent = await client.voice.createAgent({
  name: 'Receptionist',
  language: 'en-IN',
  greeting: 'Hello, how can I help you?',
  voice: { provider: 'elevenlabs', voiceId: 'rachel' },
  transcription: { provider: 'deepgram' }
});

await client.voice.activateAgent(agent.id);
```

### Build a Workflow

```javascript
const workflow = await client.workflows.createWorkflow({
  name: 'Lead Capture'
});

await client.workflows.addNode(workflow.id, {
  type: 'trigger',
  label: 'Form Submit',
  config: { source: 'form' }
});

await client.workflows.addNode(workflow.id, {
  type: 'llm',
  label: 'Qualify Lead',
  config: { prompt: 'Is this qualified?' }
});

await client.workflows.execute(workflow.id);
```

### Manage Secrets

```javascript
await client.secrets.create({
  name: 'OPENAI_API_KEY',
  value: process.env.OPENAI_API_KEY,
  userId: 'user123',
  type: 'api-key'
});
```

### App Store

```javascript
const apps = await client.appStore.search('sales agent');
await client.appStore.install(apps[0].id, {
  userId: 'user123',
  projectId: 'proj456'
});
```

### Billing

```javascript
const plans = await client.billing.getPlans();
await client.billing.createSubscription({
  userId: 'user123',
  plan: 'professional'
});
```

### Notifications

```javascript
await client.notifications.send({
  userId: 'user123',
  title: 'Deployment Complete',
  body: 'Your app is now live!',
  channels: ['email', 'in_app']
});
```

### Team Collaboration

```javascript
const org = await client.collaboration.createOrg({
  name: 'My Company',
  ownerId: 'user123'
});

await client.collaboration.inviteMember({
  orgId: org.id,
  email: 'teammate@example.com',
  role: 'developer'
});
```

## API Reference

| Service | Client | Port |
|---------|--------|------|
| HOJAI Cloud | `client.cloud` | 4380 |
| App Store | `client.appStore` | 4400 |
| Cost Tracker | `client.cost` | 4410 |
| Secrets Manager | `client.secrets` | 4420 |
| Voice Studio | `client.voice` | 4430 |
| Workflow Builder | `client.workflows` | 4440 |
| Billing | `client.billing` | 4460 |
| Analytics | `client.analytics` | 4490 |
| Notifications | `client.notifications` | 4495 |
| Collaboration | `client.collaboration` | 4480 |

## License

MIT
