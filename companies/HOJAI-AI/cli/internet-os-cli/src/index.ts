#!/usr/bin/env node
/**
 * HOJAI InternetOS CLI
 *
 * Usage:
 *   hojai-internet <command> [options]
 *
 * Commands:
 *   status              Show service health and stats
 *   actors              List all available actors
 *   run <actor-id>      Run an actor
 *   research <type>     Run a research agent (market|competitor|procurement)
 *   watch <url>         Create a watcher
 *   watchers            List watchers
 *   schedule            List schedules
 *   auth                Get JWT token
 *   config              Show configuration
 *   hub                 Check RTMN Hub connectivity
 *
 * Examples:
 *   hojai-internet status
 *   hojai-internet run github --action search_repos --params '{"q":"hojai"}'
 *   hojai-internet research market --input restaurants
 *   hojai-internet watch https://example.com --type price
 */

const API_URL = process.env.INTERNETOS_URL || 'http://localhost:4595';
const HUB_URL = process.env.RTMN_HUB_URL || 'http://localhost:4399';

// Colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg: string) => console.log(`${c.blue}ℹ${c.reset} ${msg}`),
  success: (msg: string) => console.log(`${c.green}✓${c.reset} ${msg}`),
  error: (msg: string) => console.error(`${c.red}✗${c.reset} ${msg}`),
  warn: (msg: string) => console.log(`${c.yellow}⚠${c.reset} ${msg}`),
  title: (msg: string) => console.log(`\n${c.bold}${c.magenta}${msg}${c.reset}`),
};

async function fetchJson(url: string, options: any = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': process.env.INTERNAL_TOKEN || 'webhook-bus-internal-token',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text.substring(0, 200)}`);
  }
}

function showHelp() {
  console.log(`
${c.bold}${c.cyan}HOJAI InternetOS CLI${c.reset}
Web intelligence from your terminal

${c.bold}Usage:${c.reset}
  hojai-internet <command> [options]

${c.bold}Commands:${c.reset}
  status              Show service health and stats
  actors              List all available actors
  run <id> [params]   Run an actor (pass JSON params or use --params)
  research <type>     Run research (market|competitor|procurement)
  watch <url>         Create a continuous watcher
  watchers            List watchers
  schedule            List schedules
  auth                Get JWT auth token
  config              Show current config
  hub                 Check RTMN Hub connectivity

${c.bold}Options:${c.reset}
  --url <url>         Override API URL (default: http://localhost:4595)
  --action <act>      Actor action (e.g., search_repos)
  --params <json>     JSON params
  --input <text>      Input keyword
  --type <type>       Watcher type (price|review|competitor|job|news)
  --interval <ms>     Watcher interval (ms)
  --help              Show this help

${c.bold}Examples:${c.reset}
  ${c.gray}hojai-internet status${c.reset}
  ${c.gray}hojai-internet actors${c.reset}
  ${c.gray}hojai-internet run github --action search_repos --params '{"q":"hojai-ai"}'${c.reset}
  ${c.gray}hojai-internet research market --input restaurants --input Bangalore${c.reset}
  ${c.gray}hojai-internet watch https://example.com/products --type price --interval 3600000${c.reset}
`);
}

// ====================== Commands ======================

async function statusCommand(apiUrl: string) {
  log.title('InternetOS Status');

  const health = await fetchJson(`${apiUrl}/health`).catch((e) => ({ error: e.message }));
  console.log(`${c.bold}API Server:${c.reset} ${apiUrl}`);
  console.log(`  Status: ${health.status === 'healthy' ? c.green + '● Healthy' : c.red + '● Unhealthy'}${c.reset}`);
  if (health.timestamp) console.log(`  Last check: ${new Date(health.timestamp).toLocaleString()}`);

  const stats = await fetchJson(`${apiUrl}/api/stats`).catch((e) => ({ error: e.message }));
  if (!stats.error) {
    console.log(`\n${c.bold}Statistics:${c.reset}`);
    if (stats.actors) console.log(`  Actors: ${stats.actors.count || stats.actors.totalRuns || 0} loaded`);
    if (stats.watchers) console.log(`  Watchers: ${stats.watchers.count || 0} active`);
  }

  // Try RTMN Hub
  const hubHealth = await fetchJson(`${HUB_URL}/health`).catch(() => null);
  if (hubHealth) {
    console.log(`\n${c.bold}RTMN Hub:${c.reset} ${HUB_URL}`);
    console.log(`  Status: ${c.green}● Connected${c.reset}`);
    console.log(`  Registered services: ${hubHealth.registeredServices || '?'}`);
  } else {
    console.log(`\n${c.bold}RTMN Hub:${c.reset} ${HUB_URL}`);
    console.log(`  Status: ${c.gray}● Not reachable (use --url to check anyway)${c.reset}`);
  }
}

