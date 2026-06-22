# HOJAI-AI Legacy Audit Archive

> **Date moved:** 2026-06-22
> **Source:** `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/HOJAI-AI/`
> **Original size:** 114M (198 items)

## What's in here

This directory contains the original HOJAI-AI codebase from the nested `REZ-Workspace/companies/` location, **before** it was consolidated into the current top-level structure.

### Contents

```
legacy-audit/
├── *.md                   # Original audit reports, READMEs, architecture docs
├── *.sh *.yml *.json      # Deployment scripts, docker-compose, k8s configs
├── Dockerfile* .env*      # Container configs
└── legacy-services/       # Unique services only in nested (not in top-level)
```

### Notes

Nested was an older 198-item sprawl (genie-*, hojai-*, finance-*, sutar-*). Top-level HOJAI-AI/ already has the structured organization (platform/, products/, sutar-os/, divisions/, blr-ai-marketplace/). Nested hojai-sutar-os/services/ had 26 sutar services with 86K+ LOC vs 9 in top-level. Content was restored from the companies.zip safety backup.

### What was preserved

- All root-level audit/feature/architecture docs
- All unique nested services that aren't in top-level
- Original CLAUDE.md, README.md, docker configs, .env templates
- All `.github/`, `.gitignore`, deployment scripts

### What is NOT in here

- The current production code (lives at `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/`)

## Reference

For the full migration audit, see:
`/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace-AUDIT-2026-06-22.md`
