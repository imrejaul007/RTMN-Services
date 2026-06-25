/**
 * Deploy Module — Deploy compiled project to HOJAI Cloud
 */

import { CompileState } from './compiler.js';

const HOJAI_CLOUD_URL = process.env.HOJAI_CLOUD_URL || 'http://localhost:4380';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || '';

/**
 * Deploy a compiled job to HOJAI Cloud
 */
export async function deployToCloud(job, jobs, updateJob) {
  const jobId = job.id;

  try {
    // Update state to deploying
    job.state = CompileState.DEPLOYING;
    job.progress = 95;
    job.progressMessage = 'Connecting to HOJAI Cloud...';
    updateJob(jobId, job);

    // Prepare files for deployment
    // Filter out large/binary files and node_modules
    const deployFiles = filterDeployFiles(job.files);

    // Count files
    const fileCount = Object.keys(deployFiles).length;
    job.progressMessage = `Deploying ${fileCount} files...`;
    updateJob(jobId, job);

    // Call HOJAI Cloud deploy API
    const deployRequest = {
      name: job.manifest.name,
      type: job.blueprint.config.type,
      manifest: job.manifest,
      runtime: 'node-express',
      files: deployFiles
    };

    job.progressMessage = 'Uploading to HOJAI Cloud...';
    updateJob(jobId, job);

    const headers = {
      'Content-Type': 'application/json'
    };

    if (HOJAI_API_KEY) {
      headers['Authorization'] = `Bearer ${HOJAI_API_KEY}`;
    }

    const response = await fetch(`${HOJAI_CLOUD_URL}/api/v1/deploy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deployRequest),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HOJAI Cloud returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Store deploy result
    job.deployResult = {
      projectId: result.projectId,
      deploymentId: result.deploymentId,
      url: result.url,
      status: result.status,
      port: result.port,
      deployedAt: new Date().toISOString()
    };

    // Done!
    job.state = CompileState.DONE;
    job.progress = 100;
    job.progressMessage = `Deployed at ${result.url}`;
    job.completedAt = new Date().toISOString();
    updateJob(jobId, job);

    return job;

  } catch (error) {
    job.state = CompileState.FAILED;
    job.error = `Deploy failed: ${error.message}`;
    job.completedAt = new Date().toISOString();
    updateJob(jobId, job);
    throw error;
  }
}

/**
 * Filter files for deployment
 * - Remove binary files (will be regenerated)
 * - Remove node_modules
 * - Remove .git
 * - Limit file size
 */
function filterDeployFiles(files) {
  const filtered = {};
  const maxFileSize = 256 * 1024; // 256KB per file
  const maxFiles = 500;

  let count = 0;
  for (const [path, content] of Object.entries(files)) {
    // Skip certain files
    if (path.includes('node_modules') || path.includes('.git')) continue;
    if (path.includes('package-lock.json')) continue;

    // Skip large files
    if (typeof content === 'string' && content.length > maxFileSize) continue;

    // Limit total files
    if (count >= maxFiles) break;

    filtered[path] = content;
    count++;
  }

  return filtered;
}

/**
 * Get deployment status from HOJAI Cloud
 */
export async function getDeployStatus(deploymentId) {
  const headers = {};
  if (HOJAI_API_KEY) {
    headers['Authorization'] = `Bearer ${HOJAI_API_KEY}`;
  }

  try {
    const response = await fetch(`${HOJAI_CLOUD_URL}/api/v1/deployments/${deploymentId}`, {
      headers,
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to get deployment status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

/**
 * List deployments from HOJAI Cloud
 */
export async function listDeployments() {
  const headers = {};
  if (HOJAI_API_KEY) {
    headers['Authorization'] = `Bearer ${HOJAI_API_KEY}`;
  }

  try {
    const response = await fetch(`${HOJAI_CLOUD_URL}/api/v1/deployments`, {
      headers,
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to list deployments: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      deployments: [],
      error: error.message
    };
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(deploymentId) {
  const headers = {};
  if (HOJAI_API_KEY) {
    headers['Authorization'] = `Bearer ${HOJAI_API_KEY}`;
  }

  try {
    const response = await fetch(`${HOJAI_CLOUD_URL}/api/v1/deployments/${deploymentId}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to delete deployment: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
