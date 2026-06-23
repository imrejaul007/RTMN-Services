# @hojai/skills-sdk

TypeScript SDK for the **SkillOS** AI Capability Marketplace.

## Install

```bash
npm install @hojai/skills-sdk
```

## Usage

```typescript
import { SkillsClient } from '@hojai/skills-sdk';

const client = new SkillsClient({
  baseUrl: 'http://localhost:4743',
  token: process.env.HOJAI_AUTH_TOKEN,
});

// List all skill assets
const { data } = await client.getApiAssets({ type: 'skill' });
console.log(data.assets);

// Install an asset for a tenant
const install = await client.postApiAssetsIdInstall('ast-agent-salesbot', {}, { tenantId: 'acme-corp' });

// Search with semantic similarity
const results = await client.getApiDiscoverSemantic({ q: 'negotiate price', k: 5 });
console.log(results.data.results);
```

## Regenerate

```bash
node scripts/generate-sdk.mjs
```

Reads `/openapi.json` from the running SkillOS service and writes a fresh
TypeScript client. The generated files have a `DO NOT EDIT BY HAND` header.

## License

MIT
