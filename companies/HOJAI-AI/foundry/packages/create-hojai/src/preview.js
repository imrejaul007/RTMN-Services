#!/usr/bin/env node
/**
 * Preview Environments for HOJAI Studio
 *
 * Creates preview environments for branches/PRs.
 * Used by: npx hojai preview [--branch=<name>]
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  portRange: { start: 5000, end: 5100 },
  baseUrl: process.env.HOJAI_PREVIEW_URL || 'https://preview.hojai.app',
  storageDir: process.env.HOJAI_PREVIEW_DIR || './.hojai/previews',
  maxPreviews: 5,
};

/**
 * Create a preview environment
 */
async function createPreview({ branch = 'preview', projectDir = process.cwd() } = {}) {
  console.log(kleur.cyan('▸ Creating preview environment…'));
  console.log(kleur.gray(`  Branch: ${branch}`));
  console.log('');

  // Load manifest
  const manifestPath = path.join(projectDir, '.hojai', 'manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    console.log(kleur.red('✖ Not a HOJAI project. Run from inside a scaffolded project.'));
    return { success: false, error: 'not_hojai_project' };
  }

  // Generate preview ID
  const previewId = generatePreviewId(branch);
  const previewDir = path.join(projectDir, CONFIG.storageDir, previewId);
  const port = await findAvailablePort();

  try {
    // 1. Create preview directory
    await fs.mkdir(previewDir, { recursive: true });

    // 2. Copy project files
    console.log(kleur.cyan('▸ Copying project files…'));
    await copyProjectFiles(projectDir, previewDir);

    // 3. Generate preview config
    const previewConfig = {
      id: previewId,
      branch,
      project: manifest.name,
      port,
      url: `${CONFIG.baseUrl}/${previewId}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      projectDir: previewDir
    };

    // 4. Save preview config
    await fs.writeFile(
      path.join(previewDir, 'preview.json'),
      JSON.stringify(previewConfig, null, 2)
    );

    // 5. Update index
    await updatePreviewIndex(projectDir, previewConfig);

    // 6. Start preview server
    console.log(kleur.cyan('▸ Starting preview server…'));
    const { spawn } = await import('node:child_process');
    const server = spawn('node', ['apps/backend/src/index.js'], {
      cwd: previewDir,
      env: { ...process.env, PORT: port.toString() },
      detached: true,
      stdio: 'ignore'
    });
    server.unref();

    // 7. Wait for server to start
    await waitForServer(port);

    console.log('');
    console.log(kleur.green('✔ Preview created!'));
    console.log('');
    console.log(kleur.bold('Preview Details:'));
    console.log(`  ${kleur.cyan('ID:')}     ${previewId}`);
    console.log(`  ${kleur.cyan('URL:')}     ${previewConfig.url}`);
    console.log(`  ${kleur.cyan('Port:')}    ${port}`);
    console.log(`  ${kleur.cyan('Branch:')} ${branch}`);
    console.log('');
    console.log(kleur.gray(`  Expires: ${new Date(previewConfig.expiresAt).toLocaleDateString()}`));
    console.log('');

    return { success: true, preview: previewConfig };

  } catch (error) {
    console.log(kleur.red(`✖ Preview creation failed: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * List active previews
 */
async function listPreviews(projectDir = process.cwd()) {
  console.log(kleur.bold('Active Previews'));
  console.log(kleur.gray('═'.repeat(60)));
  console.log('');

  const indexPath = path.join(projectDir, CONFIG.storageDir, 'index.json');
  let previews = [];

  try {
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    const now = Date.now();

    for (const previewId of index.previews || []) {
      try {
        const configPath = path.join(projectDir, CONFIG.storageDir, previewId, 'preview.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

        const expired = new Date(config.expiresAt) < new Date();
        const status = expired ? kleur.red('EXPIRED') : kleur.green('ACTIVE');

        console.log(`  ${kleur.bold(previewId)}`);
        console.log(`    URL:    ${config.url}`);
        console.log(`    Branch: ${config.branch}`);
        console.log(`    Port:   ${config.port}`);
        console.log(`    Status: ${status}`);
        console.log(`    Expires: ${new Date(config.expiresAt).toLocaleDateString()}`);
        console.log('');
      } catch {}
    }
  } catch {
    console.log(kleur.yellow('No previews found.'));
  }

  return previews;
}

/**
 * Delete a preview
 */
async function deletePreview(previewId, projectDir = process.cwd()) {
  console.log(kleur.cyan(`▸ Deleting preview ${previewId}…`));

  const previewDir = path.join(projectDir, CONFIG.storageDir, previewId);

  try {
    // Kill any running process
    const configPath = path.join(previewDir, 'preview.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    try {
      const { exec } = await import('node:child_process');
      exec(`lsof -ti:${config.port} | xargs kill 2>/dev/null || true`);
    } catch {}

    // Remove directory
    await fs.rm(previewDir, { recursive: true });

    // Update index
    await removeFromPreviewIndex(projectDir, previewId);

    console.log(kleur.green(`✔ Preview ${previewId} deleted`));
    return { success: true };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to delete preview: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Open preview in browser
 */
async function openPreview(previewId, projectDir = process.cwd()) {
  const configPath = path.join(projectDir, CONFIG.storageDir, previewId, 'preview.json');

  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

    if (new Date(config.expiresAt) < new Date()) {
      console.log(kleur.red('✖ Preview has expired'));
      return { success: false, error: 'expired' };
    }

    const { exec } = await import('node:child_process');

    if (process.platform === 'darwin') {
      exec(`open ${config.url}`);
    } else if (process.platform === 'win32') {
      exec(`start ${config.url}`);
    } else {
      exec(`xdg-open ${config.url}`);
    }

    console.log(kleur.green(`✔ Opening ${config.url}…`));
    return { success: true, url: config.url };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to open preview: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Helper functions
 */
function generatePreviewId(branch) {
  const sanitized = branch.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const timestamp = Date.now().toString(36);
  return `${sanitized}-${timestamp}`;
}

async function findAvailablePort() {
  const { exec } = await import('node:child_process');

  for (let port = CONFIG.portRange.start; port <= CONFIG.portRange.end; port++) {
    try {
      const result = await new Promise(resolve => {
        exec(`lsof -ti:${port}`, (err, stdout) => {
          resolve(!err && !stdout.trim());
        });
      });
      if (result) return port;
    } catch {}
  }

  throw new Error('No available ports in range');
}

async function copyProjectFiles(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    // Skip certain directories
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.hojai') {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyProjectFiles(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function waitForServer(port, maxWait = 10000) {
  const start = Date.now();
  const { exec } = await import('node:child_process');

  while (Date.now() - start < maxWait) {
    const result = await new Promise(resolve => {
      exec(`lsof -ti:${port}`, (err, stdout) => {
        resolve(!err && stdout.trim());
      });
    });

    if (result) return true;
    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Server failed to start');
}

async function updatePreviewIndex(projectDir, previewConfig) {
  const indexPath = path.join(projectDir, CONFIG.storageDir, 'index.json');
  await fs.mkdir(path.dirname(indexPath), { recursive: true });

  let index = { previews: [], updatedAt: new Date().toISOString() };
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch {}

  // Remove old previews if over limit
  while (index.previews.length >= CONFIG.maxPreviews) {
    const oldest = index.previews.shift();
    await deletePreview(oldest, projectDir);
  }

  index.previews.push(previewConfig.id);
  index.updatedAt = new Date().toISOString();

  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

async function removeFromPreviewIndex(projectDir, previewId) {
  const indexPath = path.join(projectDir, CONFIG.storageDir, 'index.json');

  try {
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    index.previews = index.previews.filter(id => id !== previewId);
    index.updatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch {}
}

/**
 * Main function
 */
export async function runPreview({ args = [], flags = {} } = {}) {
  const subcommand = args[0];

  if (subcommand === 'help' || !subcommand || flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai preview') + ' [--branch=<name>]');
    console.log('  ' + kleur.cyan('npx hojai preview list'));
    console.log('  ' + kleur.cyan('npx hojai preview delete <id>'));
    console.log('  ' + kleur.cyan('npx hojai preview open <id>'));
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --branch=<name>    Git branch name for the preview');
    console.log('  --project=<dir>    Project directory');
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai preview --branch=feature-new-ui');
    console.log('  npx hojai preview list');
    console.log('  npx hojai preview open abc123');
    console.log('  npx hojai preview delete abc123');
    return;
  }

  const projectDir = flags.project || flags.p || process.cwd();

  if (subcommand === 'list' || subcommand === 'ls') {
    return listPreviews(projectDir);
  }

  if (subcommand === 'delete' || subcommand === 'rm') {
    const previewId = args[1];
    if (!previewId) {
      console.log(kleur.red('✖ Preview ID required'));
      console.log(kleur.gray('  Usage: npx hojai preview delete <id>'));
      return;
    }
    return deletePreview(previewId, projectDir);
  }

  if (subcommand === 'open') {
    const previewId = args[1];
    if (!previewId) {
      console.log(kleur.red('✖ Preview ID required'));
      console.log(kleur.gray('  Usage: npx hojai preview open <id>'));
      return;
    }
    return openPreview(previewId, projectDir);
  }

  // Create preview
  const branch = flags.branch || flags.b || 'preview';
  return createPreview({ branch, projectDir });
}
