#!/usr/bin/env node
/**
 * Auto-Improvement Engine - Continuous Evolution
 *
 * Analyzes and improves generated apps on a schedule.
 * Used by: npx hojai evolve [--project=<dir>] [--auto]
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Evolution configuration
const CONFIG = {
  schedule: process.env.HOJAI_EVOLVE_SCHEDULE || 'weekly', // daily, weekly, monthly
  auto: process.env.HOJAI_EVOLVE_AUTO === 'true' || false,
  maxChanges: 10,
  requireApproval: true,
  storageDir: process.env.HOJAI_EVOLVE_DIR || './.hojai/evolve',
};

/**
 * Analyze a project for improvements
 */
async function analyzeProject(projectDir) {
  console.log(kleur.cyan('▸ Analyzing project for improvements…'));

  const manifest = await loadManifest(projectDir);
  const issues = [];

  // Check for common issues
  const agentsDir = path.join(projectDir, 'apps', 'backend', 'src', 'agents');
  const routesDir = path.join(projectDir, 'apps', 'backend', 'src', 'routes');

  // 1. Check for stub agents (no LLM integration)
  try {
    const agentsFile = path.join(agentsDir, 'index.js');
    const content = await fs.readFile(agentsFile, 'utf8');

    // Count agent stubs
    const stubCount = (content.match(/agent stub|replace with real/g) || []).length;
    if (stubCount > 0) {
      issues.push({
        type: 'agent_stub',
        severity: 'medium',
        message: `${stubCount} agent(s) still use stub implementations`,
        suggestion: 'Consider replacing with LLM-powered agents using --from-llm'
      });
    }
  } catch {}

  // 2. Check for missing error handling
  try {
    const files = await fs.readdir(routesDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const content = await fs.readFile(path.join(routesDir, file), 'utf8');
        if (!content.includes('catch') && !content.includes('error')) {
          issues.push({
            type: 'missing_error_handling',
            severity: 'low',
            file,
            message: `${file} may be missing error handling`,
            suggestion: 'Add try-catch blocks and error middleware'
          });
        }
      }
    }
  } catch {}

  // 3. Check for security issues
  try {
    const indexFile = path.join(projectDir, 'apps', 'backend', 'src', 'index.js');
    const content = await fs.readFile(indexFile, 'utf8');

    if (!content.includes('helmet') && !content.includes('cors')) {
      issues.push({
        type: 'security',
        severity: 'high',
        message: 'Missing security middleware (helmet, cors)',
        suggestion: 'Add helmet() and cors() to Express app'
      });
    }

    if (!content.includes('rate-limit') && !content.includes('RateLimit')) {
      issues.push({
        type: 'security',
        severity: 'medium',
        message: 'Missing rate limiting',
        suggestion: 'Add express-rate-limit middleware'
      });
    }
  } catch {}

  // 4. Check for performance issues
  try {
    const content = await fs.readFile(path.join(projectDir, 'apps', 'backend', 'src', 'index.js'), 'utf8');

    if (!content.includes('compression')) {
      issues.push({
        type: 'performance',
        severity: 'low',
        message: 'Missing compression middleware',
        suggestion: 'Add compression() for better performance'
      });
    }
  } catch {}

  // 5. Check hojai.ai.md for completeness
  try {
    const specFile = path.join(projectDir, 'hojai.ai.md');
    const spec = await fs.readFile(specFile, 'utf8');

    if (spec.length < 1000) {
      issues.push({
        type: 'documentation',
        severity: 'low',
        message: 'hojai.ai.md could use more detail',
        suggestion: 'Add more documentation about the project structure and extensions'
      });
    }
  } catch {}

  // 6. Check for outdated dependencies
  issues.push({
    type: 'dependencies',
    severity: 'info',
    message: 'Dependencies should be checked for updates',
    suggestion: 'Run npm outdated to check for updates'
  });

  return {
    projectDir,
    manifest,
    issues,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Generate improvements for issues
 */
async function generateImprovements(analysis) {
  console.log(kleur.cyan('▸ Generating improvements…'));

  const improvements = [];

  for (const issue of analysis.issues) {
    const improvement = await generateImprovement(issue, analysis);
    if (improvement) {
      improvements.push(improvement);
    }
  }

  return improvements;
}

/**
 * Generate improvement for a single issue
 */
async function generateImprovement(issue, analysis) {
  const templates = {
    security: {
      helmet: `// Add to index.js imports
import helmet from 'helmet';
import cors from 'cors';

// Add after const app = express()
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));`,

      rateLimit: `// Add to index.js imports
import rateLimit from 'express-rate-limit';

// Add after helmet/cors
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);`
    },

    performance: {
      compression: `// Add to index.js imports
import compression from 'compression';

// Add after other middleware
app.use(compression());`
    },

    agent_stub: {
      template: `// Replace stub with LLM-powered agent
export async function {agentName}Run(body = {}) {
  const response = await fetch(process.env.HOJAI_LLM_ENDPOINT + '/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.HOJAI_LLM_API_KEY}\`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'You are a {agentType} agent. {description}'
      }, {
        role: 'user',
        content: JSON.stringify(body)
      }]
    })
  });
  const data = await response.json();
  return { agent: '{agentName}', response: data.choices[0].message.content };
}`
    }
  };

  switch (issue.type) {
    case 'security':
      if (issue.message.includes('helmet') || issue.message.includes('cors')) {
        return {
          issue,
          file: 'apps/backend/src/index.js',
          patch: templates.security.helmet,
          description: 'Add helmet and cors security middleware'
        };
      }
      if (issue.message.includes('rate')) {
        return {
          issue,
          file: 'apps/backend/src/index.js',
          patch: templates.security.rateLimit,
          description: 'Add rate limiting middleware'
        };
      }
      break;

    case 'performance':
      if (issue.message.includes('compression')) {
        return {
          issue,
          file: 'apps/backend/src/index.js',
          patch: templates.performance.compression,
          description: 'Add compression middleware'
        };
      }
      break;

    case 'agent_stub':
      return {
        issue,
        file: 'apps/backend/src/agents/index.js',
        patch: templates.agent_stub.template,
        description: 'Replace stub with LLM-powered agent'
      };

    case 'missing_error_handling':
      return {
        issue,
        file: `apps/backend/src/routes/${issue.file}`,
        patch: `// Add error handling wrapper
try {
  // existing code
} catch (error) {
  console.error('Error in ${issue.file}:', error);
  res.status(500).json({ error: 'Internal server error' });
}`,
        description: 'Add error handling to route'
      };
  }

  return null;
}

/**
 * Apply improvements (with approval)
 */
async function applyImprovements(projectDir, improvements, auto = false) {
  const results = [];
  const approved = [];

  console.log('');
  console.log(kleur.bold('Proposed improvements:'));
  console.log('');

  for (let i = 0; i < improvements.length; i++) {
    const improvement = improvements[i];
    console.log(`${i + 1}. ${kleur.cyan(improvement.description)}`);
    console.log(`   File: ${improvement.file}`);
    console.log(`   Severity: ${getSeverityColor(improvement.issue.severity)}${improvement.issue.severity}${kleur.reset()}`);
    console.log(`   Issue: ${improvement.issue.message}`);
    console.log('');
  }

  if (auto || CONFIG.requireApproval === false) {
    console.log(kleur.yellow('Auto mode enabled — applying all improvements…'));
    for (const improvement of improvements) {
      await applyImprovement(projectDir, improvement);
      approved.push(improvement);
    }
  } else {
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = () => new Promise(resolve => rl.question('Apply all improvements? (y/n/a): ', resolve));

    const answer = await question();
    rl.close();

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      for (const improvement of improvements) {
        await applyImprovement(projectDir, improvement);
        approved.push(improvement);
      }
    } else if (answer.toLowerCase() === 'a' || answer.toLowerCase() === 'all') {
      for (const improvement of improvements) {
        await applyImprovement(projectDir, improvement);
        approved.push(improvement);
      }
    } else {
      console.log(kleur.gray('No improvements applied.'));
    }
  }

  return approved;
}

