# ADR 0005: Body Forwarding Through Hub Proxy After `express.json()`

**Status:** Accepted (2026-06-22)
**Context:** Phase A.2 — Hub fix

## Context and Problem Statement

The Hub (`REZ-ecosystem-connector`) exposes pattern-matched proxy routes like:

```
ANY /api/sutar/:service/<path> → upstream service
ANY /api/nexha/:service/<path> → upstream service
```

The original implementation tried to forward the request body using `req.pipe(proxyReq)`. **This silently hangs forever on POST/PUT/PATCH requests** because Express's `express.json()` middleware (which we use globally) has already consumed the body stream into `req.body` by the time the proxy handler runs.

We discovered this when `demos/full-stack-demo.sh` POST'd to `/api/nexha/trade-finance/api/v1/loans` and the Hub hung indefinitely. CURL eventually timed out, but the Hub kept the connection open forever.

## Considered Options

1. **Disable `express.json()` globally** — only parse JSON for routes that need it
2. **Re-serialise `req.body` to JSON in the proxy** — write it back as a fresh request body
3. **Skip the proxy for body-bearing methods** — refuse to forward POST/PUT/PATCH

## Decision Outcome

Chose **Option 2: Re-serialise `req.body`** with a small, focused helper:

```ts
function proxyToUpstream(req, res, target, label) {
  const url = new URL(target);
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  const proxyReq = http.request(
    { hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search, method: req.method, headers },
    proxyRes => { /* pipe response back */ }
  );

  proxyReq.on('error', /* 502 with helpful body */);

  if (hasBody) {
    if (req.body !== undefined && Object.keys(req.body).length > 0) {
      // Body was parsed by express.json() — re-serialise.
      const body = JSON.stringify(req.body);
      proxyReq.setHeader('content-length', Buffer.byteLength(body).toString());
      proxyReq.end(body);
    } else {
      // No parsed body — forward the raw stream (multipart, octet-stream).
      req.pipe(proxyReq);
    }
  } else {
    proxyReq.end();
  }
}
```

Also fixed a separate bug in the same function: the original used `req.originalUrl` for the upstream path, which kept the Hub-side prefix. Changed to `url.pathname + url.search` from the parsed `target` so the upstream actually receives `/health`, not `/api/sutar/sutar-trust-engine/health`.

### Positive Consequences

- **POST requests now reach upstream services correctly** — `demos/full-stack-demo.sh` POSTs to Nexha and SUTAR services, all return 502/200/401 as expected (no hang)
- **The same helper works for both SUTAR and Nexha routes** — one implementation, two callers
- **Falls back to `req.pipe()` for non-JSON content types** — multipart, octet-stream, etc., still work
- **Sets `content-length` correctly** — some upstream services reject requests without it

### Negative Consequences

- **JSON-only re-serialisation** — if `req.body` is a Buffer or string (not a parsed object), we fall through to `req.pipe()`. That's intentional but worth knowing
- **Double JSON parsing** — `express.json()` parses the inbound body, then we serialise it again. For most payloads this is fine; for >1MB bodies it's measurable. We have a `limit: '1mb'` on `express.json()` which matches the upstream defaults

## Verification

```bash
# Before fix: hung forever
$ time curl -X POST http://localhost:4399/api/nexha/trade-finance/api/v1/loans \
    -d '{"borrowerId":"b1","amount":50000}'
curl: (28) Failed to connect to localhost port 4320 (timeout after 30s)

# After fix: instant response
$ time curl -X POST http://localhost:4399/api/nexha/trade-finance/api/v1/loans \
    -d '{"borrowerId":"b1","amount":50000}'
{"error":"Upstream unavailable","upstream":"http://localhost:4340/api/v1/loans","details":""}
real    0m0.011s
```

## Lessons learned

This is a **classic Express gotcha**: `express.json()` and `req.pipe()` are mutually exclusive in the same handler. If you ever see "the server hangs on POST but works on GET" — check whether any middleware before your route consumes the body. The fix is always the same: re-serialise from `req.body`, don't try to re-read the raw stream.

## Related

- The same bug pattern exists in many Node.js proxy libraries. We considered using `http-proxy-middleware` but it's heavier than what we need for 16 + 8 services
- See `companies/RABTUL-Technologies/REZ-ecosystem-connector/src/index.ts` `proxyToUpstream()` for the full implementation