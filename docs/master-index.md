# Global Nexha Commerce Stack — Master Document Index
> **Version:** 3.2
> **Date:** June 30, 2026
> **Status:** Production-ready

---

## 📚 Complete Document Map

This is the **master index** to all Global Nexha Commerce Stack documentation. Every document is interconnected.

---

## 🏛️ Strategic Documents (Start Here)

| # | Document | Purpose | Audience |
|---|----------|---------|----------|
| 1 | [global-nexha-commerce-stack-v2.md](global-nexha-commerce-stack-v2.md) | **Master architecture** — Complete v3.2 frozen architecture | Everyone |
| 2 | [complete-user-journey.md](complete-user-journey.md) | End-to-end user journey with real example | Founders, Product |
| 3 | [production-deployment-guide.md](production-deployment-guide.md) | Production deployment with PM2, Nginx, SSL | DevOps, Ops |
| 4 | [api-reference-commerce-stack.md](api-reference-commerce-stack.md) | **Complete API reference** for all 13 services | Engineers |

---

## 📋 Planning & Audit Documents

| # | Document | Purpose | Audience |
|---|----------|---------|----------|
| 4 | [global-nexha-commerce-implementation-plan.md](global-nexha-commerce-implementation-plan.md) | 50-week phased implementation plan with full specs | PM, Engineering |
| 5 | [global-nexha-commerce-audit.md](global-nexha-commerce-audit.md) | Code audit (83% built, gap is integration) | Engineering |

---

## 🔨 Phase Completion Reports (Build Status)

| # | Phase | Document | Status |
|---|-------|----------|--------|
| 6 | Phase 0 | [phase-0-completion.md](phase-0-completion.md) | ✅ COMPLETE |
| 7 | Phase 1 | [phase-1-completion.md](phase-1-completion.md) | ✅ COMPLETE |
| 8 | Phase 2 | [phase-2-completion.md](phase-2-completion.md) | ✅ COMPLETE |
| 9 | Phase 3 | [phase-3-completion.md](phase-3-completion.md) | ✅ COMPLETE |
| 10 | Phase 4 | [phase-4-completion.md](phase-4-completion.md) | ✅ COMPLETE |
| 11 | Phase 5 | [phase-5-completion.md](phase-5-completion.md) | ✅ COMPLETE |

---

## 📐 Phase Specifications (Detailed Design)

| # | Phase | Document | Purpose |
|---|-------|----------|---------|
| 12 | Phase 0 | [phase-0-foundation-fixes.md](phase-0-foundation-fixes.md) | Foundation wiring specs |
| 13 | Phase 1 | [phase-1-unified-commerce-os.md](phase-1-unified-commerce-os.md) | CommerceOS gateway design |
| 14 | Phase 2 | [phase-2-bam-workers.md](phase-2-bam-workers.md) | BAM worker specifications |
| 15 | Phase 3 | [phase-3-commerce-templates.md](phase-3-commerce-templates.md) | Template & vendor pool design |
| 16 | Phase 4 | [phase-4-commerce-studio-ui.md](phase-4-commerce-studio-ui.md) | Studio UI design |

---

## 🚀 Operational Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| Startup | [scripts/start-commerce-stack.sh](../scripts/start-commerce-stack.sh) | Start/stop/health for all 13 services |
| E2E Tests | [scripts/e2e-test.sh](../scripts/e2e-test.sh) | End-to-end integration tests |

---

## 🎯 Quick Navigation by Role

### For Founders & Product Managers
1. Read [complete-user-journey.md](complete-user-journey.md) — Understand the user journey
2. Read [global-nexha-commerce-stack-v2.md](global-nexha-commerce-stack-v2.md) Part 2-3 — Architecture overview
3. Read [global-nexha-commerce-implementation-plan.md](global-nexha-commerce-implementation-plan.md) Part 5-9 — Phases & deliverables

### For Engineers
1. Read [global-nexha-commerce-stack-v2.md](global-nexha-commerce-stack-v2.md) Part 4-7 — ACP, SDK, VendorOS
2. Read [global-nexha-commerce-audit.md](global-nexha-commerce-audit.md) — What's already built
3. Read Phase 1-5 specifications — Implementation details
4. Run [scripts/start-commerce-stack.sh](../scripts/start-commerce-stack.sh) start — Launch locally

### For DevOps
1. Read [production-deployment-guide.md](production-deployment-guide.md) — Full deployment
2. Use [scripts/start-commerce-stack.sh](../scripts/start-commerce-stack.sh) — Operational commands
3. Run [scripts/e2e-test.sh](../scripts/e2e-test.sh) — Verify deployment

### For Investors
1. Read [global-nexha-commerce-stack-v2.md](global-nexha-commerce-stack-v2.md) — Strategic positioning (Part 1, 13)
2. Read [complete-user-journey.md](complete-user-journey.md) — What we enable

---

