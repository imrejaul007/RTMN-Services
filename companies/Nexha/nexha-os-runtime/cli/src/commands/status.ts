import chalk from 'chalk';
import { exec, execQuiet, getDockerCommand, loadEnv, serviceHealth } from '../utils.js';

interface StatusOptions {
  watch: boolean;
  json: boolean;
}

const SERVICES = [
  { name: 'nexha-gateway', port: 5002, path: '/health' },
  { name: 'corp-id', port: 4702, path: '/health' },
  { name: 'memory-os', port: 4703, path: '/health' },
  { name: 'twinos-hub', port: 4705, path: '/health' },
  { name: 'sutar-gateway', port: 4140, path: '/health' },
  { name: 'sutar-trust-engine', port: 4291, path: '/api/v1/sada/status' },
  { name: 'sutar-contract-os', port: 4292, path: '/health' },
  { name: 'sutar-negotiation-engine', port: 4295, path: '/health' },
  { name: 'sutar-economy-os', port: 4294, path: '/health' },
  { name: 'business-directory', port: 4360, path: '/health' },
  { name: 'partner-graph', port: 4363, path: '/health' },
  { name: 'commerce-runtime', port: 4364, path: '/health' },
  { name: 'nexha-contract-network', port: 4289, path: '/health' },
  { name: 'nexha-compliance-network', port: 4290, path: '/health' },
  { name: 'nexha-payment-network', port: 4296, path: '/health' },
  { name: 'nexha-partner-network', port: 4297, path: '/health' },
  { name: 'capability-os', port: 4270, path: '/health' },
  { name: 'acp-messaging', port: 4340, path: '/health' },
  { name: 'agent-marketplace', port: 4250, path: '/' },
  { name: 'mission-planner', port: 4362, path: '/health' },
];

export async function status(options: StatusOptions) {
  const { watch, json } = options;
  const runtimeDir = process.env.NEXHA_RUNTIME_DIR ?? process.cwd();
  const dc = getDockerCommand();

  const doCheck = async () => {
    const results = SERVICES.map(svc => {
      const health = serviceHealth(runtimeDir, svc.port, svc.path);
      return { ...svc, ...health };
    });

    if (json) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), services: results }, null, 2));
      return;
    }

    console.clear();
    console.log(chalk.blue('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue(`║   Nexha OS — Status  (${new Date().toLocaleTimeString().padEnd(20)}║`));
    console.log(chalk.blue('╠══════════════════════════════════════════════════════════╣'));
    console.log(chalk.blue('║  Service               Port   Status     Latency         ║'));
    console.log(chalk.blue('╠══════════════════════════════════════════════════════════╣'));

    for (const svc of results) {
      const icon = svc.status === 'healthy' ? chalk.green('✓') : svc.code ? chalk.yellow('⚠') : chalk.red('✗');
      const statusTxt = svc.status === 'healthy' ? chalk.green('HEALTHY') : svc.code ? chalk.yellow(`DEG ${svc.code}`) : chalk.red('DOWN');
      const latencyTxt = svc.latency != null ? `${svc.latency}ms` : '—';
      const name = svc.name.padEnd(20);
      const port = String(svc.port).padStart(5);
      console.log(`║  ${name} ${port}   ${statusTxt.padEnd(8)} ${(latencyTxt + '      ').slice(0, 12)}║`);
    }
    console.log(chalk.blue('╚══════════════════════════════════════════════════════════╝'));

    // Docker compose status
    try {
      const ps = exec(`${dc} ps --format "{{.Name}}: {{.Status}}"`, runtimeDir);
      const lines = ps.split('\n').filter(Boolean);
      console.log(chalk.blue('\n  Docker containers:'));
      for (const line of lines) {
        const [name, ...rest] = line.split(': ');
        const statusStr = rest.join(': ');
        const running = statusStr.toLowerCase().includes('up');
        console.log(`  ${running ? chalk.green('●') : chalk.yellow('○')} ${name} ${chalk.gray(statusStr)}`);
      }
    } catch { /* no containers */ }

    const allHealthy = results.every(r => r.status === 'healthy');
    console.log('');
    console.log(allHealthy ? chalk.green('✓ All services healthy') : chalk.yellow('⚠ Some services need attention'));
  };

  if (watch) {
    console.log(chalk.yellow('Watch mode — press Ctrl+C to stop\n'));
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await doCheck();
      await new Promise(r => setTimeout(r, 15000));
    }
  } else {
    await doCheck();
  }
}
