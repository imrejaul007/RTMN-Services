/**
 * Tests for the @hojai/cli main entry point.
 *
 * Since the CLI uses console output and process.exit, we mock both.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, VERSION } from '../index.js';

function captureConsole() {
  const logs: string[] = [];
  const errs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origExit = process.exit;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errs.push(args.join(' '));
  process.exit = (() => { throw new Error('process.exit called'); }) as never;
  return {
    logs, errs,
    restore() {
      console.log = origLog;
      console.error = origErr;
      process.exit = origExit;
    }
  };
}

test('hojai (no args) prints help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai']);
    assert.ok(cap.logs.some(l => l.includes('Usage: hojai')), 'should print usage');
  } finally { cap.restore(); }
});

test('hojai --version prints version', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', '--version']);
    assert.ok(cap.logs.some(l => l.includes(VERSION)), 'should print version');
  } finally { cap.restore(); }
});

test('hojai help prints full help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'help']);
    assert.ok(cap.logs.some(l => l.includes('Manage CLI configuration')));
    assert.ok(cap.logs.some(l => l.includes('hojai memory capture')));
  } finally { cap.restore(); }
});

test('hojai config show prints current config', async () => {
  const cap = captureConsole();
  try {
    process.env.HOJAI_API_KEY = 'hojai_live_test';
    process.env.HOJAI_BASE_URL = 'https://test.api.hojai.ai';
    await main(['node', 'hojai', 'config']);
    const out = cap.logs.join('\n');
    assert.ok(out.includes('https://test.api.hojai.ai'), 'should show base URL');
    delete process.env.HOJAI_API_KEY;
    delete process.env.HOJAI_BASE_URL;
  } finally { cap.restore(); }
});

test('hojai unknown command exits with error + help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'totally-bogus']);
    assert.ok(cap.errs.some(e => e.includes('Unknown command')), 'should error');
  } catch (e) {
    // process.exit was called (expected)
    assert.ok((e as Error).message.includes('process.exit'));
  } finally { cap.restore(); }
});

test('hojai whoami without API key errors', async () => {
  const cap = captureConsole();
  try {
    delete process.env.HOJAI_API_KEY;
    await main(['node', 'hojai', 'whoami']);
    assert.ok(cap.errs.some(e => e.includes('No API key')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally { cap.restore(); }
});
