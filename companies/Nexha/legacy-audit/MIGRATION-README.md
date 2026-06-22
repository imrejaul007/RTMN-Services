# Nexha Legacy Audit Archive

> **Date moved:** 2026-06-22
> **Source:** `/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/Nexha/`
> **Original size:** 4.8M

## What's in here

This directory contains the original Nexha codebase from the nested `REZ-Workspace/companies/` location, **before** it was consolidated into the current top-level structure.

### Contents

```
legacy-audit/
├── *.md                   # Original audit reports, READMEs, architecture docs
├── *.sh *.yml *.json      # Deployment scripts, docker-compose, k8s configs
├── Dockerfile* .env*      # Container configs
└── legacy-services/       # Unique services only in nested (not in top-level)
```

### Notes

Top-level already has all 9 microservices + shared + tests + docs + scripts. Nested had extra k8s/, mobile/, nexha-commerce-network/ dirs + audit reports - all preserved.

### What was preserved

- All root-level audit/feature/architecture docs
- All unique nested services that aren't in top-level
- Original CLAUDE.md, README.md, docker configs, .env templates
- All `.github/`, `.gitignore`, deployment scripts

### What is NOT in here

- The current production code (lives at `/Users/rejaulkarim/Documents/RTMN/companies/Nexha/`)

## Reference

For the full migration audit, see:
`/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace-AUDIT-2026-06-22.md`
