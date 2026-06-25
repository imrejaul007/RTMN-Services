#!/bin/bash
BASE="/Users/rejaulkarim/Documents/RTMN/companies/Nexha/services"
cd "$BASE"
for svc in nexha-supplier-network nexha-distribution-network nexha-pricing-network nexha-trade-finance-network nexha-warehouse-network nexha-business-directory nexha-acp-messaging nexha-mission-planner nexha-partner-graph nexha-commerce-runtime nexha-provisioning-engine nexha-hooks-sdk nexha-tenant-summary nexha-gateway nexha-capability-os nexha-discovery-os nexha-reputation-os nexha-federation-os nexha-opportunity-os nexha-market-os nexha-global-directory nexha-autonomous-logistics; do
  if [ -d "$svc" ]; then
    cd "$svc"
    RESULT=$(npm test 2>&1 | grep -E "Tests [0-9]+ passed|Tests [0-9]+ failed|No test files|error" | head -1)
    echo "$svc: ${RESULT:-unknown}"
    cd "$BASE"
  else
    echo "$svc: MISSING"
  fi
done
