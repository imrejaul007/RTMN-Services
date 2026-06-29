/**
 * HOJAI CLI - Init Command
 * Initialize a new HOJAI project
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const TEMPLATES = [
  { name: 'blank', description: 'Empty project' },
  { name: 'sales', description: 'AI Sales Department' },
  { name: 'marketing', description: 'AI Marketing Department' },
  { name: 'support', description: 'AI Customer Support' },
  { name: 'hr', description: 'AI HR Department' },
  { name: 'restaurant', description: 'RestaurantOS' },
  { name: 'hotel', description: 'HotelOS' },
  { name: 'healthcare', description: 'HealthcareOS' },
  { name: 'ecommerce', description: 'E-Commerce' },
];

const INDUSTRIES = [
  'Restaurant',
  'Hotel',
  'Healthcare',
  'Retail',
  'Beauty',
  'Education',
  'Real Estate',
  'Fitness',
  'Automotive',
  'Other',
];

export async function initCommand(name?: string, options?: { template?: string; industry?: string }) {
  console.log(chalk.bold('\n🚀 HOJAI CLI - Initialize Project\n'));

  const projectName = name || await askProjectName();
  const template = options?.template || await askTemplate();
  const industry = options?.industry || await askIndustry();

  const spinner = ora(`Creating project: ${projectName}`).start();

  try {
    // Create project directory
    const projectPath = path.resolve(process.cwd(), projectName);
    await fs.ensureDir(projectPath);

    // Create package.json
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify({
        name: projectName,
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'hojai dev',
          deploy: 'hojai deploy',
          build: 'hojai build',
        },
        hojai: {
          template,
          industry,
          version: '1.0.0',
        },
      }, null, 2)
    );

    // Create hojai.config.json
    await fs.writeFile(
      path.join(projectPath, 'hojai.config.json'),
      JSON.stringify({
        name: projectName,
        template,
        industry,
        version: '1.0.0',
        company: {
          name: projectName,
          type: industry.toLowerCase(),
        },
        agents: [],
        flows: [],
        twins: [],
        integrations: [],
      }, null, 2)
    );

    // Create src directory with basic structure
    await fs.ensureDir(path.join(projectPath, 'src', 'agents'));
    await fs.ensureDir(path.join(projectPath, 'src', 'flows'));
    await fs.ensureDir(path.join(projectPath, 'src', 'skills'));
    await fs.ensureDir(path.join(projectPath, 'src', 'connectors'));

    // Create README
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      `# ${projectName}

Generated with HOJAI CLI

## Quick Start

\`\`\`bash
# Start development
npm run dev

# Deploy to cloud
npm run deploy
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── agents/     # AI agents
│   ├── flows/      # Workflows
│   ├── skills/     # Skills
│   └── connectors/ # Integrations
├── hojai.config.json
└── package.json
\`\`\`

## Template: ${template}
## Industry: ${industry}
`
    );

    spinner.succeed(chalk.green(`✓ Project created: ${projectName}`));

    console.log(chalk.bold('\n📁 Project Structure:\n'));
    console.log(`  ${projectName}/`);
    console.log(`  ├── src/`);
    console.log(`  │   ├── agents/`);
    console.log(`  │   ├── flows/`);
    console.log(`  │   ├── skills/`);
    console.log(`  │   └── connectors/`);
    console.log(`  ├── hojai.config.json`);
    console.log(`  └── package.json\n`);

    console.log(chalk.bold('Next steps:\n'));
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);

  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
  }
}

async function askProjectName(): Promise<string> {
  const { name } = await inquirer.prompt({
    type: 'input',
    name: 'name',
    message: 'Project name:',
    default: 'my-ai-company',
    validate: (input) => input.length > 0,
  });
  return name;
}

async function askTemplate(): Promise<string> {
  const { template } = await inquirer.prompt({
    type: 'list',
    name: 'template',
    message: 'Select a template:',
    choices: TEMPLATES.map((t) => ({
      name: `${t.name} - ${t.description}`,
      value: t.name,
    })),
  });
  return template;
}

async function askIndustry(): Promise<string> {
  const { industry } = await inquirer.prompt({
    type: 'list',
    name: 'industry',
    message: 'Select an industry:',
    choices: INDUSTRIES,
  });
  return industry;
}
