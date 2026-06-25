import chalk from 'chalk';
import axios from 'axios';
import { loadEnv } from '../utils.js';

interface RegisterOptions {
  url?: string;
  dryRun: boolean;
}

export async function register(options: RegisterOptions) {
  const env = loadEnv(process.env.NEXHA_RUNTIME_DIR ?? process.cwd());

  const fedUrl = options.url ?? env.FEDERATION_URL ?? 'https://federation.nexha.io';
  const name = env.NEXHA_NAME ?? 'Unnamed Nexha';
  const region = env.NEXHA_REGION ?? 'IN';
  const pubKey = env.NEXHA_PUBLIC_KEY ?? '';
  const email = env.NEXHA_CONTACT_EMAIL ?? 'admin@nexha.local';
  const categories = env.NEXHA_CATEGORIES ?? '["general"]';

  console.log(chalk.blue('╔══════════════════════════════════════════════╗'));
  console.log(chalk.blue('║   Nexha OS — Register with Federation      ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════╝'));

  if (!name || !region || !pubKey) {
    console.log(chalk.red('✗ Missing required .env variables:'));
    if (!name) console.log(chalk.red('  - NEXHA_NAME'));
    if (!region) console.log(chalk.red('  - NEXHA_REGION'));
    if (!pubKey) console.log(chalk.red('  - NEXHA_PUBLIC_KEY'));
    console.log(chalk.yellow('\nEdit .env first, then run: nexha register'));
    process.exit(1);
  }

  const payload = {
    name,
    description: 'Nexha OS runtime — registered via nexha-cli',
    region,
    contactEmail: email,
    publicKey: pubKey,
    categories: JSON.parse(categories),
    osVersion: 'nexha-os-1.5.0',
  };

  console.log(`  Federation: ${fedUrl}`);
  console.log(`  Name:       ${name}`);
  console.log(`  Region:     ${region}`);
  console.log(`  Public Key: ${pubKey.slice(0, 24)}...`);
  console.log('');

  if (options.dryRun) {
    console.log(chalk.yellow('  Dry-run — payload that would be sent:'));
    console.log(JSON.stringify(payload, null, 2));
    console.log(chalk.yellow('\n  Remove --dry-run to actually register.'));
    return;
  }

  console.log(chalk.blue('[1/1] Registering with federation...'));
  try {
    const resp = await axios.post(`${fedUrl}/api/v1/nexhas/join`, payload, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    const data = resp.data;
    const nexhaId = data?.data?.id ?? 'N/A';

    console.log('');
    console.log(chalk.green('╔══════════════════════════════════════════════╗'));
    console.log(chalk.green('║   Successfully joined the federation!       ║'));
    console.log(chalk.green('╠══════════════════════════════════════════════╣'));
    console.log(chalk.green(`║  Nexha ID: ${String(nexhaId).padEnd(25)}║`));
    console.log(chalk.green('║  Status:    observer (pending upgrade)      ║'));
    console.log(chalk.green('╠══════════════════════════════════════════════╣'));
    console.log(chalk.green('║  Next: nexha federate <peer-id>              ║'));
    console.log(chalk.green('╚══════════════════════════════════════════════╝'));
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.log(chalk.red(`✗ Registration failed:`));
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(chalk.red(`  ${error.message ?? String(err)}`));
    }
    process.exit(1);
  }
}
