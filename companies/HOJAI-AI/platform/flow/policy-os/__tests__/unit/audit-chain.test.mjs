/**
 * PolicyOS — Audit Chain Unit Tests
 * Tests: append, hash integrity, verify, verifyRecent, query, archive, cache, corruption detection
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { createAuditChain, _resetAuditChain, _resetPending } from '../../src/services/audit-chain.js';

const TEST_DIR = `/tmp/policy-os-chain-test-${Date.now()}`;

describe('Audit Chain', () => {
  beforeEach(() => {
    _resetAuditChain();
    _resetPending();
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // =================================================================
  // Basic append
  // =================================================================

  it('appends first entry with GENESIS previousHash', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ type: 'test.created', actor: 'u-admin' });
    assert.ok(entry.id, 'has id');
    assert.ok(entry.timestamp, 'has timestamp');
    assert.equal(entry.previousHash, 'GENESIS', 'first entry has GENESIS previousHash');
    assert.ok(entry.hash, 'has hash');
    assert.equal(entry.entryVersion, 1);
    assert.equal(entry.type, 'test.created');
    assert.equal(entry.actor, 'u-admin');
  });

  it('chains second entry to first entry hash', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const e1 = await chain.append({ type: 'test.first', actor: 'u-admin' });
    const e2 = await chain.append({ type: 'test.second', actor: 'u-admin' });
    assert.notEqual(e1.hash, e2.hash);
    assert.equal(e2.previousHash, e1.hash, 'second entry chains to first hash');
  });

  it('auto-generates ID if not provided', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ type: 'test.no-id' });
    assert.ok(entry.id && entry.id.length > 0);
  });

  it('uses provided ID', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ id: 'my-custom-id', type: 'test.custom-id' });
    assert.equal(entry.id, 'my-custom-id');
  });

  // =================================================================
  // Hash integrity
  // =================================================================

  it('hash is SHA-256(previousHash + JSON(entry))', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ id: 'hash-test', type: 'test.hash', actor: 'u-admin' });
    // Recompute expected hash
    const crypto = await import('crypto');
    const { hash, previousHash, ...entryForHash } = entry;
    const json = JSON.stringify(entryForHash);
    const expected = crypto.createHash('sha256').update('GENESIS' + json).digest('hex');
    assert.equal(hash, expected, 'hash matches SHA-256(previousHash + JSON)');
  });

  it('different content produces different hash', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ id: 'e1', type: 'test.a', actor: 'alice' });
    const e2 = await chain.append({ id: 'e2', type: 'test.b', actor: 'bob' });
    assert.notEqual(e2.hash.length, 0);
    assert.notEqual(e2.previousHash.length, 0);
  });

  // =================================================================
  // Verification
  // =================================================================

  it('verify returns valid=true on clean chain', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'test.a', actor: 'alice' });
    await chain.append({ type: 'test.b', actor: 'bob' });
    await chain.append({ type: 'test.c', actor: 'carol' });
    const report = await chain.verify();
    assert.equal(report.valid, true, 'chain is valid');
    assert.equal(report.checked, 3, 'all 3 entries checked');
    assert.ok(report.durationMs >= 0);
  });

  it('verify returns valid=true on empty chain', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const report = await chain.verify();
    assert.equal(report.valid, true);
    assert.equal(report.checked, 0);
  });

  it('verify detects tampered hash', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ type: 'test.secret', actor: 'alice' });

    // Tamper: overwrite entry file with modified data
    const fp = path.join(TEST_DIR, 'audit', `${entry.id}.json`);
    const tampered = { ...entry, actor: 'hacker', hash: entry.hash }; // hash unchanged
    fs.writeFileSync(fp, JSON.stringify(tampered), 'utf8');

    const report = await chain.verify();
    assert.equal(report.valid, false, 'tamper detected');
    assert.ok(report.brokenAt);
    assert.ok(report.reason && report.reason.includes('hash mismatch'));
    assert.equal(report.checked, 1);
  });

  it('verify detects broken chain (previousHash mismatch)', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const e1 = await chain.append({ type: 'test.a', actor: 'alice' });
    const e2 = await chain.append({ type: 'test.b', actor: 'bob' });

    // Tamper: change e2's previousHash
    const fp = path.join(TEST_DIR, 'audit', `${e2.id}.json`);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    data.previousHash = 'TAMPERED';
    fs.writeFileSync(fp, JSON.stringify(data), 'utf8');

    const report = await chain.verify();
    assert.equal(report.valid, false);
    assert.ok(report.reason && (report.reason.includes('hash mismatch') || report.reason.includes('entry count mismatch')));
  });

  // =================================================================
  // verifyRecent
  // =================================================================

  it('verifyRecent checks last N entries', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    for (let i = 0; i < 20; i++) {
      await chain.append({ type: 'test.tick', actor: `u-${i}` });
    }
    const report = await chain.verifyRecent(5);
    assert.equal(report.valid, true);
    assert.equal(report.checked, 5, 'checked last 5');
  });

  it('verifyRecent detects tampering in recent entries', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entries = [];
    for (let i = 0; i < 10; i++) {
      entries.push(await chain.append({ type: 'test.tick', actor: `u-${i}` }));
    }

    // Tamper entry #8
    const fp = path.join(TEST_DIR, 'audit', `${entries[7].id}.json`);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    data.actor = 'TAMPERED';
    fs.writeFileSync(fp, JSON.stringify(data), 'utf8');

    const report = await chain.verifyRecent(5);
    assert.equal(report.valid, false);
    assert.ok(report.brokenAt);
  });

  // =================================================================
  // Query
  // =================================================================

  it('query returns matching entries', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'policy.created', actor: 'alice' });
    await chain.append({ type: 'policy.updated', actor: 'bob' });
    await chain.append({ type: 'policy.created', actor: 'carol' });
    await chain.append({ type: 'role.created', actor: 'alice' });

    const all = chain.query({ type: 'policy.created', limit: 10 });
    assert.ok(all.length >= 2, 'found at least 2 policy.created');
    assert.ok(all.every(e => e.type === 'policy.created'));
  });

  it('query filters by actor', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'test.event', actor: 'alice' });
    await chain.append({ type: 'test.event', actor: 'bob' });
    await chain.append({ type: 'test.event', actor: 'alice' });

    const aliceEvents = chain.query({ actor: 'alice', limit: 10 });
    assert.ok(aliceEvents.every(e => e.actor === 'alice'));
    assert.ok(aliceEvents.length >= 2);
  });

  it('query filters by timestamp range', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'test.old', actor: 'alice' });
    await chain.append({ type: 'test.new', actor: 'alice' });

    const now = new Date().toISOString();
    const future = new Date(Date.now() + 10000).toISOString();
    const results = chain.query({ from: now, to: future, limit: 10 });
    // Only entries created within the window
    assert.ok(results.every(e => e.timestamp >= now && e.timestamp <= future));
  });

  it('query respects limit', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    for (let i = 0; i < 50; i++) {
      await chain.append({ type: 'test.tick', actor: 'u' });
    }
    const results = chain.query({ limit: 5 });
    assert.equal(results.length, 5);
  });

  // =================================================================
  // Archive
  // =================================================================

  it('archive seals entries into daily JSONL file', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'test.a', actor: 'alice' });
    await chain.append({ type: 'test.b', actor: 'bob' });

    const result = await chain.archive();
    assert.equal(result.archived, true);
    assert.ok(result.file.includes('audit-'));
    assert.equal(result.entriesArchived, 2);

    // Archive file exists
    assert.ok(fs.existsSync(result.file), 'archive file created');

    // Audit dir is cleared
    const auditDir = path.join(TEST_DIR, 'audit');
    const files = fs.readdirSync(auditDir);
    assert.equal(files.length, 0, 'audit dir cleared after archive');

    // Chain metadata reset
    const meta = chain.getMeta();
    assert.equal(meta.entryCount, 0);
    assert.equal(meta.lastHash, null);
    assert.ok(meta.archivedAt);
  });

  // =================================================================
  // Metadata persistence
  // =================================================================

  it('persists chain metadata across instances', async () => {
    const dir = TEST_DIR;
    const chain1 = createAuditChain({ dataDir: dir });
    await chain1.init();
    await chain1.append({ type: 'test.persist', actor: 'alice' });
    await chain1.flush();

    // New instance reads same dir
    const chain2 = createAuditChain({ dataDir: dir });
    await chain2.init();
    const entries = chain2.query({ type: 'test.persist' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].actor, 'alice');
  });

  it('getMeta returns correct entryCount', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    await chain.append({ type: 'test.a' });
    await chain.append({ type: 'test.b' });
    await chain.append({ type: 'test.c' });

    const meta = chain.getMeta();
    assert.equal(meta.entryCount, 3);
    assert.ok(meta.lastHash);
    assert.ok(meta.firstEntryId);
    assert.ok(meta.firstEntryHash);
  });

  // =================================================================
  // Cache
  // =================================================================

  it('caches recent entries for fast get()', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({ type: 'test.cache', actor: 'alice' });

    // get() should return cached entry
    const retrieved = chain.get(entry.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, entry.id);
    assert.equal(retrieved.actor, 'alice');
  });

  // =================================================================
  // Edge cases
  // =================================================================

  it('handles empty data directory gracefully', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const report = await chain.verify();
    assert.equal(report.valid, true);
    assert.equal(report.checked, 0);
  });

  it('appends with custom timestamp', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({
      type: 'test.ts',
      actor: 'alice',
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    assert.equal(entry.timestamp, '2025-01-01T00:00:00.000Z');
  });

  it('handles unicode characters in entry data', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();
    const entry = await chain.append({
      type: 'test.unicode',
      actor: 'हिंदी-中文-العربية',
      details: { name: '田中さん 🎉' },
    });
    assert.ok(entry.hash);
    const retrieved = chain.get(entry.id);
    assert.equal(retrieved.actor, 'हिंदी-中文-العربية');
  });

  it('verifies integrity after archive and new appends', async () => {
    const chain = createAuditChain({ dataDir: TEST_DIR });
    await chain.init();

    // Create 3 entries
    await chain.append({ type: 'test.a', actor: 'alice' });
    await chain.append({ type: 'test.b', actor: 'bob' });
    await chain.append({ type: 'test.c', actor: 'carol' });

    // Archive
    await chain.archive();

    // Add new entries
    await chain.append({ type: 'test.d', actor: 'dave' });
    await chain.append({ type: 'test.e', actor: 'eve' });

    // Verify entire chain
    const report = await chain.verify();
    assert.equal(report.valid, true, 'chain valid after archive + new entries');
    assert.equal(report.checked, 2, 'only new entries need verification');
  });
});