## 📊 Service Inventory (All 13 Built)

| # | Service | Port | Phase | Doc |
|---|---------|------|-------|-----|
| 1 | RTMN Hub | 4399 | 0 | [phase-0-completion.md](phase-0-completion.md) |
| 2 | CommerceOS Gateway | 5400 | 1 | [phase-1-completion.md](phase-1-completion.md) |
| 3 | BAM Gateway | 5550 | 2 | [phase-2-completion.md](phase-2-completion.md) |
| 4 | Vendor Acquisition Worker | 5551 | 2 | [phase-2-completion.md](phase-2-completion.md) |
| 5 | Catalog Normalization Worker | 5552 | 2 | [phase-2-completion.md](phase-2-completion.md) |
| 6 | Recommendation Worker | 5553 | 2 | [phase-2-completion.md](phase-2-completion.md) |
| 7 | Template Engine | 5670 | 3 | [phase-3-completion.md](phase-3-completion.md) |
| 8 | Vendor Liquidity Pools | 5680 | 3 | [phase-3-completion.md](phase-3-completion.md) |
| 9 | Commerce Studio Backend | 5750 | 4 | [phase-4-completion.md](phase-4-completion.md) |
| 10 | Commerce Studio Web | 3001 | 4 | [phase-4-completion.md](phase-4-completion.md) |
| 11 | Product Graph | 5800 | 5 | [phase-5-completion.md](phase-5-completion.md) |
| 12 | Trade Finance | 5810 | 5 | [phase-5-completion.md](phase-5-completion.md) |
| 13 | Cross-Border Commerce | 5820 | 5 | [phase-5-completion.md](phase-5-completion.md) |
| 14 | Universal Distribution | 5830 | 5 | [phase-5-completion.md](phase-5-completion.md) |

---

## 🎯 Reading Paths

### "I have 5 minutes"
→ Read this index file only.

### "I have 30 minutes"
1. Read the v2.1 architecture doc (intro + Part 1-2)
2. Read the complete-user-journey.md
3. Skim the implementation plan

### "I have 2 hours"
1. Read the entire v2.1 architecture doc
2. Read complete-user-journey.md
3. Read the audit doc
4. Read phase completion reports

### "I need to build something"
1. Read global-nexha-commerce-implementation-plan.md (your phase)
2. Read the corresponding phase completion doc
3. Check service code in `services/` or `companies/`

### "I need to deploy to production"
1. Read production-deployment-guide.md
2. Run `scripts/start-commerce-stack.sh start`
3. Run `scripts/e2e-test.sh`
4. Follow PM2 + Nginx + SSL setup

---

## 🔗 Cross-References

- **Architecture v3.2**: See [stack-v2 Part 2](global-nexha-commerce-stack-v2.md) for the corrected stack
- **Why CommerceOS matters**: See [audit doc](global-nexha-commerce-audit.md) — section on critical findings
- **How to use it**: See [complete-user-journey.md](complete-user-journey.md) — The Spice Garden example
- **How to deploy it**: See [production-deployment-guide.md](production-deployment-guide.md) — Step-by-step

---

## 📈 Document Maintenance

| Document | Version | Last Updated | Maintained By |
|----------|---------|--------------|---------------|
| Architecture | 3.2 | June 30, 2026 | Architecture Team |
| Audit | 1.0 | June 30, 2026 | Engineering |
| Implementation Plan | 1.0 | June 30, 2026 | PM |
| User Journey | 1.0 | June 30, 2026 | Product |
| Deployment Guide | 1.0 | June 30, 2026 | DevOps |
| Phase Completion Reports | 1.0 | June 30, 2026 | Engineering |

---

## ✅ Quick Status

```
Total Services Built:     14 (13 backend + 1 frontend)
Total Documentation:      18 files (~370KB)
Total Tests:               50+ integration tests
Total Roadmap:            50 weeks (~12 months)
Status:                    🎉 PRODUCTION READY
Deployment:               Docker Compose + startup script
Monitoring:               Prometheus config ready
SSL/TLS:                   Nginx config ready
```

---

## 🐳 Docker Deployment

```bash
# Start everything with Docker
docker compose -f docker-compose.commerce.yml up -d

# With monitoring
docker compose -f docker-compose.commerce.yml --profile monitoring up -d

# Stop
docker compose -f docker-compose.commerce.yml down
```

---

## 🆘 Emergency Operations

### Service Won't Start

1. Check logs: `tail -f logs/<service-name>.log`
2. Verify ports: `lsof -i :4399` (or relevant port)
3. Run health check: `./scripts/start-commerce-stack.sh health`
4. Run E2E: `./scripts/e2e-test.sh`

### Rollback

```bash
# Revert to last good state
git log --oneline -5
git revert <commit-hash>
./scripts/start-commerce-stack.sh start
```

---

*Master Index Version 1.1*
*June 30, 2026*