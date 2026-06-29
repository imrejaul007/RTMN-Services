#!/usr/bin/env node

/**
 * HOJAI CLI
 * Build AI companies in minutes
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { devCommand } from './commands/dev';
import { deployCommand } from './commands/deploy';
import { templatesCommand } from './commands/templates';
import { agentsCommand } from './commands/agents';

const program = new Command();

program
  .name('hojai')
  .description('HOJAI CLI - Build AI companies in minutes')
  .version('1.0.0');

// Main commands
program
  .command('init')
  .description('Initialize a new HOJAI project')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Template to use', 'blank')
  .option('-i, --industry <industry>', 'Industry vertical')
  .action(initCommand);

program
  .command('generate')
  .description('Generate AI components')
  .argument('<type>', 'What to generate: skill, agent, flow, connector')
  .argument('[name]', 'Name of the component')
  .option('-d, --dir <directory>', 'Output directory')
  .action(generateCommand);

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('--no-open', 'Don\'t open browser')
  .action(devCommand);

program
  .command('deploy')
  .description('Deploy to HOJAI Cloud')
  .argument('[project]', 'Project to deploy')
  .option('-e, --env <environment>', 'Environment', 'staging')
  .action(deployCommand);

// Marketplace commands
program
  .command('templates')
  .description('Manage workflow templates')
  .argument('[action]', 'Action: list, search, install')
  .argument('[query]', 'Search query or template ID')
  .action(templatesCommand);

program
  .command('agents')
  .description('Manage AI agents')
  .argument('[action]', 'Action: list, install, create')
  .argument('[name]', 'Agent name or ID')
  .action(agentsCommand);

program.parse();
