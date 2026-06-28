#!/usr/bin/env node
/**
 * Rollback functionality for HOJAI Studio
 *
 * Manages deployment rollback to previous versions.
 * Used by: npx hojai rollback [--deployment=<id>]
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  maxRollbacks: 5,
  storageDir: process.env.HOJAI_DEPLOY_DIR || './.hojai/deployments',
};

/**
 * List available deployments
 */
async function listDeployments() {
  const deployDir = path.resolve(CONFIG.storageDir);
  let deployments = [];

  try {
    const files = await fs.readdir(deployDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');

    for (const file of jsonFiles) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(deployDir, file), 'utf8'));
        deployments.push(data);
      } catch {}
    }
  } catch {
    console.log(kleur.yellow('No deployments found.'));
    return [];
  }

  return deployments.sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt));
}

/**
 * Get deployment by ID
 */
async function getDeployment(id) {
  const deployDir = path.resolve(CONFIG.storageDir);
  const file = path.join(deployDir, `${id}.json`);

  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Rollback to a specific deployment
 */
async function rollbackTo(deploymentId, options = {}) {
  console.log(kleur.cyan('▸ Initiating rollback…'));

  const deployment = await getDeployment(deploymentId);
  if (!deployment) {
    console.log(kleur.red(`✖ Deployment not found: ${deploymentId}`));
    return { success: false, error: 'not_found' };
  }

  console.log(kleur.gray(`  Deployment: ${deploymentId}`));
  console.log(kleur.gray(`  Deployed at: ${new Date(deployment.deployedAt).toLocaleString()}`));
  console.log(kleur.gray(`  URL: ${deployment.url || 'N/A'}`));
  console.log('');

  // Check if files exist
  if (!deployment.files || !deployment.filesDir) {
    console.log(kleur.red('✖ Deployment files not available for rollback'));
    console.log(kleur.gray('  Note: Only deployments with preserved files can be rolled back'));
    return { success: false, error: 'no_files' };
  }

  const projectDir = path.resolve(options.project || process.cwd());
  const backupDir = path.join(projectDir, '.hojai', 'backups', Date.now().toString());

  try {
    // 1. Backup current state
    console.log(kleur.cyan('▸ Backing up current state…'));
    await fs.mkdir(backupDir, { recursive: true });

    // Backup key files
    const keyFiles = ['apps/backend/src/index.js', 'apps/frontend/server.js', 'package.json'];
    for (const file of keyFiles) {
      const src = path.join(projectDir, file);
      try {
        await fs.copyFile(src, path.join(backupDir, file));
      } catch {}
    }
    console.log(kleur.green(`  ✓ Backup created: ${backupDir}`));

    // 2. Restore deployment files
    console.log(kleur.cyan('▸ Restoring deployment files…'));
    const filesDir = path.join(projectDir, deployment.filesDir);
    const files = await fs.readdir(filesDir);

    for (const file of files) {
      const src = path.join(filesDir, file);
      const dest = path.join(projectDir, file);
      await fs.copyFile(src, dest);
    }
    console.log(kleur.green(`  ✓ Restored ${files.length} files`));

    // 3. Update manifest
    const manifest = {
      ...deployment.manifest,
      rolledBackFrom: deploymentId,
      rolledBackAt: new Date().toISOString()
    };
    await fs.writeFile(
      path.join(projectDir, '.hojai', 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // 4. Record rollback
    const rollbackRecord = {
      id: Date.now().toString(),
      deploymentId,
      deployedAt: deployment.deployedAt,
      rolledBackAt: new Date().toISOString(),
      backupDir,
      success: true
    };

    const rollbackFile = path.join(projectDir, '.hojai', 'rollback.json');
    await fs.writeFile(rollbackFile, JSON.stringify(rollbackRecord, null, 2));

    console.log('');
    console.log(kleur.green('✔ Rollback complete!'));
    console.log(kleur.gray(`  Rolled back to: ${deploymentId}`));
    console.log(kleur.gray(`  Backup at: ${backupDir}`));
    console.log('');
    console.log(kleur.bold('Next steps:'));
    console.log(kleur.gray('  npm run dev   # Restart the app'));
    console.log(kleur.gray('  npm test      # Run tests'));

    return { success: true, deployment, rollbackRecord };

  } catch (error) {
    console.log(kleur.red(`✖ Rollback failed: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Show rollback history
 */
async function showHistory() {
  console.log(kleur.bold('Rollback History'));
  console.log(kleur.gray('═'.repeat(50)));
  console.log('');

  const rollbackFile = path.resolve('.hojai', 'rollback.json');

  try {
    const record = JSON.parse(await fs.readFile(rollbackFile, 'utf8'));
    console.log(`  Last rollback: ${new Date(record.rolledBackAt).toLocaleString()}`);
    console.log(`  Rolled back to: ${record.deploymentId}`);
    console.log(`  Deployed at: ${new Date(record.deployedAt).toLocaleString()}`);
    console.log(`  Backup at: ${record.backupDir}`);
  } catch {
    console.log(kleur.yellow('No rollback history.'));
  }
}

/**
 * Restore from backup
 */
async function restoreFromBackup(backupId) {
  const backupDir = path.resolve(`.hojai/backups/${backupId}`);

  try {
    await fs.access(backupDir);
  } catch {
    console.log(kleur.red(`✖ Backup not found: ${backupId}`));
    return { success: false };
  }

  const projectDir = process.cwd();
  const keyFiles = ['apps/backend/src/index.js', 'apps/frontend/server.js', 'package.json'];

  console.log(kleur.cyan('▸ Restoring from backup…'));

  for (const file of keyFiles) {
    const src = path.join(backupDir, file);
    const dest = path.join(projectDir, file);
    try {
      await fs.copyFile(src, dest);
      console.log(kleur.green(`  ✓ Restored: ${file}`));
    } catch {
      console.log(kleur.yellow(`  ⚠ Skipped: ${file}`));
    }
  }

  console.log(kleur.green('✔ Backup restored!'));

  return { success: true };
}

/**
 * Main function
 */
export async function runRollback({ flags = {} } = {}) {
  const deploymentId = flags.deployment || flags.d;
  const project = flags.project || flags.p;

  if (flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai rollback') + ' [--deployment=<id>] [--project=<dir>]');
    console.log('  ' + kleur.cyan('npx hojai rollback list'));
    console.log('  ' + kleur.cyan('npx hojai rollback history'));
    console.log('  ' + kleur.cyan('npx hojai rollback restore <backup-id>'));
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --deployment=<id>    Rollback to a specific deployment ID');
    console.log('  --project=<dir>      Project directory (default: current)');
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai rollback --deployment=abc123');
    console.log('  npx hojai rollback list');
    console.log('  npx hojai rollback restore 1234567890');
    return;
  }

  // List deployments
  if (!deploymentId && !flags.list && !flags.history && !flags.restore) {
    const deployments = await listDeployments();

    if (deployments.length === 0) {
      console.log(kleur.yellow('No deployments found.'));
      console.log(kleur.gray('  Deploy your project first using: npx hojai deploy'));
      return;
    }

    console.log(kleur.bold('Available Deployments'));
    console.log(kleur.gray('═'.repeat(60)));
    console.log('');
    console.log(`  ${kleur.bold('ID').padEnd(15)} ${kleur.bold('Date').padEnd(20)} ${kleur.bold('URL')}`);
    console.log('  ' + '─'.repeat(60));

    for (const dep of deployments.slice(0, 10)) {
      const date = new Date(dep.deployedAt).toLocaleString();
      console.log(`  ${dep.id.padEnd(15)} ${date.padEnd(20)} ${dep.url || 'N/A'}`);
    }

    console.log('');
    console.log(kleur.bold('To rollback:'));
    console.log(kleur.gray('  npx hojai rollback --deployment=<id>'));

    return deployments;
  }

  // List deployments explicitly
  if (flags.list) {
    const deployments = await listDeployments();
    console.log(kleur.bold(`${deployments.length} deployment(s) found`));
    for (const dep of deployments) {
      console.log(`  ${dep.id} - ${new Date(dep.deployedAt).toLocaleString()}`);
    }
    return deployments;
  }

  // Show history
  if (flags.history) {
    await showHistory();
    return;
  }

  // Restore from backup
  if (flags.restore) {
    return restoreFromBackup(flags.restore);
  }

  // Rollback to specific deployment
  if (deploymentId) {
    return rollbackTo(deploymentId, { project });
  }

  console.log(kleur.yellow('No deployment ID specified.'));
  console.log(kleur.gray('  Use: npx hojai rollback --deployment=<id>'));
}
