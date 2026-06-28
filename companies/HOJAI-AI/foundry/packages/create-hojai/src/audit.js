#!/usr/bin/env node
/**
 * Audit Logs & Usage Analytics for HOJAI Studio
 *
 * Tracks and reports on project activity.
 * Used by: npx hojai audit [--project=<dir>]
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  auditDir: process.env.HOJAI_AUDIT_DIR || './.hojai/audit',
  eventsDir: process.env.HOJAI_EVENTS_DIR || './.hojai/events',
  retentionDays: 90,
};

/**
 * Log an event
 */
async function logEvent(event, data = {}) {
  const projectDir = process.cwd();
  const eventDir = path.join(projectDir, CONFIG.eventsDir);
  await fs.mkdir(eventDir, { recursive: true });

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    event,
    timestamp: new Date().toISOString(),
    ...data
  };

  const date = new Date().toISOString().split('T')[0];
  const file = path.join(eventDir, `${date}.jsonl`);

  await fs.appendFile(file, JSON.stringify(entry) + '\n', 'utf8');

  return entry;
}

/**
 * Get audit logs
 */
async function getAuditLogs(options = {}) {
  const projectDir = options.project || process.cwd();
  const auditDir = path.join(projectDir, CONFIG.auditDir);

  let logs = [];

  try {
    const files = await fs.readdir(auditDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(auditDir, file), 'utf8');
        const entries = content.split('\n').filter(Boolean).map(line => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
        logs.push(...entries);
      } catch {}
    }
  } catch {
    // No audit logs yet
  }

  // Filter by date range if specified
  if (options.from) {
    const fromDate = new Date(options.from);
    logs = logs.filter(l => new Date(l.timestamp) >= fromDate);
  }
  if (options.to) {
    const toDate = new Date(options.to);
    logs = logs.filter(l => new Date(l.timestamp) <= toDate);
  }

  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Get usage statistics
 */
