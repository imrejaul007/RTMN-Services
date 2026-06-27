/**
 * PolicyOS Input Sanitization Tests (Phase 0.7)
 *
 * Covers:
 *  - Prototype pollution deep-scan + stripping
 *  - Policy ID sanitization
 *  - Webhook URL validation (schemes, internal IPs, localhost)
 *  - Expression control-character stripping
 *  - Name sanitization
 *  - Expression evaluator control-char stripping
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import {
  sanitizePrototypePollution,
  prototypePollutionMiddleware,
  sanitizePolicyId,
  validateWebhookUrl,
  sanitizeExpression,
  sanitizeName,
} from '../../src/lib/sanitization.js';

// ── sanitizePrototypePollution ───────────────────────────────────────────────

describe('sanitizePrototypePollution', () => {

  test('passes through plain objects unchanged', () => {
    const input = { name: 'Alice', age: 30, roles: ['admin'] };
    const result = sanitizePrototypePollution(input);
    assert.deepEqual(result, input);
  });

  test('strips __proto__ key', () => {
    const input = { name: 'Bob', '__proto__': { isAdmin: true } };
    const result = sanitizePrototypePollution(input);
    assert.equal(result.isAdmin, undefined);
    assert.equal(result.name, 'Bob');
  });

  test('strips constructor key', () => {
    const input = { id: 1, 'constructor': { name: 'Evil' } };
    const result = sanitizePrototypePollution(input);
    assert.equal(Object.hasOwn(result, 'constructor'), false, 'constructor should not be an own property');
    assert.equal(result.id, 1);
  });

  test('strips prototype key', () => {
    const input = { data: 'ok', 'prototype': {} };
    const result = sanitizePrototypePollution(input);
    assert.equal(result.prototype, undefined);
    assert.equal(result.data, 'ok');
  });

  test('strips __defineGetter__ key', () => {
    const input = { safe: 'value', '__defineGetter__': () => {} };
    const result = sanitizePrototypePollution(input);
    assert.equal(Object.hasOwn(result, '__defineGetter__'), false, '__defineGetter__ should not be an own property');
    assert.equal(result.safe, 'value');
  });

  test('strips null-byte keys', () => {
    const input = { normal: 'ok' };
    input['bad\0key'] = 'evil';
    const result = sanitizePrototypePollution(input);
    assert.equal(result.normal, 'ok');
    assert.equal(result['bad\0key'], undefined);
  });

  test('recursively strips from nested objects', () => {
    const input = {
      level1: {
        '__proto__': { evil: true },
        level2: {
          'constructor': { exploit: true },
        },
      },
    };
    const result = sanitizePrototypePollution(input);
    assert.equal(result.level1.evil, undefined);
    assert.equal(result.level1.level2.exploit, undefined);
    assert.equal(result.level1.level2.normal, undefined); // still undefined
  });

  test('handles arrays (not traversed as prototype)', () => {
    const input = {
      users: [
        { '__proto__': { x: 1 } },
        { safe: 'ok' },
      ],
    };
    const result = sanitizePrototypePollution(input);
    assert.equal(result.users[0].x, undefined);
    assert.equal(result.users[1].safe, 'ok');
  });

  test('does not mutate the original object', () => {
    const input = { name: 'Carol', '__proto__': { admin: true } };
    const result = sanitizePrototypePollution(input);
    assert.equal(input.name, 'Carol');        // original unchanged
    assert.notEqual(result, input);          // returns new object
    assert.equal(result.name, 'Carol');
  });

  test('returns primitives as-is', () => {
    assert.equal(sanitizePrototypePollution(null), null);
    assert.equal(sanitizePrototypePollution('string'), 'string');
    assert.equal(sanitizePrototypePollution(42), 42);
    assert.equal(sanitizePrototypePollution(true), true);
  });

  test('strips dangerous keys from plain-object returned by __proto__ pollution', () => {
    // Sanity check: after stripping __proto__, the result should not have
    // the injected properties on Object.prototype.
    const input = { '__proto__': { admin: true }, name: 'Dave' };
    const result = sanitizePrototypePollution(input);
    // The result should NOT have admin on its own keys.
    assert.equal(Object.keys(result).includes('admin'), false);
    assert.equal(result.name, 'Dave');
  });

});

// ── prototypePollutionMiddleware ─────────────────────────────────────────────

describe('prototypePollutionMiddleware', () => {

  test('passes request through when no body', (t, done) => {
    const app = express();
    app.use(prototypePollutionMiddleware);
    app.post('/test', (req, res) => res.json({ ok: true }));
    const s = app.listen(0, () => {
      const port = s.address().port;
      http.request({ method: 'POST', hostname: '127.0.0.1', port, path: '/test' }, (res2) => {
        let data = '';
        res2.on('data', (c) => data += c);
        res2.on('end', () => {
          s.close();
          assert.equal(res2.statusCode, 200);
          done();
        });
      }).end();
    });
  });

  test('strips __proto__ from JSON body', (t, done) => {
    const app = express();
    app.use(express.json());
    app.use(prototypePollutionMiddleware);
    app.post('/test', (req, res) => res.json({ hasProto: Object.hasOwn(req.body, '__proto__'), keys: Object.keys(req.body) }));
    const s = app.listen(0, () => {
      const port = s.address().port;
      const body = JSON.stringify({ name: 'test', '__proto__': { admin: true } });
      const req = http.request({
        method: 'POST', hostname: '127.0.0.1', port, path: '/test',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res2) => {
        let data = '';
        res2.on('data', (c) => data += c);
        res2.on('end', () => {
          s.close();
          const json = JSON.parse(data);
          assert.equal(json.hasProto, false, '__proto__ should not be an own property');
          assert.ok(json.keys.includes('name'));
          done();
        });
      });
      req.write(body);
      req.end();
    });
  });

  test('strips constructor from JSON body', (t, done) => {
    const app = express();
    app.use(express.json());
    app.use(prototypePollutionMiddleware);
    app.post('/test', (req, res) => res.json({ hasConstructor: Object.hasOwn(req.body, 'constructor'), keys: Object.keys(req.body) }));
    const s = app.listen(0, () => {
      const port = s.address().port;
      const body = JSON.stringify({ safe: 'ok', 'constructor': { exploit: true } });
      const req = http.request({
        method: 'POST', hostname: '127.0.0.1', port, path: '/test',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res2) => {
        let data = '';
        res2.on('data', (c) => data += c);
        res2.on('end', () => {
          s.close();
          const json = JSON.parse(data);
          assert.equal(json.hasConstructor, false, 'constructor should not be an own property');
          assert.ok(json.keys.includes('safe'));
          done();
        });
      });
      req.write(body);
      req.end();
    });
  });

});

// ── sanitizePolicyId ─────────────────────────────────────────────────────────

describe('sanitizePolicyId', () => {

  test('returns alphanumeric+hyphen IDs unchanged', () => {
    assert.equal(sanitizePolicyId('my-policy'), 'my-policy');
    assert.equal(sanitizePolicyId('POLICY-123'), 'policy-123');
    assert.equal(sanitizePolicyId('a1-b2-c3'), 'a1-b2-c3');
  });

  test('converts spaces to hyphens and lowercases', () => {
    assert.equal(sanitizePolicyId('My Shopping Policy'), 'my-shopping-policy');
    assert.equal(sanitizePolicyId('FOOD DELIVERY'), 'food-delivery');
  });

  test('converts underscores and dots to hyphens', () => {
    assert.equal(sanitizePolicyId('policy_v1'), 'policy-v1');
    assert.equal(sanitizePolicyId('policy.v2'), 'policy-v2');
    assert.equal(sanitizePolicyId('a_b.c-d'), 'a-b-c-d');
  });

  test('strips non-alphanumeric non-hyphen characters', () => {
    assert.equal(sanitizePolicyId('policy!@#$%'), 'policy');
    assert.equal(sanitizePolicyId('(test)'), 'test');
    // apostrophe is replaced with hyphen (it's in the replacement set), consecutive hyphens collapse
    assert.equal(sanitizePolicyId(" O'Malley's"), 'o-malley-s');
  });

  test('collapses consecutive hyphens', () => {
    assert.equal(sanitizePolicyId('a--b---c'), 'a-b-c');
    assert.equal(sanitizePolicyId('  a   b  '), 'a-b');
  });

  test('trims leading/trailing hyphens', () => {
    assert.equal(sanitizePolicyId('-policy-'), 'policy');
    assert.equal(sanitizePolicyId('  policy  '), 'policy');
  });

  test('returns null for empty/whitespace-only input', () => {
    assert.equal(sanitizePolicyId(''), null);
    assert.equal(sanitizePolicyId('   '), null);
    assert.equal(sanitizePolicyId(null), null);
    assert.equal(sanitizePolicyId(undefined), null);
    assert.equal(sanitizePolicyId(123), null);
  });

  test('returns null for IDs over 64 characters', () => {
    const long = 'a'.repeat(65);
    assert.equal(sanitizePolicyId(long), null);
    assert.equal(sanitizePolicyId('a'.repeat(64)), 'a'.repeat(64)); // exactly 64 is OK
  });

});

// ── validateWebhookUrl ────────────────────────────────────────────────────────

describe('validateWebhookUrl', () => {

  test('accepts valid HTTPS URLs', () => {
    assert.equal(validateWebhookUrl('https://example.com/webhook').valid, true);
    assert.equal(validateWebhookUrl('https://api.acme.com/v1/events').valid, true);
    assert.equal(validateWebhookUrl('https://hooks.slack.com/services/abc').valid, true);
  });

  test('accepts localhost HTTP in development', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    assert.equal(validateWebhookUrl('http://localhost:3000/hook').valid, true);
    assert.equal(validateWebhookUrl('http://127.0.0.1:8080/callback').valid, true);
    process.env.NODE_ENV = prev;
  });

  test('rejects localhost HTTP in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const r1 = validateWebhookUrl('http://localhost:3000/hook');
    const r2 = validateWebhookUrl('http://127.0.0.1:8080/callback');
    assert.equal(r1.valid, false);
    assert.equal(r2.valid, false);
    assert.ok(r1.reason.includes('Localhost'));
    process.env.NODE_ENV = prev;
  });

  test('rejects javascript: scheme', () => {
    assert.equal(validateWebhookUrl('javascript:alert(1)').valid, false);
    assert.equal(validateWebhookUrl('JAVASCRIPT:evil()').valid, false);
  });

  test('rejects data: scheme', () => {
    assert.equal(validateWebhookUrl('data:text/html,<script>evil</script>').valid, false);
  });

  test('rejects internal IP ranges', () => {
    assert.equal(validateWebhookUrl('https://10.0.0.1/hook').valid, false);
    assert.equal(validateWebhookUrl('https://192.168.1.1/hook').valid, false);
    assert.equal(validateWebhookUrl('https://172.16.0.1/hook').valid, false);
    assert.equal(validateWebhookUrl('https://127.0.0.1/hook').valid, false);
    assert.equal(validateWebhookUrl('https://169.254.0.1/hook').valid, false);
  });

  test('accepts non-internal public IPs', () => {
    assert.equal(validateWebhookUrl('https://8.8.8.8/hook').valid, true);
    assert.equal(validateWebhookUrl('https://1.1.1.1/hook').valid, true);
  });

  test('rejects non-http/https schemes', () => {
    assert.equal(validateWebhookUrl('ftp://example.com/hook').valid, false);
    assert.equal(validateWebhookUrl('file:///etc/passwd').valid, false);
  });

  test('rejects empty/null input', () => {
    assert.equal(validateWebhookUrl('').valid, false);
    assert.equal(validateWebhookUrl(null).valid, false);
    assert.equal(validateWebhookUrl('   ').valid, false);
  });

});

// ── sanitizeExpression ────────────────────────────────────────────────────────

describe('sanitizeExpression', () => {

  test('passes through clean expressions', () => {
    assert.equal(sanitizeExpression('context.amount > 100'), 'context.amount > 100');
    assert.equal(sanitizeExpression('user.role == "admin"'), 'user.role == "admin"');
  });

  test('strips control characters (0x00-0x1F except tab/newline/cr)', () => {
    const dirty = 'a\x00b\x01c\td\x0e\ne\x0f\nf\rm\x1fg';
    const clean = sanitizeExpression(dirty);
    // Control chars are removed entirely (not replaced with spaces).
    // Tab, LF, CR are preserved; others removed.
    assert.equal(clean, 'abc\td\ne\nf\rmg');
    assert.equal(clean.includes('\x00'), false);
    assert.equal(clean.includes('\x1f'), false);
  });

  test('strips DEL character (0x7F)', () => {
    assert.equal(sanitizeExpression('hello\x7fworld'), 'helloworld');
  });

  test('limits to maxLength (default 1000)', () => {
    const long = 'a'.repeat(1500);
    const result = sanitizeExpression(long);
    assert.equal(result.length, 1000);
    assert.equal(sanitizeExpression(long, 500).length, 500);
  });

  test('returns null for null/undefined/non-string', () => {
    assert.equal(sanitizeExpression(null), null);
    assert.equal(sanitizeExpression(undefined), null);
    assert.equal(sanitizeExpression(42), null);
    assert.equal(sanitizeExpression({}), null);
  });

  test('returns null when stripping leaves empty string', () => {
    assert.equal(sanitizeExpression('\x00\x01\x02'), null);
    assert.equal(sanitizeExpression('   '), null);
  });

  test('preserves Unicode letters and punctuation', () => {
    assert.equal(sanitizeExpression('role == "admin" 日本語'), 'role == "admin" 日本語');
  });

});

// ── sanitizeName ─────────────────────────────────────────────────────────────

describe('sanitizeName', () => {

  test('passes through printable ASCII', () => {
    assert.equal(sanitizeName('Alice Manager'), 'Alice Manager');
    assert.equal(sanitizeName('Policy #1 (v2)'), 'Policy #1 (v2)');
  });

  test('strips control characters', () => {
    assert.equal(sanitizeName('Alice\x00Bob'), 'AliceBob');
    assert.equal(sanitizeName('Hello\x07World'), 'HelloWorld');
  });

  test('preserves Unicode (including emoji)', () => {
    assert.equal(sanitizeName('日本語'), '日本語');
    assert.equal(sanitizeName('नमस्ते'), 'नमस्ते');
  });

  test('trims and limits to 128 chars', () => {
    assert.equal(sanitizeName('  hello  '), 'hello');
    assert.equal(sanitizeName('a'.repeat(200)).length, 128);
  });

  test('returns null for null/undefined/non-string', () => {
    assert.equal(sanitizeName(null), null);
    assert.equal(sanitizeName(42), null);
    assert.equal(sanitizeName(''), null);
  });

});
