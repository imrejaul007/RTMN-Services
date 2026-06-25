#!/usr/bin/env node
/**
 * @hojai/create — CLI entry point.
 *
 * Implements `npx hojai create` (and `npx hojai [command]`).
 * For now, only `create` is implemented; future commands will be
 * added to the dispatch table at the bottom.
 *
 * Flags recognised before interactive prompts:
 *   --template <name>   skip template picker
 *   --agents <list>     skip agent picker (comma-separated)
 *   --region <r>        skip region picker
 *   --lang <list>       skip language picker (comma-separated)
 *   --name <name>       skip project-name prompt
 *   --no-install        skip npm install
 *   --no-git            skip git init
 *   --yes               accept all defaults (non-interactive)
 *   -h, --help          show help
 *   -v, --version       show version
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import prompts from 'prompts';

import { readFileSync } from 'node:fs';
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

import {
  TEMPLATES, AGENT_PRESETS, REGIONS, LANGUAGES, ALL_AGENTS,
  templateByValue, presetAgentsFor, regionByValue, isValidName
} from './prompts.js';
import { renderTemplate, buildVars } from './render.js';
import { writeManifest } from './manifest.js';
import { runDeploy } from './deploy.js';
import { runAdd } from './add.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STARTERS_DIR = path.resolve(__dirname, '..', '..', '..', 'starters');

const BANNER = `
${kleur.cyan().bold('╔══════════════════════════════════════════════════════════╗')}
${kleur.cyan().bold('║')}  ${kleur.bold().white('HOJAI Foundry')}  ${kleur.gray('— AI-native companies in 30 minutes')}   ${kleur.cyan().bold('║')}
${kleur.cyan().bold('╚══════════════════════════════════════════════════════════╝')}
`;

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      let key, value;
      if (eq !== -1) { key = a.slice(2, eq); value = a.slice(eq + 1); }
      else { key = a.slice(2); const next = argv[i + 1]; if (next && !next.startsWith('--')) { value = next; i++; } }
      args.flags[key] = value === undefined ? true : value;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function helpText() {
  return `${kleur.bold('Usage:')}
  ${kleur.cyan('npx hojai create')} [project-name] [flags]
  ${kleur.cyan('npx hojai deploy')} [--mode=local|preview|remote] [flags]
  ${kleur.cyan('npx hojai add agent')} <name> [--desc="..."]
  ${kleur.cyan('npx hojai add integration')} <name>
  ${kleur.cyan('npx hojai --help')}
  ${kleur.cyan('npx hojai --version')}

${kleur.bold('Flags:')}
  --template <name>    One of: ${TEMPLATES.map(t => t.value).join(', ')}
  --agents <a,b,...>   Comma-separated agent names (defaults per template)
  --region <r>         One of: ${REGIONS.map(r => r.value).join(', ')}
  --lang <a,b,...>     Comma-separated language codes
  --name <n>           Project folder name (lowercase, hyphens)
  --mode <m>           Deploy mode (local | preview | remote)
  --no-install         Skip ${kleur.gray('npm install')}
  --no-git             Skip ${kleur.gray('git init')}
  --yes                Accept all defaults (non-interactive)

${kleur.bold('Examples:')}
  ${kleur.gray('$ npx hojai create tradeflow')}
  ${kleur.gray('$ npx hojai create tradeflow --template=b2b --region=me --lang=en,ar --yes')}
  ${kleur.gray('$ cd tradeflow && npx hojai deploy --mode=preview')}
  ${kleur.gray('$ cd tradeflow && npx hojai add agent "Quality Assurance" --desc="Reviews all deliveries."')}
  ${kleur.gray('$ cd tradeflow && npx hojai add integration payments')}
  ${kleur.gray('$ npx hojai --version')}
`;
}

async function runCreate(flags) {
  const useDefaults = !!flags.yes;

  // 1. Project name
  let name = flags.name;
  if (!name && flags._.length > 1) name = flags._[1];
  if (!name) {
    if (useDefaults) { name = 'my-hojai-app'; }
    else {
      const r = await prompts({
        type: 'text',
        name: 'name',
        message: 'Project name?',
        initial: 'my-hojai-app',
        validate: v => isValidName(v) ? true : 'lowercase, hyphens, 2-40 chars, must start with a letter'
      });
      if (!r.name) { console.log(kleur.red('✖ cancelled')); process.exit(1); }
      name = r.name;
    }
  }
  if (!isValidName(name)) {
    console.log(kleur.red(`✖ invalid project name: "${name}"`));
    console.log(kleur.gray('  lowercase, hyphens, 2-40 chars, must start with a letter'));
    process.exit(1);
  }

  // 2. Template
  let template = flags.template;
  if (!template) {
    if (useDefaults) { template = 'marketplace'; }
    else {
      const r = await prompts({
        type: 'select',
        name: 'template',
        message: 'Pick a starter template:',
        choices: TEMPLATES.map(t => ({ title: `${t.emoji}  ${kleur.bold(t.name)} — ${kleur.gray(t.description)}`, value: t.value }))
      });
      if (!r.template) { console.log(kleur.red('✖ cancelled')); process.exit(1); }
      template = r.template;
    }
  }
  if (!templateByValue(template)) {
    console.log(kleur.red(`✖ unknown template: "${template}"`));
    console.log(kleur.gray(`  available: ${TEMPLATES.map(t => t.value).join(', ')}`));
    process.exit(1);
  }
  const tpl = templateByValue(template);
  const starterPath = path.join(STARTERS_DIR, template, 'template');
  try { await fs.access(starterPath); }
  catch { console.log(kleur.red(`✖ starter template not yet built: ${template}`)); console.log(kleur.gray(`  available: marketplace`)); process.exit(1); }

  // 3. Agents
  let agents;
  if (flags.agents) { agents = String(flags.agents).split(',').map(s => s.trim()).filter(Boolean); }
  else if (useDefaults) { agents = presetAgentsFor(template); }
  else {
    const preset = presetAgentsFor(template);
    const r = await prompts({
      type: 'multiselect',
      name: 'agents',
      message: 'Which AI agents should your company start with?',
      hint: 'space = toggle, enter = confirm',
      instructions: false,
      choices: ALL_AGENTS.map(a => ({ title: a, value: a, selected: preset.includes(a) }))
    });
    if (!r.agents || r.agents.length === 0) {
      console.log(kleur.red('✖ at least one agent required')); process.exit(1);
    }
    agents = r.agents;
  }

  // 4. Region
  let region = flags.region;
  if (!region) {
    if (useDefaults) { region = 'us-east'; }
    else {
      const r = await prompts({
        type: 'select',
        name: 'region',
        message: 'Primary region?',
        choices: REGIONS.map(r => ({ title: `${r.emoji}  ${r.name}`, value: r.value }))
      });
      if (!r.region) { console.log(kleur.red('✖ cancelled')); process.exit(1); }
      region = r.region;
    }
  }
  if (!regionByValue(region)) {
    console.log(kleur.red(`✖ unknown region: "${region}"`));
    console.log(kleur.gray(`  available: ${REGIONS.map(r => r.value).join(', ')}`));
    process.exit(1);
  }

  // 5. Languages
  let languages;
  if (flags.lang) { languages = String(flags.lang).split(',').map(s => s.trim()).filter(Boolean); }
  else if (useDefaults) { languages = ['en']; }
  else {
    const r = await prompts({
      type: 'multiselect',
      name: 'languages',
      message: 'Languages to support?',
      hint: 'space = toggle, enter = confirm',
      instructions: false,
      min: 1,
      choices: LANGUAGES.map(l => ({ title: l.name, value: l.value, selected: l.value === 'en' }))
    });
    if (!r.languages || r.languages.length === 0) { console.log(kleur.red('✖ at least one language required')); process.exit(1); }
    languages = r.languages;
  }

  // ── Render ──────────────────────────────────────────────────────────
  console.log('');
  console.log(kleur.gray('  project: ') + kleur.bold(name));
  console.log(kleur.gray('  template: ') + kleur.bold(`${tpl.emoji} ${tpl.name}`));
  console.log(kleur.gray('  agents: ') + kleur.bold(agents.join(', ')));
  console.log(kleur.gray('  region: ') + kleur.bold(regionByValue(region).name));
  console.log(kleur.gray('  languages: ') + kleur.bold(languages.join(', ')));
  console.log('');

  const targetDir = path.resolve(process.cwd(), name);
  try {
    const stat = await fs.stat(targetDir);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(targetDir);
      if (entries.length > 0) {
        if (useDefaults) { console.log(kleur.red(`✖ target directory not empty: ${targetDir}`)); process.exit(1); }
        const r = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `Target directory not empty: ${targetDir}\n  Continue anyway? (existing files will be skipped)`,
          initial: false
        });
        if (!r.overwrite) { console.log(kleur.red('✖ cancelled')); process.exit(1); }
      }
    }
  } catch { /* dir doesn't exist — good */ }

  console.log(kleur.cyan('▸ Scaffolding files…'));
  const vars = buildVars({ name, template, agents, region, languages });
  const files = await renderTemplate({ templateDir: starterPath, targetDir, vars });

  console.log(kleur.cyan('▸ Writing HOJAI manifest…'));
  const { projectId, hash } = await writeManifest({ targetDir, name, template, agents, region, languages, files });

  console.log(kleur.cyan('▸ Initialising git…'));
  if (flags.git !== false && !flags['no-git']) {
    const { spawn } = await import('node:child_process');
    await new Promise((resolve) => {
      const proc = spawn('git', ['init', '-q', '-b', 'main'], { cwd: targetDir, stdio: 'ignore' });
      proc.on('close', () => resolve());
    });
  }

  console.log(kleur.cyan('▸ Installing dependencies…'));
  if (flags.install !== false && !flags['no-install']) {
    const { spawn } = await import('node:child_process');
    await new Promise((resolve) => {
      const proc = spawn('npm', ['install', '--no-audit', '--no-fund', '--silent'], { cwd: targetDir, stdio: 'inherit' });
      proc.on('close', () => resolve());
    });
  } else {
    console.log(kleur.gray('  (skipped — run `npm install` yourself)'));
  }

  // ── Done ────────────────────────────────────────────────────────────
  console.log('');
  console.log(kleur.green().bold('✔ Created ') + kleur.bold(name) + kleur.green('!'));
  console.log('');
  console.log(kleur.bold('  Next steps:'));
  console.log(kleur.gray(`    cd ${name}`));
  console.log(kleur.gray(`    npm run dev            # → http://localhost:3000`));
  console.log(kleur.gray(`    npx hojai deploy       # ship it to ${name}.hojai.app`));
  console.log('');
  console.log(kleur.gray(`  projectId:  ${projectId}`));
  console.log(kleur.gray(`  projectHash: ${hash}`));
  console.log(kleur.gray(`  files:       ${files.length}`));
  console.log('');
}

async function main() {
  console.log(BANNER);
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (args.flags.help || args.flags.h || cmd === 'help') { console.log(helpText()); return; }
  if (args.flags.version || args.flags.v || cmd === 'version') { console.log(PKG.version); return; }
  if (!cmd || cmd === 'create') { return runCreate({ ...args.flags, _: args._ }); }
  if (cmd === 'deploy') { return runDeploy({ flags: args.flags }); }
  if (cmd === 'add') { return runAdd({ args: args._.slice(1) }); }
  console.log(kleur.red(`✖ unknown command: ${cmd}`));
  console.log(helpText());
  process.exit(1);
}

main().catch(err => {
  console.error(kleur.red('✖ ') + (err && err.message ? err.message : String(err)));
  if (process.env.HOJAI_DEBUG) console.error(err);
  process.exit(1);
});
