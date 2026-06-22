# sutar-identity

> **Service:** SUTAR OS Identity OS
> **Port:** 4144
> **Layer:** 2 (Twin + Memory + Identity + Agent ID)
> **Built:** June 20, 2026
> **Status:** ✅ Production-ready v1.0

## What it does

SUTAR-scoped identity layered over CorpID (4702). Issues SUTAR identities
that have a CorpID parent + SUTAR-specific claims (role, capabilities,
participating intents, reputation seed).

Distinguishes itself from CorpID by adding:
- **Role** — merchant / consumer / facilitator / observer / system
- **Claims** — what the identity is allowed to do (e.g. `negotiator`)
- **Reputation** — starting score that gets updated over time
- **Cross-attestation** — identity X vouches for identity Y

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health + counts |
| POST | `/api/identities` | Issue a new SUTAR identity (corpId + role + claims) |
| GET | `/api/identities` | List identities (optional ?role filter) |
| GET | `/api/identities/:sutarId` | Get one identity |
| POST | `/api/identities/:sutarId/claims` | Add a claim |
| POST | `/api/identities/:sutarId/revoke` | Revoke an identity |
| POST | `/api/identities/:sutarId/attest` | Attest that X vouches for Y (with weight) |
| GET | `/api/corpid/proxy/:corpId` | Proxy to CorpID |
| GET | `/api/audit` | Recent operations |

## Seeded identities

- `sutar-merchant-001` — corp-merchant-001, role=merchant, claims=[negotiator]
- `sutar-consumer-001` — corp-consumer-001, role=consumer, claims=[intent-publisher]
- `sutar-system-001` — corp-system-001, role=system, claims=[*]

## Next steps

- Persist identities to MongoDB
- Integrate with reputation-aggregator (4258) to update scores from attestations
- Sign SUTAR identity tokens with CorpID JWT keys