async function getUsageStats(options = {}) {
  const projectDir = options.project || process.cwd();
  const stats = {
    apiCalls: { total: 0, byEndpoint: {}, byDay: {} },
    deploys: { total: 0, success: 0, failed: 0, byDay: {} },
    agents: { invocations: {}, errors: {} },
    bandwidth: { total: 0, byDay: {} },
    errors: { total: 0, byType: {} },
    period: options.period || '7d'
  };

  const logs = await getAuditLogs(options);

  for (const log of logs) {
    // API calls
    if (log.event === 'api_call') {
      stats.apiCalls.total++;
      stats.apiCalls.byEndpoint[log.endpoint] = (stats.apiCalls.byEndpoint[log.endpoint] || 0) + 1;

      const day = log.timestamp.split('T')[0];
      stats.apiCalls.byDay[day] = (stats.apiCalls.byDay[day] || 0) + 1;
    }

    // Deploys
    if (log.event === 'deploy') {
      stats.deploys.total++;
      if (log.status === 'success') stats.deploys.success++;
      else if (log.status === 'failed') stats.deploys.failed++;

      const day = log.timestamp.split('T')[0];
      stats.deploys.byDay[day] = (stats.deploys.byDay[day] || 0) + 1;
    }

    // Agent invocations
    if (log.event === 'agent_invocation') {
      stats.agents.invocations[log.agent] = (stats.agents.invocations[log.agent] || 0) + 1;
      if (log.error) {
        stats.agents.errors[log.agent] = (stats.agents.errors[log.agent] || 0) + 1;
      }
    }

    // Bandwidth
    if (log.event === 'api_call' && log.bytes) {
      stats.bandwidth.total += log.bytes;
      const day = log.timestamp.split('T')[0];
      stats.bandwidth.byDay[day] = (stats.bandwidth.byDay[day] || 0) + log.bytes;
    }

    // Errors
    if (log.event === 'error') {
      stats.errors.total++;
      stats.errors.byType[log.type] = (stats.errors.byType[log.type] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Generate audit report
 */
async function generateReport(options = {}) {
  const projectDir = options.project || process.cwd();
  const stats = await getUsageStats(options);
  const logs = await getAuditLogs({ ...options, limit: 100 });

  console.log(kleur.bold('HOJAI Studio - Usage Audit Report'));
  console.log(kleur.gray('═'.repeat(60)));
  console.log('');
  console.log(`Period: ${stats.period}`);
  console.log(`Generated: ${new Date().toLocaleString()}`);
  console.log('');

  // API Calls
  console.log(kleur.bold('API Usage'));
  console.log(kleur.gray('─'.repeat(40)));
  console.log(`  Total calls: ${stats.apiCalls.total.toLocaleString()}`);
  if (stats.apiCalls.total > 0) {
    const topEndpoints = Object.entries(stats.apiCalls.byEndpoint)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log('  Top endpoints:');
    for (const [endpoint, count] of topEndpoints) {
      console.log(`    ${endpoint}: ${count.toLocaleString()}`);
    }
  }
  console.log('');

  // Deploys
  console.log(kleur.bold('Deployments'));
  console.log(kleur.gray('─'.repeat(40)));
  console.log(`  Total: ${stats.deploys.total}`);
  console.log(`  Success: ${kleur.green(stats.deploys.success)}`);
  console.log(`  Failed: ${stats.deploys.failed > 0 ? kleur.red(stats.deploys.failed) : 0}`);
  console.log('');

  // Agents
  if (Object.keys(stats.agents.invocations).length > 0) {
    console.log(kleur.bold('AI Agent Activity'));
    console.log(kleur.gray('─'.repeat(40)));
    const topAgents = Object.entries(stats.agents.invocations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [agent, count] of topAgents) {
      const errors = stats.agents.errors[agent] || 0;
      const errorStr = errors > 0 ? ` ${kleur.red(`(${errors} errors)`)}` : '';
      console.log(`  ${agent}: ${count.toLocaleString()} invocations${errorStr}`);
    }
    console.log('');
  }

  // Errors
  if (stats.errors.total > 0) {
    console.log(kleur.bold('Errors'));
    console.log(kleur.gray('─'.repeat(40)));
    console.log(`  Total: ${kleur.red(stats.errors.total)}`);
    const topErrors = Object.entries(stats.errors.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [type, count] of topErrors) {
      console.log(`    ${type}: ${count}`);
    }
    console.log('');
  }

  // Recent Activity
  console.log(kleur.bold('Recent Activity'));
  console.log(kleur.gray('─'.repeat(40)));
  const recentLogs = logs.slice(0, 10);
  if (recentLogs.length === 0) {
    console.log('  No recent activity');
  } else {
    for (const log of recentLogs) {
      const time = new Date(log.timestamp).toLocaleString();
      const eventStr = log.event.replace(/_/g, ' ');
      console.log(`  ${kleur.gray(time)} ${eventStr}`);
    }
  }
  console.log('');

  return { stats, logs };
}

/**
 * Export audit logs
 */
async function exportLogs(options = {}) {
  const format = options.format || 'json';
  const logs = await getAuditLogs(options);
  const output = options.output || `audit-export-${Date.now()}.${format}`;

  let content = '';

  if (format === 'csv') {
    const headers = ['timestamp', 'event', 'user', 'resource', 'status', 'duration'];
    content = headers.join(',') + '\n';
    for (const log of logs) {
      const row = headers.map(h => {
        const val = log[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
      content += row + '\n';
    }
  } else {
    content = JSON.stringify(logs, null, 2);
  }

  await fs.writeFile(output, content, 'utf8');
  console.log(kleur.green(`✔ Exported ${logs.length} entries to ${output}`));

  return { file: output, count: logs.length };
}

/**
 * Clean old logs
 */
async function cleanOldLogs(options = {}) {
  const projectDir = options.project || process.cwd();
  const auditDir = path.join(projectDir, CONFIG.auditDir);
  const eventsDir = path.join(projectDir, CONFIG.eventsDir);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.retentionDays);

  let cleaned = 0;
  let freedBytes = 0;

  for (const dir of [auditDir, eventsDir]) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.jsonl')) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);

          if (stat.mtime < cutoffDate) {
            freedBytes += stat.size;
            await fs.rm(filePath);
            cleaned++;
          }
        }
      }
    } catch {}
  }

  console.log(kleur.green(`✔ Cleaned ${cleaned} old log file(s)`));
  console.log(kleur.gray(`  Freed: ${(freedBytes / 1024 / 1024).toFixed(2)} MB`));

  return { cleaned, freedBytes };
}

/**
 * Show API key usage
 */
async function showAPIKeyUsage(options = {}) {
  const projectDir = options.project || process.cwd();
  const logs = await getAuditLogs(options);

  const keyUsage = {};

  for (const log of logs) {
    if (log.apiKey) {
      if (!keyUsage[log.apiKey]) {
        keyUsage[log.apiKey] = {
          calls: 0,
          lastUsed: null,
          endpoints: new Set(),
          errors: 0
        };
      }
      keyUsage[log.apiKey].calls++;
      if (!keyUsage[log.apiKey].lastUsed || log.timestamp > keyUsage[log.apiKey].lastUsed) {
        keyUsage[log.apiKey].lastUsed = log.timestamp;
      }
      if (log.endpoint) {
        keyUsage[log.apiKey].endpoints.add(log.endpoint);
      }
      if (log.status >= 400) {
        keyUsage[log.apiKey].errors++;
      }
    }
  }

  console.log(kleur.bold('API Key Usage'));
  console.log(kleur.gray('═'.repeat(60)));
  console.log('');

  const keys = Object.entries(keyUsage);
  if (keys.length === 0) {
    console.log('  No API key usage recorded');
  } else {
    for (const [key, usage] of keys) {
      const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
      const errorRate = usage.errors / usage.calls * 100;
      console.log(`  ${kleur.cyan(maskedKey)}`);
      console.log(`    Calls: ${usage.calls}`);
      console.log(`    Last used: ${new Date(usage.lastUsed).toLocaleString()}`);
      console.log(`    Endpoints: ${usage.endpoints.size}`);
      console.log(`    Error rate: ${errorRate > 5 ? kleur.red : kleur.green}(${errorRate.toFixed(1)}%)`);
      console.log('');
    }
  }

  return keyUsage;
}

/**
 * Main function
 */
export async function runAudit({ flags = {} } = {}) {
  const projectDir = flags.project || flags.p || process.cwd();

  if (flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai audit') + ' [--project=<dir>]');
    console.log('  ' + kleur.cyan('npx hojai audit report') + ' [--period=7d|30d|90d]');
    console.log('  ' + kleur.cyan('npx hojai audit export') + ' [--format=json|csv] [--output=<file>]');
    console.log('  ' + kleur.cyan('npx hojai audit keys'));
    console.log('  ' + kleur.cyan('npx hojai audit clean'));
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --project=<dir>    Project directory');
    console.log('  --period=<p>       Time period (7d, 30d, 90d)');
    console.log('  --format=<f>       Export format (json, csv)');
    console.log('  --output=<file>     Output file path');
    console.log('  --from=<date>      Start date (ISO format)');
    console.log('  --to=<date>        End date (ISO format)');
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai audit report --period=30d');
    console.log('  npx hojai audit export --format=csv --output=audit.csv');
    console.log('  npx hojai audit keys');
    console.log('  npx hojai audit clean');
    return;
  }

  const subcommand = flags._?.[0] || (flags.report ? 'report' : flags.export ? 'export' : flags.keys ? 'keys' : flags.clean ? 'clean' : 'report');

  if (subcommand === 'report') {
    const period = flags.period || '7d';
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const from = flags.from || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return generateReport({ project: projectDir, period, from });
  }

  if (subcommand === 'export') {
    return exportLogs({
      project: projectDir,
      format: flags.format || 'json',
      output: flags.output
    });
  }

  if (subcommand === 'keys') {
    return showAPIKeyUsage({ project: projectDir });
  }

  if (subcommand === 'clean') {
    return cleanOldLogs({ project: projectDir });
  }

  // Default: show report
  return generateReport({ project: projectDir, period: '7d' });
}