async function actorsCommand(apiUrl: string) {
  log.title('Available Actors');

  const data = await fetchJson(`${apiUrl}/api/actors`);
  const actors = data.actors || [];

  if (actors.length === 0) {
    log.warn('No actors loaded');
    return;
  }

  console.log(`${c.bold}${actors.length} actors available:${c.reset}\n`);

  // Table header
  console.log(
    `${c.gray}${'ID'.padEnd(20)} ${'NAME'.padEnd(30)} ${'CAPABILITIES'.padEnd(30)} VERSION${c.reset}`
  );
  console.log(c.gray + '─'.repeat(95) + c.reset);

  for (const actor of actors) {
    const caps = (actor.capabilities || []).slice(0, 3).join(', ');
    console.log(
      `${actor.id.padEnd(20)} ${(actor.name || '').substring(0, 28).padEnd(30)} ${caps.substring(0, 28).padEnd(30)} ${actor.version || ''}`
    );
  }

  console.log(`\n${c.bold}Run an actor:${c.reset}`);
  console.log(`  ${c.cyan}hojai-internet run <id> --action <action> --params '<json>'${c.reset}`);
}

async function runCommand(actorId: string, args: any, apiUrl: string) {
  if (!actorId) {
    log.error('Actor ID is required');
    return;
  }

  const action = args.action || 'test';
  const params = args.params ? (typeof args.params === 'string' ? JSON.parse(args.params) : args.params) : {};

  log.info(`Running actor: ${actorId} (action: ${action})`);

  const result = await fetchJson(`${apiUrl}/api/actors/${actorId}/run`, {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });

  if (result.success) {
    log.success('Success!');
    console.log(JSON.stringify(result, null, 2));
  } else {
    log.error(`Failed: ${result.error}`);
    if (result.error?.includes('env var') || result.error?.includes('API')) {
      log.warn('You may need to set an API key. See the actor docs.');
    }
  }
}

