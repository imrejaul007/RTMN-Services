#!/bin/bash
cd "$(dirname "$0")"
node node_modules/vitest/vitest.mjs run --reporter=verbose
