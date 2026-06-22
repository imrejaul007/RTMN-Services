# Service-to-Service Auth Bridge (4779)

JWT-based service-to-service authentication with HMAC-SHA256 signing. Provides mTLS-equivalent security without requiring cert-manager / Istio / Linkerd infrastructure.

## Endpoints

- `GET /health` — health check
- `GET /api/services` — list registered services
- `POST /api/services` — register a new service (with scopes)
- `POST /api/tokens/issue` — issue a JWT for a service
- `POST /api/tokens/verify` — verify a JWT
- `POST /api/tokens/:jti/revoke` — revoke a token
- `POST /api/services/:id/rotate` — rotate service key (mTLS-equivalent cert rotation)
- `GET /api/keys/fingerprint/:service_id` — get public key fingerprint
- `GET /api/revocations` — list revoked tokens
- `GET /api/rotations` — list key rotations

## Token Format

Standard JWT (HS256):
- Header: `{ alg: "HS256", typ: "JWT" }`
- Claims: `sub`, `sid`, `scopes`, `aud`, `fp`, `iat`, `nbf`, `exp`, `jti`
- Default TTL: 3600s (configurable via `TOKEN_TTL_SEC`)

## Run

```bash
SERVICE_SIGNING_SECRET=$(openssl rand -hex 32) PORT=4779 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```

## Notes

- Production deployments MUST set `SERVICE_SIGNING_SECRET` from secrets-manager
- For real mTLS, use this service in tandem with envoy sidecars / linkerd proxies
- Unshelves the BLOCKED mTLS item in Division 01 (Foundation)