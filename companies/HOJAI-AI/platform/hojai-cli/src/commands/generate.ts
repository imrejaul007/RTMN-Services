/**
 * HOJAI CLI - Generate Command
 * Generate skills, agents, flows, connectors
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const GENERATOR_TYPES = [
  { name: 'skill', description: 'Reusable skill (e.g., lead-qualification)' },
  { name: 'agent', description: 'AI agent (e.g., sdr-agent)' },
  { name: 'flow', description: 'Workflow automation (e.g., onboarding-flow)' },
  { name: 'connector', description: 'Integration connector (e.g., salesforce-connector)' },
];

export async function generateCommand(type?: string, name?: string, options?: { dir?: string }) {
  console.log(chalk.bold('\n⚡ HOJAI CLI - Generate\n'));

  const selectedType = type || await askType();
  const selectedName = name || await askName(selectedType);
  const outputDir = options?.dir || process.cwd();

  const spinner = ora(`Generating ${selectedType}: ${selectedName}`).start();

  try {
    const targetDir = path.join(outputDir, 'src', `${selectedType}s`, selectedName);

    switch (selectedType) {
      case 'skill':
        await generateSkill(targetDir, selectedName);
        break;
      case 'agent':
        await generateAgent(targetDir, selectedName);
        break;
      case 'flow':
        await generateFlow(targetDir, selectedName);
        break;
      case 'connector':
        await generateConnector(targetDir, selectedName);
        break;
    }

    spinner.succeed(chalk.green(`✓ Generated ${selectedType}: ${selectedName}`));
    console.log(`\n📁 Location: ${targetDir}\n`);
    console.log('Next steps:');
    console.log(`  cd ${targetDir}`);
    console.log('  npm run dev\n');

  } catch (error) {
    spinner.fail(chalk.red('Failed to generate'));
    console.error(error);
  }
}

async function generateSkill(dir: string, name: string) {
  await fs.ensureDir(dir);

  // index.ts
  await fs.writeFile(path.join(dir, 'index.ts'), `/**
 * ${name} Skill
 * Generated with HOJAI CLI
 */

import { Skill } from '@hojai/core';

export const ${camelCase(name)}Skill = new Skill({
  id: '${kebabCase(name)}',
  name: '${name}',
  description: 'TODO: Add description',

  triggers: [],

  async execute(context) {
    // TODO: Implement skill logic
    return { success: true, data: context };
  },

  metadata: {
    version: '1.0.0',
    author: '',
    tags: [],
  },
});

export default ${camelCase(name)}Skill;
`);

  // package.json
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: `@hojai/skill-${kebabCase(name)}`,
    version: '1.0.0',
    main: 'index.ts',
    dependencies: { '@hojai/core': '^1.0.0' },
  }, null, 2));

  // __tests__
  await fs.ensureDir(path.join(dir, '__tests__'));
  await fs.writeFile(path.join(dir, '__tests__', 'index.test.ts'), `import { describe, it, expect } from 'vitest';
import { ${camelCase(name)}Skill } from '../index';

describe('${name} Skill', () => {
  it('should execute successfully', async () => {
    const result = await ${camelCase(name)}Skill.execute({});
    expect(result.success).toBe(true);
  });
});
`);
}

async function generateAgent(dir: string, name: string) {
  await fs.ensureDir(dir);

  await fs.writeFile(path.join(dir, 'index.ts'), `/**
 * ${name} Agent
 * Generated with HOJAI CLI
 */

import { Agent } from '@hojai/agents';

export const ${camelCase(name)}Agent = new Agent({
  id: '${kebabCase(name)}',
  name: '${name}',
  role: 'TODO: Define role',
  description: 'TODO: Add description',

  skills: [],

  async execute(context) {
    // TODO: Implement agent logic
    return { success: true, data: context };
  },

  memory: {
    required: [],
    updateOn: [],
  },

  twins: [],

  permissions: [],
});

export default ${camelCase(name)}Agent;
`);

  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: `@hojai/agent-${kebabCase(name)}`,
    version: '1.0.0',
    main: 'index.ts',
    dependencies: { '@hojai/agents': '^1.0.0' },
  }, null, 2));
}

async function generateFlow(dir: string, name: string) {
  await fs.ensureDir(dir);

  await fs.writeFile(path.join(dir, 'flow.json'), JSON.stringify({
    id: kebabCase(name),
    name: name,
    version: '1.0.0',
    triggers: [],
    nodes: [],
    connections: [],
  }, null, 2));

  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: `@hojai/flow-${kebabCase(name)}`,
    version: '1.0.0',
    main: 'flow.json',
  }, null, 2));
}

async function generateConnector(dir: string, name: string) {
  await fs.ensureDir(dir);

  await fs.writeFile(path.join(dir, 'index.ts'), `/**
 * ${name} Connector
 * Generated with HOJAI CLI
 */

import { Connector } from '@hojai/connectors';

export const ${camelCase(name)}Connector = new Connector({
  id: '${kebabCase(name)}',
  name: '${name}',

  auth: {
    type: 'oauth2|api_key|bearer',
    // TODO: Configure auth
  },

  triggers: [],
  actions: [],

  async test() {
    // TODO: Test connection
    return { success: true };
  },
});

export default ${camelCase(name)}Connector;
`);

  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
    name: `@hojai/connector-${kebabCase(name)}`,
    version: '1.0.0',
    main: 'index.ts',
    dependencies: { '@hojai/connectors': '^1.0.0' },
  }, null, 2));
}

async function askType(): Promise<string> {
  const { type } = await inquirer.prompt({
    type: 'list',
    name: 'type',
    message: 'What do you want to generate?',
    choices: GENERATOR_TYPES.map(t => ({
      name: `${t.name} - ${t.description}`,
      value: t.name,
    })),
  });
  return type;
}

async function askName(type: string): Promise<string> {
  const { name } = await inquirer.prompt({
    type: 'input',
    name: 'name',
    message: `Name for the ${type}:`,
    validate: (input) => input.length > 0,
  });
  return name;
}

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
