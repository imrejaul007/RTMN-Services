/**
 * HOJAI CLI - Agents Command
 * Manage AI agents
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';

const AGENT_TYPES = [
  { name: 'sdr', description: 'Sales Development Rep' },
  { name: 'support', description: 'Customer Support' },
  { name: 'hr', description: 'HR Assistant' },
  { name: 'finance', description: 'Finance Assistant' },
  { name: 'marketing', description: 'Marketing' },
  { name: 'procurement', description: 'Procurement' },
  { name: 'custom', description: 'Custom agent' },
];

export async function agentsCommand(action?: string, agentName?: string) {
  console.log(chalk.bold('\n🤖 HOJAI Agents\n'));

  if (!action) {
    await listAgents();
    return;
  }

  switch (action) {
    case 'list':
      await listAgents();
      break;
    case 'create':
      await createAgent(agentName);
      break;
    case 'install':
      await installAgent(agentName);
      break;
    case 'remove':
      await removeAgent(agentName);
      break;
    default:
      console.log(chalk.yellow(`Unknown action: ${action}`));
      console.log('Available: list, create, install, remove\n');
  }
}

async function listAgents() {
  const configPath = path.join(process.cwd(), 'hojai.config.json');
  const hasConfig = await fs.pathExists(configPath);

  if (!hasConfig) {
    console.log(chalk.yellow('No project found. Run "hojai init" first.\n'));
    return;
  }

  const config = await fs.readJson(configPath);
  const agents = config.agents || [];

  if (agents.length === 0) {
    console.log(chalk.yellow('No agents installed.\n'));
    console.log('Install agents:');
    console.log('  hojai agents install sdr\n');
    return;
  }

  console.log(chalk.bold('Installed Agents:\n'));
  agents.forEach((agent: any) => {
    console.log(`  ${chalk.cyan(agent.id)}`);
    console.log(`  ${chalk.gray('Role:')} ${agent.role}`);
    console.log(`  ${chalk.gray('Status:')} ${agent.status || 'active'}`);
    console.log('');
  });
}

async function createAgent(name?: string) {
  if (!name) {
    const { agentName } = await inquirer.prompt({
      type: 'input',
      name: 'agentName',
      message: 'Agent name:',
      validate: (input) => input.length > 0,
    });
    name = agentName;
  }

  const type = await askAgentType();

  const spinner = ora(`Creating agent: ${name}`).start();

  try {
    const agentsDir = path.join(process.cwd(), 'src', 'agents', name);
    await fs.ensureDir(agentsDir);

    await fs.writeFile(path.join(agentsDir, 'index.ts'), generateAgentCode(name, type));
    await fs.writeFile(path.join(agentsDir, 'package.json'), JSON.stringify({
      name: `@hojai/agent-${name}`,
      version: '1.0.0',
      main: 'index.ts',
    }, null, 2));

    // Add to config
    const configPath = path.join(process.cwd(), 'hojai.config.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      config.agents = config.agents || [];
      config.agents.push({ id: name, type, role: type, status: 'active' });
      await fs.writeJson(configPath, config);
    }

    spinner.succeed(chalk.green(`✓ Created agent: ${name}`));
    console.log(`\n📁 ${agentsDir}\n`);

  } catch (e) {
    spinner.fail('Failed to create agent');
  }
}

async function installAgent(name?: string) {
  if (!name) {
    const { agentName } = await inquirer.prompt({
      type: 'input',
      name: 'agentName',
      message: 'Agent ID:',
    });
    name = agentName;
  }

  const spinner = ora(`Installing ${name}...`).start();

  try {
    // Fetch from registry
    const agent = await fetchAgent(name);

    // Download
    const agentsDir = path.join(process.cwd(), 'src', 'agents', agent.id);
    await fs.ensureDir(agentsDir);
    await fs.writeFile(path.join(agentsDir, 'index.ts'), agent.code);
    await fs.writeJson(path.join(agentsDir, 'agent.json'), agent);

    // Add to config
    const configPath = path.join(process.cwd(), 'hojai.config.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      config.agents = config.agents || [];
      config.agents.push({ id: agent.id, ...agent.metadata });
      await fs.writeJson(configPath, config);
    }

    spinner.succeed(chalk.green(`✓ Installed: ${name}`));

  } catch (e) {
    spinner.fail(`Failed to install ${name}`);
  }
}

async function removeAgent(name?: string) {
  if (!name) {
    console.log(chalk.yellow('Specify agent name: hojai agents remove <name>\n'));
    return;
  }

  const spinner = ora(`Removing ${name}...`).start();

  try {
    const agentsDir = path.join(process.cwd(), 'src', 'agents', name);
    if (await fs.pathExists(agentsDir)) {
      await fs.remove(agentsDir);
    }

    // Remove from config
    const configPath = path.join(process.cwd(), 'hojai.config.json');
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      config.agents = (config.agents || []).filter((a: any) => a.id !== name);
      await fs.writeJson(configPath, config);
    }

    spinner.succeed(chalk.green(`✓ Removed: ${name}`));

  } catch (e) {
    spinner.fail('Failed to remove agent');
  }
}

async function askAgentType(): Promise<string> {
  const { type } = await inquirer.prompt({
    type: 'list',
    name: 'type',
    message: 'Agent type:',
    choices: AGENT_TYPES.map(t => ({
      name: `${t.name} - ${t.description}`,
      value: t.name,
    })),
  });
  return type;
}

function generateAgentCode(name: string, type: string): string {
  const templates: Record<string, string> = {
    sdr: `/**
 * SDR Agent - ${name}
 */
export const agent = {
  id: '${name}',
  type: 'sdr',
  role: 'Sales Development Rep',

  skills: ['lead_qualification', 'email_outreach', 'meeting_booking'],

  async execute(context) {
    // Lead qualification
    const lead = await qualifyLead(context.lead);
    if (lead.score >= 70) {
      await bookMeeting(lead);
    }
    return { success: true, lead };
  },
};`,

    support: `/**
 * Support Agent - ${name}
 */
export const agent = {
  id: '${name}',
  type: 'support',
  role: 'Customer Support',

  skills: ['ticket_classification', 'knowledge_retrieval', 'response_generation'],

  async execute(context) {
    const ticket = await classifyTicket(context.ticket);
    const response = await generateResponse(ticket);
    return { success: true, response };
  },
};`,

    default: `/**
 * Custom Agent - ${name}
 */
export const agent = {
  id: '${name}',
  type: '${type}',
  role: '${name}',

  skills: [],

  async execute(context) {
    // TODO: Implement agent logic
    return { success: true };
  },
};`,
  };

  return templates[type] || templates.default;
}

async function fetchAgent(name: string): Promise<any> {
  // Simulated - replace with actual API
  return {
    id: name,
    code: 'export const agent = {};',
    metadata: { role: 'AI Agent' },
  };
}
