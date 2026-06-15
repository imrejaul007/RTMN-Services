# Changelog

All notable changes to the RTMN platform are documented here.

Format: [Semantic Versioning](https://semver.org/)
- **MAJOR** — Breaking changes
- **MINOR** — New features (backward-compatible)
- **PATCH** — Bug fixes (backward-compatible)

---

## [Unreleased] — 2026 Q3

### Added
- BrandPulse v1.0 — Brand intelligence & sentiment analysis
- New Industry OS: Energy OS (port 5250)
- New Industry OS: Media OS (port 5260)
- Karma Foundation public launch
- SOC 2 Type I audit (in progress)
- SUTAR OS v2 — autonomous economic infrastructure

### Changed
- Migrated all services to Node.js 20 LTS
- Replaced deprecated `request` library with native `fetch`
- Improved SDK error messages

### Security
- Mandated MFA for all production access
- Implemented quarterly key rotation policy

---

## [1.0.0] — 2026-06-15

### 🎉 First Stable Release

This is the first generally available (GA) release of the RTMN platform.

### Added
- **24 Industry Operating Systems** (Restaurant, Hotel, Healthcare, Retail, Legal, Education, Agriculture, Automotive, Beauty, Fashion, Fitness, Gaming, Government, Home Services, Manufacturing, Non-Profit, Professional, Sports, Travel, Entertainment, Construction, Financial, Real Estate, Transport)
- **35+ Digital Twin Services** (Agent, Property, Referral, Buyer, Deal, Area, and more)
- **Foundation Services** (CorpID 4702, MemoryOS 4703, GoalOS 4242, Decision Engine 4240, Agent Economy 4251)
- **HOJAI AI** — 190+ products including Genie, SUTAR OS, BrandPulse
- **RABTUL** — 40+ services (Auth, Wallet, Manufacturing, Workflow, RAG, Memory Cloud)
- **REZ-Merchant** — 100+ services
- **REZ-Consumer** — 80+ services
- **Karma Foundation** — Public launch of decentralized agent economy
- **Shared SDK** — TypeScript, Python, REST
- **GraphQL Federation** (port 4000)
- **Event Bus** (port 4510)
- **Service Registry** (port 4399)
- **Integration Gateway** (port 4314)

### Documentation
- RTNM Companies Audit
- RTNM Products & Features Audit
- Port Registry
- Service integration guides for all 24 industries

### Security
- TLS 1.3 enforced on all endpoints
- AES-256 encryption at rest
- Quarterly security audits
- Bug bounty program (planned Q4)

---

## [0.9.0] — 2026-04-01 — Public Beta

### Added
- Beta launch of 18 Industry OS
- Public API for BrandPulse (limited)
- Open registration for beta users
- Documentation portal

### Known Issues
- Higher-than-acceptable error rate on Hotel OS booking endpoint (fixed in 0.9.4)
- Memory OS sync delays >5s for large datasets (fixed in 0.9.6)

---

## [0.5.0] — 2026-01-15 — Closed Alpha

### Added
- 6 Industry OS (Restaurant, Hotel, Retail, Healthcare, Legal, Education)
- Foundation services (CorpID, MemoryOS, GoalOS, Decision Engine)
- 20+ Digital Twin services
- RABTUL Auth and Wallet
- Karma Foundation alpha

---

## Earlier Versions

Pre-1.0 versions were internal development builds and not publicly released.

---

*For the full release history with every patch, see the [GitHub Releases](https://github.com/rtmn-group/rtmn-services/releases) page (TBD).*