/**
 * Apply a single improvement
 */
async function applyImprovement(projectDir, improvement) {
  try {
    const filePath = path.join(projectDir, improvement.file);
    let content = await fs.readFile(filePath, 'utf8');

    // Append the patch to the file
    content += '\n' + improvement.patch;

    await fs.writeFile(filePath, content, 'utf8');
    console.log(kleur.green(`  ✓ Applied: ${improvement.description}`));

    return { success: true, improvement };
  } catch (error) {
    console.log(kleur.red(`  ✗ Failed: ${improvement.description} — ${error.message}`));
    return { success: false, improvement, error };
  }
}

/**
 * Save evolution history
 */
async function saveEvolutionHistory(projectDir, analysis, improvements, results) {
  const historyDir = path.join(projectDir, CONFIG.storageDir, 'history');
  await fs.mkdir(historyDir, { recursive: true });

  const entry = {
    id: Date.now(),
    analysis,
    improvements,
    results,
    appliedAt: new Date().toISOString()
  };

  const historyFile = path.join(historyDir, `${entry.id}.json`);
  await fs.writeFile(historyFile, JSON.stringify(entry, null, 2), 'utf8');

  // Update index
  const indexFile = path.join(historyDir, 'index.json');
  let index = [];
  try {
    index = JSON.parse(await fs.readFile(indexFile, 'utf8'));
  } catch {}
  index.push({ id: entry.id, date: entry.appliedAt });
  await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');

  return entry;
}

/**
 * Display evolution dashboard
 */
