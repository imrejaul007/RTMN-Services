/**
 * @hojai/ai-spec — public API.
 *
 * The AI-native spec for HOJAI projects. Every HOJAI project carries:
 *
 *   1. hojai.ai.md             — markdown AI coding tools read first
 *   2. .hojai/manifest.json    — machine-readable project schema
 *   3. .hojai/capability.json  — Nexha federation profile
 *
 * @example
 * ```ts
 * import { generateAndWrite, writeProjectContext, readProjectContext } from '@hojai/ai-spec';
 *
 * // Auto-detect from package.json
 * const { manifest, capability } = await generateAndWrite('/path/to/project');
 *
 * // Or write explicitly
 * await writeProjectContext('/path/to/project', manifest, capability);
 *
 * // Read back
 * const ctx = await readProjectContext('/path/to/project');
 * ```
 */

export * from './types.js';
export * from './manifest.js';
export * from './capability.js';
export * from './templates.js';
export * from './writer.js';
export * from './introspect.js';
export * from './validators.js';
