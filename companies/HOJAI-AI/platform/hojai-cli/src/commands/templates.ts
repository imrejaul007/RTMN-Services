/**
 * HOJAI CLI - Templates Command
 * Manage workflow templates
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const TEMPLATE_CATEGORIES = [
  { name: 'sales', description: 'Sales automation' },
  { name: 'marketing', description: 'Marketing automation' },
  { name: 'support', description: 'Customer support' },
  { name: 'hr', description: 'Human resources' },
  { name: 'finance', description: 'Finance & accounting' },
  { name: 'founder', description: 'Founder tools' },
  { name: 'restaurant', description: 'Restaurant operations' },
  { name: 'healthcare', description: 'Healthcare' },
  { name: 'real-estate', description: 'Real estate' },
  { name: 'commerce', description: 'Commerce & procurement' },
];

export async function templatesCommand(action?: string, query?: string) {
  console.log(chalk.bold('\n📋 HOJAI Templates\n'));

  if (!action) {
    await listTemplates();
    return;
  }

  switch (action) {
    case 'list':
      await listTemplates();
      break;
    case 'search':
      await searchTemplates(query);
      break;
    case 'install':
      await installTemplate(query);
      break;
    default:
      console.log(chalk.yellow(`Unknown action: ${action}`));
      console.log('Available: list, search, install\n');
  }
}

async function listTemplates() {
  const configPath = path.join(__dirname, '../../hojai-templates/templates.json');
  const hasLocal = await fs.pathExists(configPath);

  console.log(chalk.bold('Available Templates:\n'));

  if (hasLocal) {
    const templates = await fs.readJson(configPath);
    displayTemplates(templates);
  } else {
    // Fetch from registry
    const spinner = ora('Fetching templates...').start();
    try {
      const templates = await fetchTemplates();
      spinner.stop();
      displayTemplates(templates);
    } catch (e) {
      spinner.fail('Failed to fetch templates');
      displayLocalTemplates();
    }
  }
}

async function searchTemplates(query?: string) {
  if (!query) {
    const { q } = await inquirer.prompt({
      type: 'input',
      name: 'q',
      message: 'Search query:',
    });
    query = q;
  }

  const spinner = ora(`Searching for "${query}"...`).start();

  try {
    // Simulated search
    const results = await searchTemplatesAPI(query);
    spinner.stop();

    if (results.length === 0) {
      console.log(chalk.yellow(`No templates found for "${query}"\n`));
    } else {
      console.log(chalk.bold(`\nFound ${results.length} templates:\n`));
      displayTemplates(results);
    }
  } catch (e) {
    spinner.fail('Search failed');
  }
}

async function installTemplate(templateId?: string) {
  if (!templateId) {
    const { id } = await inquirer.prompt({
      type: 'input',
      name: 'id',
      message: 'Template ID:',
    });
    templateId = id;
  }

  const spinner = ora(`Installing ${templateId}...`).start();

  try {
    // Download template
    await downloadTemplate(templateId);

    // Add to project
    const configPath = path.join(process.cwd(), 'hojai.config.json');
    const hasConfig = await fs.pathExists(configPath);

    if (hasConfig) {
      const config = await fs.readJson(configPath);
      config.flows = config.flows || [];
      config.flows.push(templateId);
      await fs.writeJson(configPath, config);
    }

    spinner.succeed(chalk.green(`✓ Installed: ${templateId}`));
    console.log('\nNext steps:');
    console.log(`  npm run dev\n`);

  } catch (e) {
    spinner.fail(chalk.red('Install failed'));
  }
}

function displayTemplates(templates: any[]) {
  templates.forEach((t: any, i: number) => {
    console.log(`${chalk.cyan(i + 1}. ${t.name}`);
    console.log(`   ${t.description || 'No description'}`);
    console.log(`   ${chalk.gray('Price:')} ${t.price?.subscription || 'Free'} ${t.price?.currency || 'INR'}/mo`);
    console.log(`   ${chalk.gray('Tags:')} ${(t.tags || []).join(', ')}`);
    console.log('');
  });
}

function displayLocalTemplates() {
  TEMPLATE_CATEGORIES.forEach(cat => {
    console.log(chalk.bold(`\n${cat.name}:`));
    console.log(`  ${cat.description}`);
  });
  console.log('');
}

async function fetchTemplates(): Promise<any[]> {
  // Simulated - replace with actual API call
  return [];
}

async function searchTemplatesAPI(query: string): Promise<any[]> {
  // Simulated - replace with actual API call
  return [];
}

async function downloadTemplate(templateId: string) {
  // Simulated - replace with actual download logic
  await new Promise(resolve => setTimeout(resolve, 1000));
}
