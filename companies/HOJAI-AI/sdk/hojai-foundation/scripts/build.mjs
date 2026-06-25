/**
 * Build script for @hojai/foundation
 * Uses esbuild to generate ESM + CJS bundles cleanly,
 * avoiding the dual-tsconfig collision problem.
 */

import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// ESM bundle (dist/index.js)
// ---------------------------------------------------------------------------

await esbuild.build({
  entryPoints: [join(ROOT, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: join(ROOT, 'dist/index.js'),
  external: [],
  splitting: false,
  sourcemap: true,
  logLevel: 'info',
});

// ---------------------------------------------------------------------------
// Individual ESM modules (for subpath exports)
// ---------------------------------------------------------------------------

const modules = ['corp-id', 'memory', 'twin', 'trust', 'flow', 'policy', 'config', 'utils'];
for (const mod of modules) {
  await esbuild.build({
    entryPoints: [join(ROOT, `src/${mod}.ts`)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    outfile: join(ROOT, `dist/${mod}.js`),
    external: [],
    splitting: false,
    sourcemap: true,
    logLevel: 'info',
  });
}

// ---------------------------------------------------------------------------
// CJS bundle (dist/index.cjs)
// ---------------------------------------------------------------------------

await esbuild.build({
  entryPoints: [join(ROOT, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: join(ROOT, 'dist/index.cjs'),
  external: [],
  splitting: false,
  sourcemap: true,
  logLevel: 'info',
});

// ---------------------------------------------------------------------------
// Test bundle (dist/__tests__/index.test.js)
// ---------------------------------------------------------------------------

ensureDir(join(ROOT, 'dist/__tests__'));
await esbuild.build({
  entryPoints: [join(ROOT, 'src/__tests__/index.test.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: join(ROOT, 'dist/__tests__/index.test.js'),
  external: [],
  splitting: false,
  sourcemap: true,
  logLevel: 'info',
});

console.log('✅ Build complete');
