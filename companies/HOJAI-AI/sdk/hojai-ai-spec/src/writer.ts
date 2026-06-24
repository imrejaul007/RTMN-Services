/**
 * High-level writer — writes the 3 files that make up a HOJAI project's
 * AI context: hojai.ai.md, .hojai/manifest.json, .hojai/capability.json
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { writeManifest } from './manifest.js';
import { writeCapability } from './capability.js';
import { renderFor } from './templates.js';
import type { Manifest, Capability, ProjectContext } from './types.js';

const AI_MD_FILENAME = 'hojai.ai.md';
const HOJAI_DIR = '.hojai';
const MANIFEST_PATH = path.join(HOJAI_DIR, 'manifest.json');
const CAPABILITY_PATH = path.join(HOJAI_DIR, 'capability.json');

export interface WriteResult {
  aiMdPath: string;
  manifestPath: string;
  capabilityPath: string;
}

/**
 * Write all three files. Returns the absolute paths of the written files.
 * Idempotent — safe to call multiple times.
 */
export async function writeProjectContext(
  projectDir: string,
  manifest: Manifest,
  capability: Capability
): Promise<WriteResult> {
  // 1. Render the markdown
  const markdown = renderFor({ manifest, capability });

  // 2. Write hojai.ai.md
  const aiMdPath = path.join(projectDir, AI_MD_FILENAME);
  await fs.writeFile(aiMdPath, markdown);

  // 3. Write .hojai/manifest.json
  const manifestPath = await writeManifest(projectDir, manifest);

  // 4. Write .hojai/capability.json
  const capabilityPath = await writeCapability(projectDir, capability);

  return { aiMdPath, manifestPath, capabilityPath };
}

/**
 * Read all three files from a project. Throws if any is missing.
 */
export async function readProjectContext(projectDir: string): Promise<ProjectContext> {
  const aiMdPath = path.join(projectDir, AI_MD_FILENAME);
  const manifestPath = path.join(projectDir, MANIFEST_PATH);
  const capabilityPath = path.join(projectDir, CAPABILITY_PATH);

  const [manifest, capability] = await Promise.all([
    import('./manifest.js').then(m => m.readManifest(projectDir)),
    import('./capability.js').then(m => m.readCapability(projectDir))
  ]);

  return { manifest, capability, aiMdPath };
}

/** Check whether a directory is already a HOJAI project. */
export async function isHojaiProject(projectDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir, MANIFEST_PATH));
    return true;
  } catch {
    return false;
  }
}
