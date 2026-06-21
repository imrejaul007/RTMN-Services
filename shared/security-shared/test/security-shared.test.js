/**
 * Basic test for @rtmn/security-shared. Run with:
 *   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
 *   SECRETS_PEPPER=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
 *   AUDIT_LOG_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
 *   INTERNAL_SERVICE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
 *   node --test test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Set up required env vars BEFORE importing the module
const SECRETS = {
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  SECRETS_PEPPER: crypto.randomBytes(32).toString('hex'),
  AUDIT_LOG_SECRET: crypto.randomBytes(32).toString('hex'),
  INTERNAL_SERVICE_TOKEN: crypto.randomBytes(32).toString('hex'),
};
for (const [k, v] of Object.entries(SECRETS)) {
  process.env[k] = v;
}

const {
  sign, verify, tryVerify, decode,
  hashPassword, verifyPassword, validatePasswordStrength,
  generateApiKey, verifyApiKey,
  mintOAuthState, verifyOAuthState,
  timingSafeEqual, sha256, hmacSha256, encrypt, decrypt,
  AuditLog, createAuditLog,
  validateProductionEnv, validateDevEnv,
} = await import('../index.js');

// ----- Crypto utils -----
test('timingSafeEqual returns true for equal strings', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
});

test('timingSafeEqual returns false for different strings', () => {
  assert.equal(timingSafeEqual('abc', 'abd'), false);
});

test('timingSafeEqual returns false for different lengths', () => {
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
});

test('sha256 produces 64-char hex', () => {
  const h = sha256('hello');
  assert.equal(h.length, 64);
  assert.equal(h, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('hmacSha256 requires pepper', () => {
  assert.throws(() => hmacSha256('x', null));
});

test('encrypt/decrypt round-trips', () => {
  const key = crypto.randomBytes(32);
  const plaintext = 'super-secret-thing';
  const ct = encrypt(plaintext, key);
  assert.notEqual(ct, plaintext);
  const pt = decrypt(ct, key);
  assert.equal(pt, plaintext);
});

test('decrypt throws on wrong key', () => {
  const key1 = crypto.randomBytes(32);
  const key2 = crypto.randomBytes(32);
  const ct = encrypt('secret', key1);
  assert.throws(() => decrypt(ct, key2));
});

// ----- JWT -----
test('sign and verify round-trip', () => {
  const token = sign({ sub: 'user-1', role: 'user' });
  const decoded = verify(token);
  assert.equal(decoded.sub, 'user-1');
  assert.equal(decoded.role, 'user');
});

test('verify throws on alg=none', () => {
  // Forge a token with alg=none
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'attacker', role: 'admin' })).toString('base64url');
  const forged = `${header}.${payload}.`;
  assert.throws(() => verify(forged));
});

test('verify throws on bad signature', () => {
  const token = sign({ sub: 'user-1' });
  const parts = token.split('.');
  parts[2] = 'invalidsignature';
  const tampered = parts.join('.');
  assert.throws(() => verify(tampered));
});

test('verify throws on expired token', () => {
  const token = sign({ sub: 'user-1' }, { expiresIn: '-1s' });
  assert.throws(() => verify(token));
});

test('tryVerify returns null on bad token', () => {
  const result = tryVerify('not-a-jwt');
  assert.equal(result, null);
});

test('verify rejects token with wrong issuer', () => {
  const token = sign({ sub: 'user-1' }, { issuer: 'evil-issuer' });
  assert.throws(() => verify(token));
});

// ----- Password -----
test('hashPassword + verifyPassword round-trip', async () => {
  const hash = await hashPassword('MySecurePassword123');
  assert.equal(await verifyPassword('MySecurePassword123', hash), true);
  assert.equal(await verifyPassword('WrongPassword', hash), false);
});

test('validatePasswordStrength rejects short passwords', () => {
  assert.match(validatePasswordStrength('short'), /at least 12/);
  assert.match(validatePasswordStrength('verylongpasswordnondigit'), /number/);
  assert.match(validatePasswordStrength('123456789012'), /letter/);
  assert.equal(validatePasswordStrength('ValidPass12345'), null);
});

// ----- API keys -----
test('generateApiKey produces unique fingerprints', () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.notEqual(a.plaintext, b.plaintext);
  assert.notEqual(a.fingerprint, b.fingerprint);
  assert(a.plaintext.startsWith('rtk_'));
  assert.equal(verifyApiKey(a.plaintext, a.fingerprint), true);
  assert.equal(verifyApiKey(b.plaintext, a.fingerprint), false);
});

// ----- OAuth state -----
test('OAuth state round-trip', () => {
  const state = mintOAuthState({ provider: 'google', redirect: '/cb' });
  const parsed = verifyOAuthState(state);
  assert.equal(parsed.provider, 'google');
  assert.equal(parsed.redirect, '/cb');
  assert(parsed.nonce);
});

test('OAuth state rejects tampered payload', () => {
  const state = mintOAuthState({ provider: 'google' });
  const [p] = state.split('.');
  // Flip a bit in the payload
  const tampered = `${Buffer.from('{"provider":"evil"}').toString('base64url')}.${state.split('.')[1]}`;
  assert.throws(() => verifyOAuthState(tampered));
});

test('OAuth state rejects expired', async () => {
  const state = mintOAuthState({ provider: 'google' });
  // Wait a tiny bit so Date.now() - iat is > 0
  await new Promise(r => setTimeout(r, 5));
  // maxAge = 0 means always expired (any positive time diff)
  assert.throws(() => verifyOAuthState(state, 0));
});

// ----- Audit log -----
test('AuditLog appends and verifies', () => {
  const log = new AuditLog({ secret: process.env.AUDIT_LOG_SECRET });
  log.append({ type: 'auth.login', actorId: 'user-1' });
  log.append({ type: 'auth.logout', actorId: 'user-1' });
  log.append({ type: 'data.update', actorId: 'user-2', targetType: 'profile', targetId: 'p-1' });
  assert.equal(log.size(), 3);
  assert.equal(log.verifyChain(), -1);  // intact
});

test('AuditLog detects tampering', () => {
  const log = new AuditLog({ secret: process.env.AUDIT_LOG_SECRET });
  log.append({ type: 'auth.login', actorId: 'user-1' });
  log.append({ type: 'data.read', actorId: 'user-1' });
  // Tamper with the first event
  log._events[0].type = 'auth.logout';
  // The chain hash on the first event was computed with type='auth.login'
  // so re-verifying will catch it
  const tamperedAt = log.verifyChain();
  assert.notEqual(tamperedAt, -1);
});

test('AuditLog rejects event without type', () => {
  const log = new AuditLog({ secret: process.env.AUDIT_LOG_SECRET });
  assert.throws(() => log.append({ actorId: 'x' }));
});

test('AuditLog list filters', () => {
  const log = new AuditLog({ secret: process.env.AUDIT_LOG_SECRET });
  log.append({ type: 'auth.login', actorId: 'user-1' });
  log.append({ type: 'auth.logout', actorId: 'user-1' });
  log.append({ type: 'auth.login', actorId: 'user-2' });
  const logins = log.list({ type: 'auth.login' });
  assert.equal(logins.length, 2);
  const u1 = log.list({ actorId: 'user-1' });
  assert.equal(u1.length, 2);
});

test('AuditLog prune keeps recent events', async () => {
  const log = new AuditLog({ secret: process.env.AUDIT_LOG_SECRET, retentionMs: 50 });
  log.append({ type: 'old', actorId: 'u' });
  // Wait > retentionMs
  await new Promise(r => setTimeout(r, 60));
  log.append({ type: 'new', actorId: 'u' });
  const pruned = log.prune();
  assert.equal(pruned, 1);
  assert.equal(log.size(), 1);
  assert.equal(log._events[0].type, 'new');
  assert.equal(log.verifyChain(), -1);  // chain still valid after prune
});

// ----- Startup validation -----
test('validateDevEnv passes with env vars set', () => {
  // Should not throw
  validateDevEnv();
});

test('validateProductionEnv throws on missing JWT_SECRET', () => {
  const old = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    assert.throws(() => validateProductionEnv({ isProduction: true }), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = old;
  }
});

test('validateProductionEnv throws on short JWT_SECRET', () => {
  const old = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'tooshort';
  try {
    assert.throws(() => validateProductionEnv({ isProduction: true }), /too short/);
  } finally {
    process.env.JWT_SECRET = old;
  }
});

console.log('All tests defined. Run with: node --test test/');
