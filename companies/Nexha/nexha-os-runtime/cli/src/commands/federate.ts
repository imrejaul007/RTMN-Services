import chalk from 'chalk';
import axios from 'axios';
import { loadEnv } from '../utils.js';

interface FederateOptions {
  capabilities?: string;
  'data-sharing'?: string;
}

export async function federate(targetId: string, options: FederateOptions) {
  const env = loadEnv(process.env.NEXHA_RUNTIME_DIR ?? process.cwd());
  const fedUrl = env.FEDERATION_URL ?? 'https://federation.nexha.io';

  const { capabilities = 'general', 'data-sharing': dataSharing = 'aggregated' } = options;
  const myId = env.NEXHA_ID ?? '';

  console.log(chalk.blue('╔══════════════════════════════════════════════╗'));
  console.log(chalk.blue('║   Nexha OS — Initiate Federation Handshake ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════╝'));

  if (!myId) {
    console.log(chalk.red('✗ NEXHA_ID not found in .env.'));
    console.log(chalk.yellow('  Run "nexha register" first to get your Nexha ID.'));
    process.exit(1);
  }

  const payload = {
    initiatorId: myId,
    targetId,
    terms: {
      mutualCapabilities: capabilities.split(',').map(c => c.trim()),
      dataSharing,
      paymentTerms: 'standard',
    },
  };

  console.log(`  My Nexha:   ${myId}`);
  console.log(`  Target:     ${targetId}`);
  console.log(`  Capabilities: ${capabilities}`);
  console.log('');

  try {
    const resp = await axios.post(`${fedUrl}/api/v1/handshakes`, payload, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    const handshakeId = resp.data?.data?.id ?? 'N/A';
    console.log('');
    console.log(chalk.green('╔══════════════════════════════════════════════╗'));
    console.log(chalk.green('║   Handshake initiated!                       ║'));
    console.log(chalk.green('╠══════════════════════════════════════════════╣'));
    console.log(chalk.green(`║  Handshake ID: ${String(handshakeId).padEnd(21)}║`));
    console.log(chalk.green('║  Status:       pending (waiting for peer)   ║'));
    console.log(chalk.green('╠══════════════════════════════════════════════╣'));
    console.log(chalk.green('║  Check status:                              ║'));
    console.log(chalk.green(`║  curl ${fedUrl}/api/v1/handshakes/${handshakeId}  ║`));
    console.log(chalk.green('╚══════════════════════════════════════════════╝'));
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    console.log(chalk.red('✗ Handshake failed:'));
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(chalk.red(`  ${error.message ?? String(err)}`));
    }
    process.exit(1);
  }
}
