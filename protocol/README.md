# RTMN Protocol Specifications

> **Open, vendor-neutral specs for multi-agent commerce.**
> **License:** Apache-2.0
> **Status:** v0.1.0 drafts (2026-06-23). Not yet 1.0.

These specs describe **how two agents talk to each other**, **how agents find each other**, and **how industry compliance is described declaratively**. RTMN ships reference implementations of all three, but the specs themselves are independent of the RTMN ecosystem.

| Spec | Purpose | Reference impl | Sample SDKs |
|------|---------|-----------------|-------------|
| **[ACP — Agent Commerce Protocol](specs/ACP.md)** | JSON-over-HTTPS message protocol for agent-to-agent transactions (query → quote → counter → accept → order → track → dispute). | [`nexha-acp-messaging`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-acp-messaging) (78 tests) | [acp-js ✅](sample-sdk/acp-js/) (24 tests) · acp-python (community) |
| **[Capability Graph](specs/CAPABILITY-GRAPH.md)** | Federated, queryable registry of agents, capabilities, and trust signals. DNS-style federation. | [`nexha-business-directory`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-business-directory) (68 tests) | [capgraph-js ✅](sample-sdk/capgraph-js/) (22 tests) · capgraph-python (community) |
| **[ICS — Industry Compliance Schema](specs/INDUSTRY-COMPLIANCE-SCHEMA.md)** | Declarative JSON Schema describing the compliance posture of an Industry OS tenant instance. | [`industry-tenant-instances`](https://github.com/imrejaul007/RTMN-Services/tree/main/industry-os/services/industry-tenant-instances) (136 tests) | [ics-js ✅](sample-sdk/ics-js/) (45 tests) · ics-python (community) |

## Why open spec, closed implementation

This is the **Kubernetes / OAuth / Linux Foundation pattern**:

- **Specs** are MIT/Apache-2.0. Anyone can implement them.
- **Reference implementations** stay in the RTMN monorepo (this repo).
- **Reference SDKs** stay here too, so the community can adopt quickly.

By opening the specs (without opening the implementation), RTMN benefits from:
- **Wider adoption.** Any team can build an ACP-compatible agent in their language of choice.
- **Better feedback.** External implementers surface spec bugs that internal teams miss.
- **No lock-in fear.** Tenants who fear platform lock-in can build a thin compatibility layer and leave whenever they want — and most never do, because the implementation is genuinely better.

The implementation itself stays proprietary because it contains hard-won business logic (the 480 services, the 1,719 vitest tests, the AI agents, the 26 industry verticals). The spec is the public contract.

## Status of each spec

| Spec | Version | Status | Breaking changes allowed? |
|------|---------|--------|---------------------------|
| ACP | 0.1.0 | Draft, open for review | Yes, while in 0.x |
| Capability Graph | 0.1.0 | Draft, open for review | Yes, while in 0.x |
| ICS | 0.1.0 | Draft, open for review | Yes, while in 0.x |

We plan to ship 1.0 versions of all three once we've had at least 3 months of public feedback and at least one external implementation each.

## Directory structure

```
protocol/
├── LICENSE                       # Apache-2.0
├── README.md                     # this file
├── specs/
│   ├── ACP.md                    # Agent Commerce Protocol spec
│   ├── CAPABILITY-GRAPH.md       # Capability Graph spec
│   ├── INDUSTRY-COMPLIANCE-SCHEMA.md  # ICS spec
│   └── ics.schema.json           # machine-readable ICS schema
└── sample-sdk/                   # Reference SDKs in JS + Python
    ├── acp-js/                    # ✅ shipped (24 tests)
    ├── acp-python/                # (community)
    ├── capgraph-js/               # ✅ shipped (22 tests)
    ├── capgraph-python/           # (community)
    ├── ics-js/                    # ✅ shipped (45 tests)
    └── ics-python/                # (community)
```

**Total sample-SDK tests shipped: 91** (24 acp-js + 22 capgraph-js + 45 ics-js). Python SDKs are welcome as community contributions — see [How to participate](#how-to-participate).

## How to participate

1. **Read a spec.** Start with the one most relevant to your problem.
2. **Build a sample implementation** in your language. Push it as a new folder under `sample-sdk/`.
3. **File issues** for ambiguities, missing edge cases, or contradictions. Tag them `acp-discussion`, `capgraph-discussion`, or `ics-discussion`.
4. **Propose changes** via PR. For breaking changes, please open a discussion issue first.

## Versioning policy

- **v0.x** (current) — anything can change. Use the version in the URL path (`/acp/v1/...` means path is stable; protocol message shape can change in v0).
- **v1.0** — first stable release. Backwards-compatible changes only; new major versions required for breaking changes.
- **v1.x+** — backwards-compatible within major version. Receivers MUST support previous major for 12 months.

## Reference implementations

The reference implementations are NOT in this directory — they live in the RTMN monorepo, with their own test suites and CI:

- ACP: [`companies/Nexha/services/nexha-acp-messaging/`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-acp-messaging) — 78 vitest tests.
- Capability Graph: [`companies/Nexha/services/nexha-business-directory/`](https://github.com/imrejaul007/RTMN-Services/tree/main/companies/Nexha/services/nexha-business-directory) — 68 vitest tests.
- ICS: [`industry-os/services/industry-tenant-instances/`](https://github.com/imrejaul007/RTMN-Services/tree/main/industry-os/services/industry-tenant-instances) — 136 vitest tests.

## Roadmap

- **2026-07**: External feedback window on all three v0.1.0 specs.
- **2026-09**: v1.0 release of ACP (most stable, most-implemented).
- **2026-12**: v1.0 release of Capability Graph + ICS.
- **2027-Q1**: Found the RTMN Protocol Foundation (independent governance), transfer stewardship.

## Acknowledgements

These specs draw inspiration from:
- **Kubernetes** — for the open-spec-closed-impl pattern
- **OAuth 2.0** — for the signature + transport layering
- **JSON-LD / Schema.org** — for declarative compliance posture
- **Stripe / Plaid** — for the developer-experience focus in the sample SDKs

## License

Apache-2.0. See [LICENSE](LICENSE).