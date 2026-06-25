/**
 * Compile routes — POST /api/v1/compile/*
 */

import express from 'express';
import {
  createCompileJob,
  getCompileJob,
  getAllJobs,
  CompileState
} from '../compiler.js';
import { deployToCloud } from '../deploy.js';

const router = express.Router();

// Helper to update job
function updateJob(jobId, job) {
  // This is handled by the compiler module
}

// POST /api/v1/compile — Start compilation
router.post('/', async (req, res) => {
  try {
    const { blueprint, userId } = req.body;

    if (!blueprint) {
      return res.status(400).json({
        error: 'Missing blueprint',
        message: 'Please provide a company blueprint to compile'
      });
    }

    const result = createCompileJob(blueprint, userId || null);

    res.status(202).json({
      success: true,
      jobId: result.jobId,
      projectId: result.projectId,
      state: result.state,
      message: result.message,
      statusUrl: `/api/v1/compile/${result.jobId}`
    });
  } catch (error) {
    console.error('Error starting compilation:', error);
    res.status(400).json({
      error: 'Compilation failed',
      message: error.message
    });
  }
});

// GET /api/v1/compile/:id — Get compilation status
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const job = getCompileJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: `Compile job not found: ${id}`
      });
    }

    res.json({
      success: true,
      jobId: job.id,
      projectId: job.projectId,
      state: job.state,
      progress: job.progress,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      files: job.files ? Object.keys(job.files) : null,
      fileCount: job.files ? Object.keys(job.files).length : 0
    });
  } catch (error) {
    console.error('Error getting compile job:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/compile/:id/files — Get compiled files
router.get('/:id/files', (req, res) => {
  try {
    const { id } = req.params;
    const { path: filePath } = req.query;
    const job = getCompileJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: `Compile job not found: ${id}`
      });
    }

    if (!job.files) {
      return res.status(400).json({
        error: 'Files not ready',
        message: 'Compilation not complete yet'
      });
    }

    if (filePath) {
      // Return specific file
      const content = job.files[filePath];
      if (!content) {
        return res.status(404).json({
          error: 'Not found',
          message: `File not found: ${filePath}`
        });
      }
      return res.json({
        success: true,
        path: filePath,
        content
      });
    }

    // Return file list
    const files = Object.keys(job.files).map(p => ({
      path: p,
      size: typeof job.files[p] === 'string' ? job.files[p].length : null,
      type: job.files[p]?.startsWith?.('data:') ? 'binary' : 'text'
    }));

    res.json({
      success: true,
      jobId: job.id,
      fileCount: files.length,
      files
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/compile/:id/download — Download all files as tar.gz
router.get('/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const job = getCompileJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: `Compile job not found: ${id}`
      });
    }

    if (!job.files) {
      return res.status(400).json({
        error: 'Files not ready',
        message: 'Compilation not complete yet'
      });
    }

    // For now, return a JSON with all files
    // In production, this would generate a tar.gz
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${job.manifest?.name || 'project'}-files.json"`);

    res.json({
      projectName: job.manifest?.name,
      generatedAt: job.completedAt,
      files: job.files
    });
  } catch (error) {
    console.error('Error downloading files:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/v1/compile/:id/deploy — Deploy to HOJAI Cloud
router.post('/:id/deploy', async (req, res) => {
  try {
    const { id } = req.params;
    const job = getCompileJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: `Compile job not found: ${id}`
      });
    }

    if (job.state === CompileState.DONE) {
      // Already deployed
      return res.json({
        success: true,
        message: 'Already deployed',
        deployResult: job.deployResult
      });
    }

    if (job.state === CompileState.DEPLOYING) {
      // Already deploying
      return res.status(409).json({
        error: 'Deploying',
        message: 'Deployment already in progress'
      });
    }

    if (!job.files) {
      return res.status(400).json({
        error: 'Files not ready',
        message: 'Compilation not complete yet'
      });
    }

    // Start deployment
    await deployToCloud(job, null, (jobId, j) => {
      // Update function
    });

    res.json({
      success: true,
      jobId: job.id,
      state: job.state,
      deployResult: job.deployResult
    });
  } catch (error) {
    console.error('Error deploying:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message
    });
  }
});

// GET /api/v1/compile/:id/status — Poll compilation + deploy status
router.get('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const job = getCompileJob(id);

    if (!job) {
      return res.status(404).json({
        error: 'Not found',
        message: `Compile job not found: ${id}`
      });
    }

    res.json({
      success: true,
      jobId: job.id,
      state: job.state,
      progress: job.progress,
      progressMessage: job.progressMessage,
      isComplete: job.state === CompileState.COMPILING_DONE || job.state === CompileState.DONE,
      isFailed: job.state === CompileState.FAILED,
      isDeploying: job.state === CompileState.DEPLOYING,
      isDeployed: job.state === CompileState.DONE,
      error: job.error,
      deployResult: job.deployResult,
      url: job.deployResult?.url
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/compile — List all jobs
router.get('/', (req, res) => {
  try {
    const { userId, state, limit } = req.query;
    let jobs = getAllJobs();

    // Filter by user
    if (userId) {
      jobs = jobs.filter(j => j.userId === userId);
    }

    // Filter by state
    if (state) {
      jobs = jobs.filter(j => j.state === state);
    }

    // Sort by date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit
    if (limit) {
      jobs = jobs.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(j => ({
        jobId: j.id,
        projectId: j.projectId,
        state: j.state,
        progress: j.progress,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
        url: j.deployResult?.url
      }))
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
