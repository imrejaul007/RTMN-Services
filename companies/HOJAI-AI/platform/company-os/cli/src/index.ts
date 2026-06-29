#!/usr/bin/env node

/**
 * CompanyOS CLI
 *
 * Command-line interface for creating and managing companies.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createCompany } from './commands/create.js';
import { listCompanies } from './commands/list.js';
import { deleteCompany } from './commands/delete.js';
import { deployWorker } from './commands/deploy.js';
import { generateExtension } from './commands/generate.js';
import { showStatus } from './commands/status.js';
import { showHealth } from './commands/health.js';

const program = new Command();

program
  .name('company-os')
  .description('CompanyOS CLI - Create and manage companies')
  .version('1.0.0')
  .option('-v, --verbose', 'Verbose output')
  .option('-h, --help', 'Show help');

// ============================================
// COMMANDS
// ============================================

program
  .command('create')
  .description('Create a new company')
  .argument('<name>', 'Company name')
  .option('-i, --industry <industry>', 'Industry type', 'restaurant')
  .option('-d, --departments <departments>', 'Departments (comma-separated)', 'finance,hr')
  .option('-a, --ai <workers>', 'AI workers config (JSON)')
  .action(createCompany);

program
  .command('list')
  .description('List all companies')
  .option('-j, --json', 'Output as JSON')
  .action(listCompanies);

program
  .command('delete')
  .description('Delete a company')
  .argument('<company-id>', 'Company ID to delete')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteCompany);

program
  .command('status')
  .description('Show company status')
  .argument('<company-id>', 'Company ID')
  .action(showStatus);

program
  .command('health')
  .description('Show system health')
  .action(showHealth);

program
  .command('deploy')
  .description('Deploy AI worker')
  .argument('<company-id>', 'Company ID')
  .argument('<worker-id>', 'Worker ID (e.g., ai-cfo)')
  .action(deployWorker);

program
  .command('generate')
  .description('Generate new industry extension')
  .argument('<industry>', 'Industry name (e.g., healthcare)')
  .option('-f, --from <template>', 'Template to use', 'restaurant')
  .option('-o, --output <dir>', 'Output directory')
  .action(generateExtension);

// ============================================
// HELP TEXT
// ============================================

program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(`  ${chalk.cyan('$ company-os create "My Restaurant"')}`);
  console.log(`  ${chalk.cyan('$ company-os create "My Shop" --industry retail')}`);
  console.log(`  ${chalk.cyan('$ company-os create "My Hotel" -i hotel -d finance,hr,operations')}`);
  console.log('');
  console.log(chalk.bold('Industries:'));
  console.log('  restaurant, beauty, hotel, retail, healthcare, education');
  console.log('  realestate, manufacturing');
  console.log('');
  console.log(chalk.bold('Departments:'));
  console.log('  finance, hr, marketing, sales, operations, legal');
  console.log('');
});

// ============================================
// MAIN
// ============================================

program.parse();
