# @rtmn/acp — JavaScript SDK for ACP v0.1.0

> Reference SDK implementing the [ACP (Agent Commerce Protocol) v0.1.0](../../specs/ACP.md) in Node.js ≥ 20.
> Apache-2.0 licensed. No runtime dependencies beyond Node built-ins.

## Install

```bash
npm install @rtmn/acp
```

Or just copy the `src/` folder — there are zero external dependencies.

## Quick start

```js
import { build, send, signBody, verifySignature } from '@rtmn/acp';

// Build a well-formed envelope
const query = build({
  type: 'QUERY',
  from: { agentId: 'agt_consumer', tenantId: 't_me' },
  to:   { agentId: 'agt_merchant', tenantId: 't_them' },
  payload: {
    productOrService: 'Margherita pizza, 12 inch',
    quantity: 2,
    deliveryAddress: { lat: 25.20, lon: 55.27 },
    constraints: { maxPriceCents: 4500, currency: 'AED' },
  },
});

// Send it (signs the body with HMAC-SHA256 + adds X-ACP-Signature header)
const response = await send(query, {
  endpoint: 'https://merchant.example.com',
  secret: process.env.SHARED_SECRET,
});
console.log(response); // { received: true, ... }
```

## API

### `build({ type, from, to, payload, threadId?, inReplyTo? })`

Returns a well-formed ACP envelope with a fresh `messageId` and `occurredAt`. Throws if required fields are missing or the type is unknown.

### `validateTransition(from, to) → boolean`

Returns `true` if a transition from `from` to `to` is allowed by the ACP state machine. Throws nothing.

### `signBody(body, secret) → "sha256=<hex>"`

Produces the value for the `X-ACP-Signature` header.

### `verifySignature(body, signatureHeader, secret) → boolean`

Timing-safe verification. Returns `false` for any mismatch (wrong signature, non-`sha256=` prefix, length mismatch).

### `send(envelope, { endpoint, secret, fetcher? }) → Promise<object>`

POSTs the envelope to `{endpoint}/acp/v1/messages`, signs it, parses the JSON response. Throws on non-2xx with `err.status` and `err.code` set.

## Custom fetch

For testing, pass a `fetcher`:

```js
const fetcher = async (url, init) => ({
  ok: true,
  status: 200,
  json: async () => ({ received: true }),
});
await send(envelope, { endpoint: 'https://x', secret: 's', fetcher });
```

## Run the tests

```bash
node --test
```

24 tests, all passing.

## License

Apache-2.0. See [LICENSE](../../LICENSE).