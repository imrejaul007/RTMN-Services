/**
 * Manifest operations — read, write, validate.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ManifestSchema, type Manifest } from './types.js';

const MANIFEST_RELATIVE_PATH = '.hojai/manifest.json';

export async function readManifest(projectDir: string): Promise<Manifest> {
  const file = path.join(projectDir, MANIFEST_RELATIVE_PATH);
  const raw = await fs.readFile(file, 'utf-8');
  return parseManifest(raw);
}

export async function writeManifest(projectDir: string, manifest: Manifest): Promise<string> {
  const file = path.join(projectDir, MANIFEST_RELATIVE_PATH);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + '\n');
  return file;
}

export function parseManifest(raw: string): Manifest {
  const json = JSON.parse(raw);
  return validateManifest(json);
}

export function validateManifest(data: unknown): Manifest {
  return ManifestSchema.parse(data);
}

export function tryParseManifest(raw: string): { ok: true; manifest: Manifest } | { ok: false; error: string } {
  try {
    const json = JSON.parse(raw);
    return { ok: true, manifest: validateManifest(json) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
