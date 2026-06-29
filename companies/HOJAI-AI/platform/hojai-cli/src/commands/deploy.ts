/**
 * HOJAI CLI - Deploy Command
 * Deploy to HOJAI Cloud
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const ENVIRONMENTS = [
  { name: 'staging', description: 'Staging environment' },
  { name: 'production', description: 'Production environment' },
];

export async function deployCommand(project?: string, options?: { env?: string }) {
  console.log(chalk.bold('\n🚀 HOJAI Deploy\n'));

  const configPath = path.join(process.cwd(), 'hojai.config.json');
  const hasConfig = await fs.pathExists(configPath);

  if (!hasConfig) {
    console.log(chalk.red('✗ No hojai.config.json found'));
    console.log('Run "hojai init" first\n');
    return;
  }

  const config = await fs.readJson(configPath);
  const env = options?.env || await askEnv();

  console.log(`📦 Project: ${config.name}`);
  console.log(`🌍 Environment: ${env}`);
  console.log('');

  const spinner = ora('Deploying to HOJAI Cloud...').start();

  try {
    // Build
    spinner.text = 'Building project...';
    await buildProject();

    // Deploy
    spinner.text = 'Uploading to cloud...';
    await uploadProject(config.name);

    // Initialize
    spinner.text = 'Initializing services...';
    await initializeServices(config.name, env);

    spinner.succeed(chalk.green('✓ Deployed successfully!'));

    const url = `https://${config.name}.hojai.app`;
    console.log(`\n🌐 URL: ${chalk.cyan(url)}`);
    console.log('\nNext steps:');
    console.log(`  ${chalk.cyan('hojai logs')}     - View logs`);
    console.log(`  ${chalk.cyan('hojai scale')}    - Scale resources`);
    console.log(`  ${chalk.cyan('hojai rollback')} - Rollback\n`);

  } catch (error) {
    spinner.fail(chalk.red('Deploy failed'));
    console.error(error);
  }
}

async function buildProject() {
  // Run build command
  const { execSync } = require('child_process');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    throw new Error('Build failed');
  }
}

async function uploadProject(name: string) {
  // Simulated - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 1000));
  // POST to HOJAI Cloud API
  // await axios.post('https://api.hojai.cloud/deploy', { name, dist: './dist' });
}

async function initializeServices(name: string, env: string) {
  // Simulated - replace with actual API
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function askEnv(): Promise<string> {
  const { env } = await inquirer.prompt({
    type: 'list',
    name: 'env',
    message: 'Select environment:',
    choices: ENVIRONMENTS.map(e => ({
      name: `${e.name} - ${e.description}`,
      value: e.name,
    })),
  });
  return env;
}