async function researchCommand(type: string, args: any, apiUrl: string) {
  if (!type || !['market', 'competitor', 'procurement'].includes(type)) {
    log.error('Type must be: market, competitor, or procurement');
    return;
  }

  if (!args.input) {
    log.error('--input <keyword> is required');
    return;
  }

  log.info(`Running ${type} research for: ${args.input}`);

  const body: any = {};
  if (type === 'market') {
    body.industry = args.input[0] || args.input;
    if (args.input[1]) body.city = args.input[1];
  } else if (type === 'competitor') {
    body.competitor = args.input[0] || args.input;
    if (args.input[1]) body.city = args.input[1];
  } else if (type === 'procurement') {
    body.category = args.input[0] || args.input;
    if (args.input[1]) body.city = args.input[1];
  }

  const result = await fetchJson(`${apiUrl}/api/research/${type}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  log.success('Research complete!');
  console.log(JSON.stringify(result, null, 2));
}

async function watchCommand(url: string, args: any, apiUrl: string) {
  if (!url) {
    log.error('URL is required');
    return;
  }

  const type = args.type || 'price';
  const interval = parseInt(args.interval || '3600000', 10);
  const id = `cli-watcher-${Date.now()}`;

  log.info(`Creating watcher for: ${url}`);

  const result = await fetchJson(`${apiUrl}/api/watchers`, {
    method: 'POST',
    body: JSON.stringify({
      id,
      name: id,
      url,
      type,
      interval,
      selector: args.selector,
    }),
  });

  log.success(`Watcher created: ${id}`);
  console.log(JSON.stringify(result, null, 2));
}

async function watchersCommand(apiUrl: string) {
  log.title('Watchers');

  const data = await fetchJson(`${apiUrl}/api/watchers`);
  const watchers = data.watchers || [];

  if (watchers.length === 0) {
    log.info('No watchers configured');
    return;
  }

  for (const w of watchers) {
    console.log(`${c.cyan}${w.id}${c.reset} → ${w.url}`);
    console.log(`  Type: ${w.type} | Interval: ${w.interval}ms`);
    console.log('');
  }
}

async function scheduleCommand(apiUrl: string) {
  log.title('Schedules');

  const data = await fetchJson(`${apiUrl}/api/scheduler/`);
  const schedules = data.schedules || [];

  if (schedules.length === 0) {
    log.info('No schedules configured');
    return;
  }

  for (const s of schedules) {
    console.log(`${c.cyan}${s.id}${c.reset} [${s.enabled ? c.green + 'ON' : c.gray + 'OFF'}${c.reset}]`);
    console.log(`  Cron: ${s.cron} | Agent: ${s.agentType}`);
    console.log(`  Runs: ${s.runCount || 0}`);
    console.log('');
  }
}

async function authCommand(args: any, apiUrl: string) {
  log.info('Generating JWT token...');

  const body = {
    userId: args.user || 'cli-user',
    scopes: (args.scopes || 'read,write').split(','),
    expiresIn: args.expiresIn || '7d',
  };

  const result = await fetchJson(`${apiUrl}/api/auth/token`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (result.token) {
    log.success('Token generated!');
    console.log(`\n${c.bold}Token:${c.reset}`);
    console.log(result.token);
    console.log(`\n${c.gray}Expires in: ${result.expiresIn}${c.reset}`);
    console.log(`\n${c.bold}Use as:${c.reset}`);
    console.log(`  ${c.cyan}Authorization: Bearer ${result.token.substring(0, 30)}...${c.reset}`);
    console.log(`\n${c.bold}Save to .env:${c.reset}`);
    console.log(`  ${c.gray}JWT_TOKEN="${result.token}"${c.reset}`);
  } else {
    log.error('Failed to generate token');
    console.log(result);
  }
}

async function hubCommand() {
  log.title('RTMN Hub Connectivity');

  const hub = await fetchJson(`${HUB_URL}/health`).catch((e) => null);
  if (!hub) {
    log.error(`Hub not reachable at ${HUB_URL}`);
    return;
  }

  log.success(`Hub is ${hub.status}`);
  console.log(`\n${c.bold}URL:${c.reset} ${HUB_URL}`);
  console.log(`${c.bold}Version:${c.reset} ${hub.version || '?'}`);
  console.log(`${c.bold}Services registered:${c.reset} ${hub.registeredServices || '?'}`);

  // Test InternetOS routes through the hub
  console.log(`\n${c.bold}InternetOS routes through Hub:${c.reset}`);
  const routes = [
    { path: '/api/internet-os/actors', desc: 'List actors' },
    { path: '/api/internet-os/api/stats', desc: 'Get stats' },
    { path: '/api/watchers', desc: 'Watchers (alias)' },
    { path: '/api/research', desc: 'Research (alias)' },
    { path: '/api/scheduler', desc: 'Scheduler (alias)' },
  ];

  for (const r of routes) {
    try {
      const res = await fetchJson(`${HUB_URL}${r.path}`);
      console.log(`  ${c.green}✓${c.reset} ${r.path} — ${r.desc}`);
    } catch (e) {
      console.log(`  ${c.red}✗${c.reset} ${r.path} — ${r.desc}`);
    }
  }
}

async function configCommand() {
  log.title('InternetOS CLI Configuration');

  console.log(`${c.bold}API URL:${c.reset} ${API_URL}`);
  console.log(`${c.bold}Hub URL:${c.reset} ${HUB_URL}`);
  console.log(`${c.bold}Internal Token:${c.reset} ${process.env.INTERNAL_TOKEN ? '✓ set' : c.gray + 'not set'}${c.reset}`);
  console.log(`${c.bold}JWT Token:${c.reset} ${process.env.JWT_TOKEN ? '✓ set' : c.gray + 'not set'}${c.reset}`);
  console.log(`\n${c.bold}Environment Variables Used:${c.reset}`);
  console.log('  INTERNETOS_URL       API server URL');
  console.log('  RTMN_HUB_URL         RTMN Unified Hub URL');
  console.log('  INTERNAL_TOKEN       Internal service token');
  console.log('  JWT_TOKEN            JWT auth token');
}

// ====================== Argument Parser ======================

function parseArgs(argv: string[]): any {
  const args: any = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (key === 'help') {
        args.help = true;
      } else {
        const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
        args[key] = value;
        if (value !== true) i++;
      }
    } else if (!args._positional) {
      args._positional = [argv[i]];
    } else {
      args._positional.push(argv[i]);
    }
  }
  return args;
}

// ====================== Main ======================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || process.argv.length === 2) {
    showHelp();
    return;
  }

  // Use --url if provided to override default
  const apiUrl = args.url || process.env.INTERNETOS_URL || 'http://localhost:4595';

  const [command, ...rest] = args._positional || [];

  try {
    switch (command) {
      case 'status':
        await statusCommand(apiUrl);
        break;
      case 'actors':
        await actorsCommand(apiUrl);
        break;
      case 'run':
        await runCommand(rest[0], args, apiUrl);
        break;
      case 'research':
        await researchCommand(rest[0], args, apiUrl);
        break;
      case 'watch':
        await watchCommand(rest[0], args, apiUrl);
        break;
      case 'watchers':
        await watchersCommand(apiUrl);
        break;
      case 'schedule':
        await scheduleCommand(apiUrl);
        break;
      case 'auth':
        await authCommand(args, apiUrl);
        break;
      case 'config':
        await configCommand();
        break;
      case 'hub':
        await hubCommand();
        break;
      default:
        if (command) {
          log.error(`Unknown command: ${command}`);
        }
        showHelp();
    }
  } catch (error) {
    log.error((error as Error).message);
    if ((error as any).stack) {
      console.error(c.gray + (error as any).stack + c.reset);
    }
  }
}

main();