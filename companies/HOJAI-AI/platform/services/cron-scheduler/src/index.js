/**
 * HOJAI Cron Scheduler
 * Production cron job scheduler with persistence
 */

const cron = require('node-cron');
const axios = require('axios');

class CronScheduler {
  constructor(config = {}) {
    this.jobs = new Map();
    this.db = config.database; // PostgreSQL connection
    this.webhookUrl = config.webhookUrl;
    this.timezone = config.timezone || 'Asia/Kolkata';
  }

  // Schedule a workflow
  schedule(id, schedule, workflowId, payload) {
    const job = cron.schedule(schedule, async () => {
      console.log(`[Cron] Running job ${id} for workflow ${workflowId}`);

      try {
        // Execute via webhook
        if (this.webhookUrl) {
          await axios.post(`${this.webhookUrl}/api/triggers/workflow/${workflowId}`, {
            trigger: 'cron',
            jobId: id,
            payload,
            timestamp: new Date().toISOString(),
          });
        }

        // Persist execution
        await this.logExecution(id, workflowId, 'success');
      } catch (error) {
        console.error(`[Cron] Job ${id} failed:`, error.message);
        await this.logExecution(id, workflowId, 'failed', error.message);
      }
    }, {
      timezone: this.timezone,
      scheduled: true,
    });

    this.jobs.set(id, job);
    return job;
  }

  // Persist to DB
  async logExecution(jobId, workflowId, status, error) {
    if (!this.db) return;
    try {
      await this.db.query(
        'INSERT INTO cron_executions (job_id, workflow_id, status, error, ran_at) VALUES ($1, $2, $3, $4, NOW())',
        [jobId, workflowId, status, error]
      );
    } catch (e) {
      console.error('Failed to log execution:', e.message);
    }
  }

  // List all scheduled jobs
  list() {
    const jobs = [];
    this.jobs.forEach((job, id) => {
      jobs.push({ id, status: 'active' });
    });
    return jobs;
  }

  // Pause job
  pause(id) {
    const job = this.jobs.get(id);
    if (job) job.stop();
    return !!job;
  }

  // Resume job
  resume(id) {
    const job = this.jobs.get(id);
    if (job) job.start();
    return !!job;
  }

  // Remove job
  remove(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
      return true;
    }
    return false;
  }
}

module.exports = CronScheduler;
