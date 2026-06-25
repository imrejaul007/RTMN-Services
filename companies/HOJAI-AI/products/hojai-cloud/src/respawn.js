/**
 * HOJAI Cloud v1.2 — Auto-respawn module
 *
 * On boot, re-spawns all previously deployed backends.
 * This ensures that after a restart/crash, all deployments come back online.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

/**
 * Respawn all deployed backends from disk
 * @param {Map} deployments - In-memory deployment registry
 * @param {Map} portAssignments - Port to deploymentId mapping
 * @param {string} storageDir - Path to storage directory
 */
async function respawnAll(deployments, portAssignments, storageDir) {
  const spawned = [];
  const failed = [];

  for (const [deploymentId, deployment] of deployments) {
    if (deployment.status !== 'live' && deployment.status !== 'provisioning') {
      continue; // Skip non-live deployments
    }

    if (!deployment.port || !deployment.projectId) {
      continue; // Skip incomplete deployments
    }

    try {
      const projectDir = path.join(storageDir, deployment.projectId);
      const backendEntry = path.join(projectDir, 'apps', 'backend', 'src', 'index.js');

      if (!fs.existsSync(backendEntry)) {
        failed.push({ id: deploymentId, reason: 'no backend entry' });
        continue;
      }

      // Check if backend is already running
      const isRunning = await checkPort(deployment.port);
      if (isRunning) {
        console.log(`[hojai-cloud] deployment ${deployment.subdomain} already running on port ${deployment.port}`);
        continue;
      }

      // Spawn the backend
      const pid = spawnBackend(deployment);

      // Update deployment record
      deployment.pid = pid;
      deployment.status = 'starting';
      deployment.updatedAt = new Date().toISOString();

      // Track port assignment
      portAssignments.set(deployment.port, deploymentId);

      spawned.push({
        id: deploymentId,
        subdomain: deployment.subdomain,
        port: deployment.port,
        pid
      });

      console.log(`[hojai-cloud] respawned ${deployment.subdomain} (pid: ${pid}, port: ${deployment.port})`);

    } catch (err) {
      failed.push({ id: deploymentId, reason: err.message });
      console.error(`[hojai-cloud] failed to respawn ${deployment.subdomain}: ${err.message}`);
    }
  }

  return { spawned, failed };
}

/**
 * Spawn a backend process
 */
function spawnBackend(deployment) {
  const projectDir = path.join(
    process.env.HOJAI_CLOUD_STORAGE || path.join(__dirname, '..', '.storage'),
    deployment.projectId
  );

  const backendEntry = path.join(projectDir, 'apps', 'backend', 'src', 'index.js');

  const child = spawn('node', [backendEntry], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(deployment.port) },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (b) => process.stdout.write(`[${deployment.subdomain}] ${b}`));
  child.stderr.on('data', (b) => process.stderr.write(`[${deployment.subdomain}] ${b}`));
  child.unref();

  return child.pid;
}

/**
 * Check if a port is already in use
 */
function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const srv = net.createConnection({ host, port });
    srv.on('connect', () => {
      srv.destroy();
      resolve(true);
    });
    srv.on('error', () => resolve(false));
    srv.setTimeout(500, () => {
      srv.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for a backend to come up
 */
async function waitForBackend(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const ok = await checkPort(port);
    if (ok) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

/**
 * Update deployment status after respawn
 */
async function updateRespawnStatus(deployments, portAssignments) {
  for (const [deploymentId, deployment] of deployments) {
    if (deployment.status !== 'starting') continue;

    const isRunning = await checkPort(deployment.port);
    if (isRunning) {
      deployment.status = 'live';
      deployment.updatedAt = new Date().toISOString();
      console.log(`[hojai-cloud] ${deployment.subdomain} is live`);
    } else {
      deployment.status = 'unhealthy';
      deployment.updatedAt = new Date().toISOString();
      console.warn(`[hojai-cloud] ${deployment.subdomain} failed to come up`);
    }
  }
}

module.exports = {
  respawnAll,
  spawnBackend,
  checkPort,
  waitForBackend,
  updateRespawnStatus
};
