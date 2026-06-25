import chalk from 'chalk';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';
import inquirer from 'inquirer';
import { exec, execQuiet } from '../utils.js';

interface BackupOptions {
  output?: string;
  encrypt: boolean;
}

export async function backup(options: BackupOptions) {
  const runtimeDir = process.env.NEXHA_RUNTIME_DIR ?? process.cwd();
  const outDir = options.output ?? './nexha-backups';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `nexha-backup-${timestamp}`;
  const backupDir = resolve(outDir, backupName);

  console.log(chalk.blue('╔══════════════════════════════════════════════╗'));
  console.log(chalk.blue('║   Nexha OS — Backup                         ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════╝'));

  // 1. Create backup dir
  mkdirSync(backupDir, { recursive: true });
  console.log(`  Backup dir: ${backupDir}`);

  // 2. Dump Docker volumes
  console.log(chalk.blue('[1/4] Dumping Docker volumes...'));
  const volumes = ['nexha-data', 'nexha-logs', 'nexha-certs'];
  for (const vol of volumes) {
    if (execQuiet(`docker volume inspect ${vol} > /dev/null 2>&1`)) {
      const volDir = resolve(backupDir, `volume-${vol}`);
      mkdirSync(volDir, { recursive: true });
      try {
        exec(`docker run --rm -v ${vol}:/src -v ${volDir}:/dst alpine tar czf /dst/contents.tar.gz -C /src .`);
        console.log(`  ${chalk.green('✓')} ${vol} → volume-${vol}/contents.tar.gz`);
      } catch {
        console.log(`  ${chalk.yellow('⚠')} ${vol} dump failed (volume may be empty)`);
      }
    } else {
      console.log(`  ${chalk.gray('-')} ${vol} (not found, skipping)`);
    }
  }

  // 3. Config files
  console.log(chalk.blue('[2/4] Backing up config files...'));
  const configFiles = ['.env', 'docker-compose.yml', 'docker-compose.lite.yml', 'docker-compose.standard.yml', 'docker-compose.enterprise.yml'];
  for (const f of configFiles) {
    const src = resolve(runtimeDir, f);
    if (existsSync(src)) {
      exec(`cp "${src}" "${backupDir}/${basename(f)}"`);
      console.log(`  ${chalk.green('✓')} ${f}`);
    }
  }

  // 4. Metadata
  console.log(chalk.blue('[3/4] Writing metadata...'));
  const meta = {
    version: 'nexha-os-1.5.0',
    timestamp: new Date().toISOString(),
    runtimeDir,
    volumes,
    hostname: process.env.HOSTNAME ?? process.env.COMPUTERNAME ?? 'unknown',
  };
  writeFileSync(resolve(backupDir, 'backup-meta.json'), JSON.stringify(meta, null, 2));
  console.log(`  ${chalk.green('✓')} backup-meta.json`);

  // 5. Archive
  console.log(chalk.blue('[4/4] Creating archive...'));
  const archivePath = resolve(outDir, `${backupName}.tar.gz`);
  exec(`tar czf "${archivePath}" -C "${outDir}" "${backupName}"`);
  exec(`rm -rf "${backupDir}"`);
  const size = exec(`du -sh "${archivePath}" | cut -f1`);
  console.log(`  ${chalk.green('✓')} ${archivePath} (${size.trim()})`);

  if (options.encrypt) {
    const { passphrase } = await inquirer.prompt([
      { type: 'password', name: 'passphrase', message: 'Encryption passphrase:' },
    ]);
    const encPath = archivePath + '.gpg';
    try {
      exec(`gpg --symmetric --yes --output "${encPath}" "${archivePath}"`);
      exec(`rm "${archivePath}"`);
      console.log(`  ${chalk.green('✓')} Encrypted: ${encPath}`);
    } catch {
      console.log(`  ${chalk.yellow('⚠')} gpg not available — backup not encrypted`);
    }
  }

  console.log('');
  console.log(chalk.green('╔══════════════════════════════════════════════╗'));
  console.log(chalk.green('║   Backup complete!                           ║'));
  console.log(chalk.green(`║  File: ${archivePath.split('/').pop()?.padEnd(31)}║`));
  console.log(chalk.green('║  Restore: tar xzf <file> -C /path/to/runtime  ║'));
  console.log(chalk.green('╚══════════════════════════════════════════════╝'));
}
