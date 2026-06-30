# GENIE QUICK REF
**Date:** June 30, 2026

## Services

| Port | Service |
|------|---------|
| 4399 | RTMN Hub |
| 4701 | Genie Gateway |
| 4740-4755 | 14 Genie services |
| 7100 | Genie Runtime |

## npm install + build

```bash
cd services/rtmn-unified-hub && npm install && npm run build && npm start
cd ../../companies/HOJAI-AI/products/genie
for svc in genie-decision-intelligence genie-learning-loop genie-anticipation genie-ambient genie-constitution genie-financial-life genie-health-intelligence genie-household genie-travel genie-spiritual genie-life-simulation genie-focus genie-dreams genie-legacy; do
    cd $svc
    npm install
    npm run build || npx tsc
    cd ..
done
```

## Check Health

```bash
curl http://localhost:4399/health
curl http://localhost:4399/api/health/all
curl http://localhost:7100/health
curl http://localhost:4740/health
```

## Docs

- docs/FINAL-COMPLETE-AUDIT-2026-06-29.md
- docs/BUILD-COMPLETE-SUMMARY.md
- docs/INTEGRATION-MAP.md
- docs/PHANTOM-DIRECTORY-AUDIT.md
- docs/BUILD-PROGRESS.md
- docs/BUILD-WHAT-MISSING.md
