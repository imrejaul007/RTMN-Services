#!/bin/bash
COMPANY=$1
SIZE=$2
NOTES=$3

cat > "/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY/legacy-audit/MIGRATION-README.md" << INNER
# $COMPANY Legacy Audit Archive

> **Date moved:** 2026-06-22
> **Source:** \`/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace/companies/$COMPANY/\`
> **Original size:** $SIZE

## What's in here

This directory contains the original $COMPANY codebase from the nested \`REZ-Workspace/companies/\` location, **before** it was consolidated into the current top-level structure.

### Contents

\`\`\`
legacy-audit/
├── *.md                   # Original audit reports, READMEs, architecture docs
├── *.sh *.yml *.json      # Deployment scripts, docker-compose, k8s configs
├── Dockerfile* .env*      # Container configs
└── legacy-services/       # Unique services only in nested (not in top-level)
\`\`\`

### Notes

$NOTES

### What was preserved

- All root-level audit/feature/architecture docs
- All unique nested services that aren't in top-level
- Original CLAUDE.md, README.md, docker configs, .env templates
- All \`.github/\`, \`.gitignore\`, deployment scripts

### What is NOT in here

- The current production code (lives at \`/Users/rejaulkarim/Documents/RTMN/companies/$COMPANY/\`)

## Reference

For the full migration audit, see:
\`/Users/rejaulkarim/Documents/RTMN/companies/REZ-Workspace-AUDIT-2026-06-22.md\`
INNER
echo "✓ $COMPANY"
