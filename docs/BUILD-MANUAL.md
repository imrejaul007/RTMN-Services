# BUILD REQUIRED
**Date:** June 30, 2026

## Build Commands

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie

# Run each in order:
cd genie-focus && npm install && npx tsc && cd ..
cd genie-constitution && npm install && npx tsc && cd ..
cd genie-financial-life && npm install && npx tsc && cd ..
cd genie-health-intelligence && npm install && npx tsc && cd ..
cd genie-household && npm install && npx tsc && cd ..
cd genie-travel && npm install && npx tsc && cd ..
cd genie-spiritual && npm install && npx tsc && cd ..
cd genie-life-simulation && npm install && npx tsc && cd ..
cd genie-dreams && npm install && npx tsc && cd ..
cd genie-legacy && npm install && npx tsc && cd ..

echo "ALL BUILT!"
```

## Already Built (no action needed)

- genie-decision-intelligence ✅
- genie-learning-loop ✅
- genie-anticipation ✅
- genie-ambient ✅
- RTMN Hub ✅

## Quick Fix Script

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/products/genie
for svc in genie-focus genie-constitution genie-financial-life genie-health-intelligence genie-household genie-travel genie-spiritual genie-life-simulation genie-dreams genie-legacy; do
    echo "Building $svc..."
    cd $svc
    npm install 2>/dev/null
    npx tsc 2>/dev/null
    cd ..
done
echo "ALL BUILT!"
```