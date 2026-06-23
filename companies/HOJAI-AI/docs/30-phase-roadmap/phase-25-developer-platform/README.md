# Phase 25: Developer Platform — SDKs & CLI

**Duration:** 3 weeks (Week 63–65)
**Priority:** P1 (High)
**Owner:** Product Engineer

---

## Goal

Make HOJAI easy to build on with SDKs, CLI, templates, testing, debugging, tracing, and marketplace publishing.

---

## 10 Developer Platform Components

### 25.1 SDKs

**Languages:**
- **Node.js:** `@hojai/sdk`
- **Python:** `hojai`
- **Go:** `github.com/hojai/hojai-go`
- **Java:** `ai.hojai:hojai-sdk`
- **REST API** (language-agnostic)

---

### 25.2 CLI

**Commands:**
```bash
hojai init              # Create new project
hojai dev               # Local development
hojai deploy            # Deploy to HOJAI Cloud
hojai test              # Run tests
hojai debug             # Debug agent
hojai logs              # View logs
hojai trace             # View traces
hojai publish           # Publish to marketplace
hojai install <package> # Install skill/agent
hojai search <query>    # Search marketplace
```

---

### 25.3 Templates

**50+ Starters:**
- Slack bot
- Discord bot
- WhatsApp bot
- Customer support agent
- Sales agent
- Marketing agent
- Code reviewer
- Data analyst
- ... and 42 more

---

### 25.4 Testing Framework

**Test Types:**
- Unit testing (`hojai test`)
- Integration testing (multi-service)
- Load testing (1000 req/s)
- Regression testing (eval suite)
- A/B testing (compare versions)

---

### 25.5 Debugger

**Features:**
- Step-through execution
- Breakpoints (pause on condition)
- Variable inspection (see memory state)
- Trace viewer (see agent reasoning)

---

### 25.6 Tracing

**Features:**
- OpenTelemetry integration
- Distributed tracing (across services)
- Span visualization (Jaeger UI)
- Performance profiling

---

### 25.7 Local Runtime

**Features:**
- Docker Compose (all services locally)
- One-command setup (`hojai local start`)
- Hot reload (edit code, see changes)
- Offline mode (no internet required)

---

### 25.8 Deploy

**Features:**
- One-click deploy (to HOJAI Cloud)
- Gradual rollout (10% → 50% → 100%)
- Automatic rollback (if errors spike)
- Zero-downtime deploys

---

### 25.9 Rollback

**Features:**
- Instant rollback (to previous version)
- Selective rollback (rollback one service)
- Data rollback (restore from backup)
- Audit trail

---

### 25.10 Marketplace Publish

**Features:**
- One-command publish (`hojai publish`)
- Automated testing (before publish)
- Version management (semver)
- Revenue tracking (earnings dashboard)

---

## Success Criteria

✅ 5 SDKs released (Node, Python, Go, Java, REST)
✅ CLI with 10+ commands
✅ 50+ starter templates
✅ Testing and debugging tools
✅ 10K developers building on HOJAI
✅ 100K apps deployed

---

*Phase 25 documentation: 2026-06-22*