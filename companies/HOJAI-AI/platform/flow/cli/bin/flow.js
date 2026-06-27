#!/usr/bin/env node

/**
 * FlowOS CLI - Command Line Interface
 * Manage workflows from the terminal
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import axios from 'axios';

const API_BASE = process.env.FLOW_API_URL || 'http://localhost:4399';

// API client
const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// Colors
const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
};

// Workflow commands
const workflowCmd = new Command('workflow').description('Workflow management');

// List workflows
workflowCmd
  .command('list')
  .description('List all workflows')
  .option('-j, --json', 'Output as JSON')
  .action(async (opts) => {
    try {
      const { data } = await api.get('/api/workflows');
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(chalk.bold('\n📋 Workflows\n'));
        data.forEach(wf => {
          console.log(`  ${chalk.cyan(wf.id?.slice(0, 8) || 'unknown')} ${wf.name} (${wf.status || 'draft'})`);
        });
        console.log(chalk.dim(`\nTotal: ${data.length}\n`));
      }
    } catch (err) {
      log.error(`Failed to list workflows: ${err.message}`);
    }
  });

// Create workflow
workflowCmd
  .command('create')
  .description('Create a new workflow')
  .argument('<name>', 'Workflow name')
  .option('-d, --description <text>', 'Workflow description')
  .option('-f, --file <path>', 'Load from JSON file')
  .action(async (name, opts) => {
    try {
      let workflow = { name, description: opts.description || '' };

      if (opts.file) {
        const fs = await import('fs/promises');
        const content = await fs.readFile(opts.file, 'utf-8');
        workflow = JSON.parse(content);
        workflow.name = name;
      }

      const { data } = await api.post('/api/workflows', workflow);
      log.success(`Created workflow: ${chalk.green(data.id)}`);
    } catch (err) {
      log.error(`Failed to create workflow: ${err.message}`);
    }
  });

// Get workflow
workflowCmd
  .command('get')
  .description('Get workflow details')
  .argument('<id>', 'Workflow ID')
  .option('-j, --json', 'Output as JSON')
  .action(async (id, opts) => {
    try {
      const { data } = await api.get(`/api/workflows/${id}`);
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(chalk.bold('\n📄 Workflow Details\n'));
        console.log(`  Name:        ${data.name}`);
        console.log(`  ID:          ${data.id}`);
        console.log(`  Status:      ${data.status || 'draft'}`);
        console.log(`  Nodes:       ${data.nodes?.length || 0}`);
        console.log(`  Created:     ${new Date(data.createdAt).toLocaleString()}`);
      }
    } catch (err) {
      log.error(`Failed to get workflow: ${err.message}`);
    }
  });

// Execute workflow
workflowCmd
  .command('run')
  .description('Execute a workflow')
  .argument('<id>', 'Workflow ID')
  .option('-c, --context <json>', 'Execution context as JSON')
  .action(async (id, opts) => {
    try {
      const context = opts.context ? JSON.parse(opts.context) : {};
      log.info(`Executing workflow ${id}...`);
      const { data } = await api.post(`/api/workflows/${id}/execute`, { context });
      log.success(`Execution started: ${chalk.green(data.id)}`);
      console.log(`  Status: ${data.status}`);
    } catch (err) {
      log.error(`Failed to execute workflow: ${err.message}`);
    }
  });

// Delete workflow
workflowCmd
  .command('delete')
  .description('Delete a workflow')
  .argument('<id>', 'Workflow ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id, opts) => {
    try {
      if (!opts.force) {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Delete workflow ${id}?`,
          default: false
        }]);
        if (!confirm) {
          console.log('Cancelled');
          return;
        }
      }
      await api.delete(`/api/workflows/${id}`);
      log.success(`Deleted workflow: ${id}`);
    } catch (err) {
      log.error(`Failed to delete workflow: ${err.message}`);
    }
  });

// Execution commands
const execCmd = new Command('exec').description('Execution management');

execCmd
  .command('list')
  .description('List recent executions')
  .option('-w, --workflow <id>', 'Filter by workflow ID')
  .option('-l, --limit <n>', 'Limit results', '20')
  .action(async (opts) => {
    try {
      const params = new URLSearchParams({ limit: opts.limit });
      if (opts.workflow) params.append('workflowId', opts.workflow);
      const { data } = await api.get(`/api/executions?${params}`);
      console.log(chalk.bold('\n⚡ Recent Executions\n'));
      data.forEach(exec => {
        const statusColor = exec.status === 'completed' ? chalk.green : exec.status === 'failed' ? chalk.red : chalk.yellow;
        console.log(`  ${statusColor(exec.status.padEnd(12))} ${exec.id?.slice(0, 8)} ${new Date(exec.startedAt).toLocaleTimeString()}`);
      });
    } catch (err) {
      log.error(`Failed to list executions: ${err.message}`);
    }
  });

execCmd
  .command('logs')
  .description('Get execution logs')
  .argument('<id>', 'Execution ID')
  .action(async (id) => {
    try {
      const { data } = await api.get(`/api/executions/${id}/logs`);
      console.log(chalk.bold(`\n📜 Logs for ${id}\n`));
      data.forEach(log => {
        console.log(`  ${chalk.dim(new Date(log.timestamp).toLocaleTimeString())} ${log.level || 'info'}: ${log.message}`);
      });
    } catch (err) {
      log.error(`Failed to get logs: ${err.message}`);
    }
  });

execCmd
  .command('pause')
  .description('Pause an execution')
  .argument('<id>', 'Execution ID')
  .action(async (id) => {
    try {
      await api.post(`/api/executions/${id}/pause`);
      log.success(`Paused execution: ${id}`);
    } catch (err) {
      log.error(`Failed to pause: ${err.message}`);
    }
  });

execCmd
  .command('resume')
  .description('Resume a paused execution')
  .argument('<id>', 'Execution ID')
  .action(async (id) => {
    try {
      await api.post(`/api/executions/${id}/resume`);
      log.success(`Resumed execution: ${id}`);
    } catch (err) {
      log.error(`Failed to resume: ${err.message}`);
    }
  });

// Template commands
const templateCmd = new Command('template').description('Workflow templates');

templateCmd
  .command('list')
  .description('List available templates')
  .action(async () => {
    const templates = [
      { name: 'hello-world', description: 'Simple hello world workflow' },
      { name: 'http-api', description: 'HTTP API call workflow' },
      { name: 'approval', description: 'Multi-level approval flow' },
      { name: 'data-pipeline', description: 'Scheduled data processing' },
      { name: 'parallel', description: 'Parallel task execution' },
    ];
    console.log(chalk.bold('\n📦 Workflow Templates\n'));
    templates.forEach(t => {
      console.log(`  ${chalk.cyan(t.name.padEnd(20))} ${t.description}`);
    });
  });

templateCmd
  .command('create')
  .description('Create workflow from template')
  .argument('<name>', 'Template name')
  .argument('[workflow-name]', 'Name for new workflow')
  .action(async (templateName, workflowName) => {
    log.info(`Creating workflow from template: ${templateName}`);
    log.warn('Template execution not implemented - use workflow create with a JSON file');
  });

// Main CLI
const program = new Command();

program
  .name('flow')
  .description(chalk.cyan('FlowOS CLI - Workflow orchestration made simple'))
  .version('1.0.0');

program.addCommand(workflowCmd);
program.addCommand(execCmd);
program.addCommand(templateCmd);

// Config command
program
  .command('config')
  .description('Manage CLI configuration')
  .action(() => {
    console.log(chalk.bold('\n⚙️  Configuration\n'));
    console.log(`  API URL: ${chalk.cyan(API_BASE)}`);
    console.log(chalk.dim('\n  Set via FLOW_API_URL environment variable\n'));
  });

// Status command
program
  .command('status')
  .description('Check FlowOS status')
  .action(async () => {
    try {
      const { data } = await api.get('/health');
      log.success('FlowOS is healthy');
      console.log(`  Version: ${data.version || 'unknown'}`);
      console.log(`  Port: ${data.port}`);
    } catch (err) {
      log.error('FlowOS is not reachable');
      console.log(chalk.dim(`  ${err.message}`));
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new project with FlowOS')
  .action(async () => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Project name:', default: 'my-flow-project' },
      { type: 'list', name: 'template', message: 'Start with:', choices: ['Empty project', 'Hello World', 'API Workflow', 'Approval Flow'] }
    ]);

    console.log(chalk.green('\n✓ Project initialized!'));
    console.log(`\n  Next steps:`);
    console.log(`  ${chalk.cyan('cd', answers.name)}`);
    console.log(`  ${chalk.cyan('flow workflow list')}`);
  });

program.parse();