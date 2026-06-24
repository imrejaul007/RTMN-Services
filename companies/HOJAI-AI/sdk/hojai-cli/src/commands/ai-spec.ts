/**
 * `hojai ai-spec` — generate, read, validate the AI-native spec for a HOJAI project.
 *
 * Subcommands:
 *   hojai ai-spec generate        # auto-detect from package.json
 *   hojai ai-spec read            # print .hojai/manifest.json
 *   hojai ai-spec validate        # validate existing files
 *   hojai ai-spec render <json>   # render hojai.ai.md from JSON input
 *
 * Uses @hojai/ai-spec under the hood. If the package isn't installed,
 * the CLI falls back to a friendly error.
 */

import { existsSync } from 'node:fs';
import { printJson, printError, printSuccess, printInfo, printTable, header } from '../output.js';

let aiSpec: any = null;
function loadAiSpec() {
  if (aiSpec !== null) return aiSpec;
  try {
    aiSpec = require('@hojai/ai-spec');
    return aiSpec;
  } catch {
    // Fallback: direct path lookup (for dev when dep isn't installed via npm)
    try {
      const path = require('node:path');
      const modulePath = path.resolve(__dirname, '../../../../hojai-ai-spec/dist/index.js');
      if (existsSync(modulePath)) {
        aiSpec = require(modulePath);
        return aiSpec;
      }
    } catch { /* */ }
    return null;
  }
}

export async function runAiSpec(args: string[]): Promise<void> {
  const spec = loadAiSpec();
  if (!spec) {
    printError('@hojai/ai-spec is not installed. Run: npm install @hojai/ai-spec');
    process.exit(1);
  }
  const sub = args[0];
  const cwd = process.cwd();
  const json = args.includes('--json');

  if (!sub || sub === 'help') {
    printAiSpecHelp();
    return;
  }

  if (sub === 'generate' || sub === 'init') {
    if (!existsSync(`${cwd}/package.json`)) {
      printError('No package.json found in current directory.');
      process.exit(1);
    }
    try {
      const result = await spec.generateAndWrite(cwd);
      if (json) { printJson(result); return; }
      printSuccess(`AI-native spec generated for "${result.manifest.name}"`);
      printInfo('Created:');
      printInfo('  hojai.ai.md');
      printInfo('  .hojai/manifest.json');
      printInfo('  .hojai/capability.json');
    } catch (e) {
      printError((e as Error).message);
      process.exit(1);
    }
    return;
  }

  if (sub === 'read' || sub === 'show') {
    if (!spec.isHojaiProject(cwd)) {
      printError('Not a HOJAI project (no .hojai/manifest.json found).');
      printInfo('Run: hojai ai-spec generate');
      process.exit(1);
    }
    try {
      const ctx = await spec.readProjectContext(cwd);
      if (json) { printJson(ctx.manifest); return; }
      header(`${ctx.manifest.name} (${ctx.manifest.type})`);
      printTable(
        [
          { key: 'projectId', value: ctx.manifest.projectId },
          { key: 'type', value: ctx.manifest.type },
          { key: 'region', value: ctx.manifest.region ?? 'global' },
          { key: 'languages', value: ctx.manifest.languages.join(', ') },
          { key: 'agents', value: String(ctx.manifest.agents.length) },
          { key: 'integrations', value: ctx.manifest.integrations.join(', ') || '(none)' },
          { key: 'hojaiVersion', value: ctx.manifest.hojaiVersion },
          { key: 'createdAt', value: ctx.manifest.createdAt }
        ],
        ['key', 'value']
      );
    } catch (e) {
      printError((e as Error).message);
      process.exit(1);
    }
    return;
  }

  if (sub === 'validate') {
    if (!spec.isHojaiProject(cwd)) {
      printError('Not a HOJAI project.');
      process.exit(1);
    }
    try {
      const ctx = await spec.readProjectContext(cwd);
      const mResult = spec.validateManifestData(ctx.manifest);
      const cResult = spec.validateCapabilityData(ctx.capability);
      const allValid = mResult.valid && cResult.valid;
      if (allValid) {
        printSuccess('All AI-spec files are valid.');
        return;
      }
      printError('Validation failed:');
      for (const e of mResult.errors) console.log(`  manifest.${e.path}: ${e.message}`);
      for (const e of cResult.errors) console.log(`  capability.${e.path}: ${e.message}`);
      process.exit(1);
    } catch (e) {
      printError((e as Error).message);
      process.exit(1);
    }
    return;
  }

  printError(`Unknown ai-spec subcommand: ${sub}`);
  printAiSpecHelp();
  process.exit(1);
}

function printAiSpecHelp(): void {
  printInfo('hojai ai-spec — AI-native project context');
  console.log(`
Subcommands:
  generate    Auto-detect from package.json + write all 3 files
  read        Show the current .hojai/manifest.json
  validate    Validate existing .hojai/manifest.json + capability.json

Generates 3 files in your project root:
  hojai.ai.md              — AI tools (Claude Code, Cursor) read this
  .hojai/manifest.json     — Machine-readable project schema
  .hojai/capability.json   — Nexha federation profile

Examples:
  cd my-project
  hojai ai-spec generate
  hojai ai-spec read
  hojai ai-spec validate
`);
}
