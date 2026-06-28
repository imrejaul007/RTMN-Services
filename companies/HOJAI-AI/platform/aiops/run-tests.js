#!/usr/bin/env node
import { spawn } from 'child_process';
const p = spawn('/Users/rejaulkarim/Documents/RTMN/node_modules/vitest/vitest.mjs', ['run', '--reporter=verbose'], { cwd: '/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/aiops', stdio: 'inherit' });
p.on('exit', (c) => process.exit(c));
