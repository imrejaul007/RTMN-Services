#!/usr/bin/env node
// Self-contained test runner for multi-modal
import { spawn } from 'child_process';
const p = spawn('/Users/rejaulkarim/Documents/RTMN/node_modules/vitest/vitest.mjs', ['run', '--reporter=verbose'], { cwd: '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/intelligence/multi-modal', stdio: 'inherit' });
p.on('exit', (c) => process.exit(c));
