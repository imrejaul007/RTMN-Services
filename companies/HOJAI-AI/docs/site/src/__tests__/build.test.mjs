/**
 * Tests for the docs site generator.
 *
 * Verifies:
 *   - build script runs without error
 *   - output has the expected pages
 *   - per-SDK pages exist for all @hojai/* SDKs
 *   - manifest.json is valid JSON with all SDKs
 *   - sidebar in every page lists all SDKs
 *   - internal anchors (e.g. /sdks/foo.html) are consistent
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SITE_DIR = join(__dirname, '..', '..');
const PUBLIC_DIR = join(SITE_DIR, 'public');
// docs/site/src/__tests__ -> docs/site -> docs -> companies/HOJAI-AI
const HOJAI_AI_ROOT = join(SITE_DIR, '..', '..');
const SDK_DIR = join(HOJAI_AI_ROOT, 'sdk');

function runBuild() {
  execSync('node src/build.mjs', { cwd: SITE_DIR, stdio: 'pipe' });
}

test('build script runs without error', () => {
  assert.doesNotThrow(runBuild);
});

test('output dir contains the 4 core pages + assets + sdks/', () => {
  runBuild();
  for (const f of ['index.html', 'quickstart.html', 'cli.html', 'ai-native.html', 'manifest.json', 'assets/style.css', 'sdks']) {
    const p = join(PUBLIC_DIR, f);
    assert.ok(existsSync(p), `expected ${p} to exist`);
  }
});

test('per-SDK page exists for every @hojai/* package with CLAUDE.md or README.md', () => {
  runBuild();
  // Find all @hojai/* dirs that have CLAUDE.md or README.md
  const expectedSdks = readdirSync(SDK_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('hojai-'))
    .filter(d => existsSync(join(SDK_DIR, d.name, 'CLAUDE.md')) || existsSync(join(SDK_DIR, d.name, 'README.md')))
    .map(d => d.name.replace(/^hojai-/, ''));

  // Every expected SDK should have a generated page
  for (const shortName of expectedSdks) {
    const p = join(PUBLIC_DIR, 'sdks', `${shortName}.html`);
    assert.ok(existsSync(p), `expected SDK page for ${shortName} at ${p}`);
  }

  // Total SDK pages should match
  const generatedSdks = readdirSync(join(PUBLIC_DIR, 'sdks')).filter(f => f.endsWith('.html'));
  assert.equal(generatedSdks.length, expectedSdks.length, 'SDK page count mismatch');
});

test('manifest.json is valid JSON with all SDKs', () => {
  runBuild();
  const manifest = JSON.parse(readFileSync(join(PUBLIC_DIR, 'manifest.json'), 'utf-8'));
  assert.ok(manifest.generatedAt);
  assert.ok(manifest.sdkCount > 0);
  assert.equal(manifest.sdks.length, manifest.sdkCount);
  for (const sdk of manifest.sdks) {
    assert.ok(sdk.name.startsWith('@hojai/'), `SDK name should start with @hojai/: ${sdk.name}`);
    assert.ok(sdk.docsUrl, `SDK should have docsUrl: ${sdk.name}`);
    assert.ok(sdk.docsUrl.startsWith('/sdks/'), `docsUrl should be relative: ${sdk.docsUrl}`);
  }
});

test('homepage includes the 4 core navigation links', () => {
  runBuild();
  const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf-8');
  for (const url of ['/quickstart.html', '/cli.html', '/ai-native.html', '/sdks/foundation.html']) {
    assert.ok(html.includes(`href="${url}"`), `homepage should link to ${url}`);
  }
});

test('homepage sidebar lists every discovered SDK', () => {
  runBuild();
  const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf-8');
  const manifest = JSON.parse(readFileSync(join(PUBLIC_DIR, 'manifest.json'), 'utf-8'));
  for (const sdk of manifest.sdks) {
    // sidebar links use just the shortname (without @hojai/ prefix)
    const shortName = sdk.name.replace(/^@hojai\//, '');
    assert.ok(html.includes(`href="/sdks/${shortName}.html"`), `homepage should link to ${sdk.name}`);
  }
});

test('every SDK page has a working next-link back to homepage', () => {
  runBuild();
  const sdkFiles = readdirSync(join(PUBLIC_DIR, 'sdks')).filter(f => f.endsWith('.html'));
  for (const f of sdkFiles) {
    const html = readFileSync(join(PUBLIC_DIR, 'sdks', f), 'utf-8');
    assert.ok(html.includes('href="/"') || html.includes('href="/index.html"'),
      `SDK page ${f} should link back to homepage`);
  }
});

test('every SDK page mentions the SDK name in the H1', () => {
  runBuild();
  const sdkFiles = readdirSync(join(PUBLIC_DIR, 'sdks')).filter(f => f.endsWith('.html'));
  for (const f of sdkFiles) {
    const html = readFileSync(join(PUBLIC_DIR, 'sdks', f), 'utf-8');
    const shortName = f.replace('.html', '');
    // The H1 should be "@hojai/<name>" (in escaped form)
    assert.ok(html.includes(`@hojai/${shortName}`), `${f} should have H1 with @hojai/${shortName}`);
  }
});

test('public dir is reasonable size (< 2 MB)', () => {
  runBuild();
  // Quick total size check
  const sizeOfDir = (dir) => {
    let total = 0;
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) total += sizeOfDir(p);
      else total += statSync(p).size;
    }
    return total;
  };
  const total = sizeOfDir(PUBLIC_DIR);
  assert.ok(total < 2_000_000, `docs site should be < 2 MB, got ${(total/1024).toFixed(0)} KB`);
});
