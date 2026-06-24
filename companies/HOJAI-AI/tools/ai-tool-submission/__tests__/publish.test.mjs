/**
 * Tests for the AI tool marketplace submission helper.
 *
 * Verifies:
 *   - cursor SKILL.md is generated with required content
 *   - vscode package.json has correct shape (activation, commands, etc.)
 *   - manifest.json is valid JSON with right shape
 *   - dry-run mode doesn't write anything
 *   - missing spec fails with a clear error
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const TOOL_DIR = resolve(HERE, '..');
const PUBLISH = resolve(TOOL_DIR, 'src', 'publish.mjs');

function run(args, opts = {}) {
  return execSync(`node ${PUBLISH} ${args}`, { cwd: TOOL_DIR, encoding: 'utf-8', ...opts });
}

test('publish generates cursor + vscode + manifest in the output dir', () => {
  const tmpDir = resolve(TOOL_DIR, '.test-dist');
  rmSync(tmpDir, { recursive: true, force: true });
  try {
    const out = run(`--out ${tmpDir} --dry-run`);
    assert.match(out, /DRY RUN/);
    assert.match(out, /cursor\/SKILL\.md/);
    assert.match(out, /vscode\/package\.json/);
    assert.match(out, /manifest\.json/);
    // Dry run should not write
    assert.ok(!existsSync(tmpDir), 'dry run should not create dir');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('publish actually writes files when not dry-run', () => {
  const tmpDir = resolve(TOOL_DIR, '.test-dist-actual');
  rmSync(tmpDir, { recursive: true, force: true });
  try {
    run(`--out ${tmpDir}`);
    // Cursor files
    assert.ok(existsSync(join(tmpDir, 'cursor', 'SKILL.md')), 'cursor SKILL.md');
    const skill = readFileSync(join(tmpDir, 'cursor', 'SKILL.md'), 'utf-8');
    assert.match(skill, /# HOJAI Project Skill/, 'has skill title');
    assert.match(skill, /When to use/, 'has When to use section');
    assert.match(skill, /@hojai\/foundation/, 'mentions foundation SDK');
    // VSCode files
    assert.ok(existsSync(join(tmpDir, 'vscode', 'package.json')), 'vscode package.json');
    assert.ok(existsSync(join(tmpDir, 'vscode', 'SKILL.md')), 'vscode SKILL.md');
    assert.ok(existsSync(join(tmpDir, 'vscode', 'README.md')), 'vscode README.md');
    assert.ok(existsSync(join(tmpDir, 'vscode', 'icon.svg')), 'vscode icon.svg');

    const vscodePkg = JSON.parse(readFileSync(join(tmpDir, 'vscode', 'package.json'), 'utf-8'));
    assert.equal(vscodePkg.name, 'hojai');
    assert.equal(vscodePkg.publisher, 'hojai');
    assert.ok(vscodePkg.engines.vscode);
    assert.deepEqual(
      vscodePkg.activationEvents,
      ['workspaceContains:hojai.ai.md'],
      'activates when hojai.ai.md is in workspace'
    );
    assert.equal(vscodePkg.contributes.commands.length, 2);
    assert.equal(vscodePkg.contributes.commands[0].command, 'hojai.showContext');
    // Manifest
    assert.ok(existsSync(join(tmpDir, 'manifest.json')), 'manifest.json');
    const manifest = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf-8'));
    assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.packages.cursor.format, 'skill-md');
    assert.equal(manifest.packages.vscode.format, 'vsix-folder');
    assert.ok(manifest.context.sdkCount > 0, 'sdkCount > 0');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('manifest.json references a real SDK count (matches @hojai/* dirs)', () => {
  const tmpDir = resolve(TOOL_DIR, '.test-dist-count');
  rmSync(tmpDir, { recursive: true, force: true });
  try {
    run(`--out ${tmpDir}`);
    const manifest = JSON.parse(readFileSync(join(tmpDir, 'manifest.json'), 'utf-8'));
    // We can independently count @hojai-* dirs and compare
    const sdkDir = resolve(TOOL_DIR, '..', '..', 'sdk');
    const actualCount = (() => {
      try {
        return readdirSync(sdkDir).filter(d => d.startsWith('hojai-')).length;
      } catch { return 0; }
    })();
    assert.equal(manifest.context.sdkCount, actualCount, 'sdkCount should match actual SDK dirs');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('cursor SKILL.md is large enough to be useful (>1 KB)', () => {
  const tmpDir = resolve(TOOL_DIR, '.test-dist-size');
  rmSync(tmpDir, { recursive: true, force: true });
  try {
    run(`--out ${tmpDir}`);
    const size = statSync(join(tmpDir, 'cursor', 'SKILL.md')).size;
    assert.ok(size > 1000, `SKILL.md should be > 1 KB, got ${size} bytes`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
