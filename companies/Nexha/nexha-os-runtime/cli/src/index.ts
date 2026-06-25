#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { register } from './commands/register.js';
import { status } from './commands/status.js';
import { federate } from './commands/federate.js';
import { update } from './commands/update.js';
import { backup } from './commands/backup.js';
import { destroy } from './commands/destroy.js';
import { findRuntimeDir } from './utils.js';

const program = new Command();

program
  .name('nexha')
  .description('Nexha OS CLI — self-host, federate, and manage your Nexha node')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new Nexha OS runtime (creates directories, .env, Docker start)')
  .option('-t, --tier <lite|standard|enterprise>', 'runtime tier', 'standard')
  .option('-f, --force', 'overwrite existing .env and data')
  .option('--no-docker', 'skip Docker compose up (prepare files only)')
  .action(init);

program
  .command('register')
  .description('Register this Nexha with a federation endpoint')
  .option('-u, --url <url>', 'federation endpoint URL')
  .option('--dry-run', 'validate payload without registering')
  .action(register);

program
  .command('federate')
  .description('Initiate handshake with another Nexha in the federation')
  .argument('<target-id>', 'target Nexha ID')
  .option('-c, --capabilities <list>', 'comma-separated mutual capabilities')
  .option('-d, --data-sharing <aggregated|summary|detailed>', 'data sharing level', 'aggregated')
  .action(federate);

program
  .command('status')
  .description('Show health status of all running services')
  .option('-w, --watch', 'continuous watch mode')
  .option('--json', 'output machine-readable JSON')
  .action(status);

program
  .command('update')
  .description('Update Nexha OS to the latest version (rebuilds images, restarts containers)')
  .option('-i, --images-only', 'only pull/build new images (no restart)')
  .action(update);

program
  .command('backup')
  .description('Backup Nexha OS data (CorpID keys, memory store, config)')
  .option('-o, --output <dir>', 'backup output directory', './nexha-backups')
  .option('--encrypt', 'encrypt the backup archive with a passphrase')
  .action(backup);

program
  .command('destroy')
  .description('Tear down Nexha OS runtime (containers, volumes, data)')
  .option('-f, --force', 'skip confirmation prompt')
  .option('--keep-data', 'preserve data volumes')
  .action(destroy);

program
  .command('logs')
  .description('Stream or dump logs from a service')
  .argument('[service]', 'service name (omit for all)')
  .option('--follow', '-f', 'follow log stream')
  .option('--tail <n>', 'last N lines', '100')
  .action(async (service?: string, options?: Record<string, unknown>) => {
    const { logs } = await import('./commands/logs.js');
    await logs(service, options);
  });

// Global option: runtime directory
program.option('-r, --runtime <dir>', 'path to nexha-os-runtime', findRuntimeDir());

program.parse();
