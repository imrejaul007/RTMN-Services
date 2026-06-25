import chalk from 'chalk';
import inquirer from 'inquirer';
import { exec, execQuiet, getDockerCommand } from '../utils.js';

interface DestroyOptions {
  force: boolean;
  keepData: boolean;
}

export async function destroy(options: DestroyOptions) {
  const runtimeDir = process.env.NEXHA_RUNTIME_DIR ?? process.cwd();
  const dc = getDockerCommand();

  console.log(chalk.red('╔══════════════════════════════════════════════╗'));
  console.log(chalk.red('║   Nexha OS — DESTROY                        ║'));
  console.log(chalk.red('╚══════════════════════════════════════════════╝'));

  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will remove ALL containers and' + (options.keepData ? '\nall container state. Data volumes will be preserved.' : '\nALL data (volumes, certs, .env). This cannot be undone.'),
        default: false,
      },
    ]);
    if (!confirm) {
      console.log('Cancelled.');
      return;
    }
  }

  console.log(chalk.blue('[1/2] Stopping containers...'));
  exec(`${dc} down${options.keepData ? '' : ' -v'}`, runtimeDir);
  console.log(`  ${chalk.green('✓')} Containers stopped${options.keepData ? '' : ' and volumes removed'}`);

  if (!options.keepData) {
    console.log(chalk.blue('[2/2] Removing generated files...'));
    execQuiet(`rm -f "${runtimeDir}/.env"`, runtimeDir);
    console.log(`  ${chalk.green('✓')} .env removed`);
  } else {
    console.log(chalk.blue('[2/2] Data volumes preserved (--keep-data)'));
  }

  console.log('');
  console.log(chalk.green('╔══════════════════════════════════════════════╗'));
  console.log(chalk.green('║   Nexha OS destroyed.                      ║'));
  console.log(chalk.green('║   Run: nexha init                           ║'));
  console.log(chalk.green('╚══════════════════════════════════════════════╝'));
}
