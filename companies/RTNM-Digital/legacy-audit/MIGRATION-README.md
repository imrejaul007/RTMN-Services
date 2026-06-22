# RTNM-Digital Legacy Audit Archive

> **Date moved:** 2026-06-22
> **Source:** `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/RTNM-Digital/`
> **Original size:** 1.0M

## What's in here

This directory contains the original RTNM-Digital codebase from the nested `REZ-Workspace/companies/` location, **before** it was consolidated into the current top-level structure.

### Contents

```
legacy-audit/
├── *.md                   # Original audit reports, READMEs, architecture docs
├── *.sh *.yml *.json      # Deployment scripts, docker-compose, k8s configs
├── Dockerfile* .env*      # Container configs
└── legacy-services/       # Unique services only in nested (not in top-level)
```

### Notes

Nested had REZ-SalesMind, REZ-attribution-engine, REZ-integration-hub, rez-identity-hub. All preserved.

### What was preserved

- All root-level audit/feature/architecture docs
- All unique nested services that aren't in top-level
- Original CLAUDE.md, README.md, docker configs, .env templates
- All `.github/`, `.gitignore`, deployment scripts

### What is NOT in here

- The current production code (lives at `/Users/rejaulkarim/Documents/RTMN/companies/RTNM-Digital/`)

## Reference

For the full migration audit, see:
`/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace-AUDIT-2026-06-22.md`
