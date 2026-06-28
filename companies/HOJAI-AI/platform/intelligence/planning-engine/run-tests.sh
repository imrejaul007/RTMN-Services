#!/bin/bash
cd "$(dirname "$0")"
node /Users/rejaulkarim/Documents/RTMN/node_modules/vitest/vitest.mjs run --reporter=verbose 2>&1 | tail -50
