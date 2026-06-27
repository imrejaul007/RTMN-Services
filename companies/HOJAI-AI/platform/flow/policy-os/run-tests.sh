#!/bin/bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/flow/policy-os
node --test __tests__/unit/*.test.mjs 2>&1 | tail -20