import chalk from 'chalk';
import { exec, getDockerCommand } from '../utils.js';

interface UpdateOptions {
  imagesOnly: boolean;
}

export async function update(options: UpdateOptions) {
  const runtimeDir = process.env.NEXHA_RUNTIME_DIR ?? process.cwd();
  const dc = getDockerCommand();

  console.log(chalk.blue('╔══════════════════════════════════════════════╗'));
  console.log(chalk.blue('║   Nexha OS — Update                         ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════╝'));

  console.log(chalk.blue('[1/2] Pulling latest source...'));
  try {
    exec('git pull origin main', runtimeDir);
    console.log(`  ${chalk.green('✓')} Source updated`);
  } catch {
    console.log(`  ${chalk.yellow('⚠')} Not a git repo or pull failed — skipping`);
  }

  console.log(chalk.blue('[2/2] Rebuilding images...'));
  try {
    exec(`${dc} build --pull`, runtimeDir);
    console.log(`  ${chalk.green('✓')} Images rebuilt`);
  } catch (err) {
    console.log(`  ${chalk.red('✗')} Build failed: ${String(err)}`);
    process.exit(1);
  }

  if (!options.imagesOnly) {
    console.log(chalk.blue('\nRestarting containers...'));
    exec(`${dc} up -d --remove-orphans`, runtimeDir);
    console.log(`  ${chalk.green('✓')} Containers restarted`);
  }

  console.log('');
  console.log(chalk.green('╔══════════════════════════════════════════════╗'));
  console.log(chalk.green('║   Nexha OS updated!                         ║'));
  console.log(chalk.green('║   Run: nexha status                         ║'));
  console.log(chalk.green('╚══════════════════════════════════════════════╝'));
}