async function showDashboard(projectDir) {
  console.log(kleur.bold('Evolution Dashboard'));
  console.log(kleur.gray('═'.repeat(50)));
  console.log('');

  // Load history
  const historyDir = path.join(projectDir, CONFIG.storageDir, 'history');
  let history = [];

  try {
    const indexFile = path.join(historyDir, 'index.json');
    history = JSON.parse(await fs.readFile(indexFile, 'utf8'));
  } catch {
    console.log(kleur.yellow('  No evolution history yet.'));
    console.log('');
    return;
  }

  // Show recent evolutions
  console.log(kleur.bold('Recent Evolutions:'));
  console.log('');

  const recent = history.slice(-10).reverse();
  for (const entry of recent) {
    console.log(`  ${new Date(entry.date).toLocaleDateString()} — ${kleur.gray('ID: ' + entry.id)}`);
  }

  console.log('');
  console.log(kleur.bold('Stats:'));
  console.log(`  Total evolutions: ${history.length}`);
  console.log(`  Last evolution: ${history.length > 0 ? new Date(history[history.length - 1].date).toLocaleDateString() : 'Never'}`);

  // Load latest evolution details
  if (history.length > 0) {
    try {
      const latestFile = path.join(historyDir, `${history[history.length - 1].id}.json`);
      const latest = JSON.parse(await fs.readFile(latestFile, 'utf8'));
      console.log('');
      console.log(kleur.bold('Latest Changes:'));
      for (const result of (latest.results || [])) {
        if (result.success) {
          console.log(`  ${kleur.green('✓')} ${result.improvement.description}`);
        } else {
          console.log(`  ${kleur.red('✗')} ${result.improvement.description}`);
        }
      }
    } catch {}
  }

  console.log('');
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'high': return kleur.red;
    case 'medium': return kleur.yellow;
    case 'low': return kleur.blue;
    default: return kleur.gray;
  }
}

async function loadManifest(projectDir) {
  try {
    return JSON.parse(await fs.readFile(path.join(projectDir, '.hojai', 'manifest.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Main function: Run evolution
 */
export async function runEvolve({ args = [], flags = {} } = {}) {
  const subcommand = args[0];

  if (subcommand === 'help' || !subcommand || flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai evolve') + ' [--project=<dir>] [--auto]');
    console.log('  ' + kleur.cyan('npx hojai evolve dashboard') + ' [--project=<dir>]');
    console.log('  ' + kleur.cyan('npx hojai evolve history') + ' [--project=<dir>]');
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --project=<dir>    Project directory (default: current)');
    console.log('  --auto             Apply improvements automatically (no prompts)');
    console.log('  --schedule=<freq>  Evolution schedule (daily, weekly, monthly)');
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai evolve --project=tradeflow --auto');
    console.log('  npx hojai evolve dashboard --project=tradeflow');
    console.log('  npx hojai evolve history');
    return;
  }

  const projectDir = flags.project || flags.p || process.cwd();

  if (subcommand === 'dashboard') {
    return showDashboard(projectDir);
  }

  if (subcommand === 'history') {
    // Show history
    const historyDir = path.join(projectDir, CONFIG.storageDir, 'history');
    try {
      const files = await fs.readdir(historyDir);
      const jsonFiles = files.filter(f => f !== 'index.json' && f.endsWith('.json'));
      console.log(kleur.bold('Evolution History:'));
      console.log('');
      for (const file of jsonFiles.reverse()) {
        const data = JSON.parse(await fs.readFile(path.join(historyDir, file), 'utf8'));
        console.log(`  ${new Date(data.appliedAt).toISOString()}`);
        console.log(`    Applied: ${data.results?.filter(r => r.success).length || 0} improvements`);
        console.log(`    Issues found: ${data.analysis?.issues?.length || 0}`);
        console.log('');
      }
    } catch {
      console.log(kleur.yellow('No evolution history found.'));
    }
    return;
  }

  // Run evolution
  console.log(kleur.cyan('▸ Starting evolution…'));
  console.log(kleur.gray(`  Project: ${projectDir}`));
  console.log(kleur.gray(`  Schedule: ${CONFIG.schedule}`));
  console.log('');

  // 1. Analyze project
  const analysis = await analyzeProject(projectDir);

  console.log(kleur.green('▸ Analysis complete:'));
  console.log(`  Issues found: ${analysis.issues.length}`);
  for (const issue of analysis.issues) {
    console.log(`    [${getSeverityColor(issue.severity)(issue.severity.toUpperCase())}] ${issue.message}`);
  }
  console.log('');

  if (analysis.issues.length === 0) {
    console.log(kleur.green('✓ No issues found. Your project is in great shape!'));
    return;
  }

  // 2. Generate improvements
  const improvements = await generateImprovements(analysis);
  console.log('');

  // 3. Apply improvements (with approval)
  const auto = flags.auto || flags.a || CONFIG.auto;
  const results = await applyImprovements(projectDir, improvements, auto);

  // 4. Save history
  const entry = await saveEvolutionHistory(projectDir, analysis, improvements, results);

  // 5. Show results
  console.log('');
  console.log(kleur.bold('Evolution complete!'));
  console.log(`  Applied: ${results.filter(r => r.success).length} improvements`);
  console.log(`  Failed: ${results.filter(r => !r.success).length} improvements`);
  console.log(kleur.gray(`  Evolution ID: ${entry.id}`));

  return entry;
}
