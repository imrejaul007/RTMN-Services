import { Router } from 'express';
import { createJob, getJob, getJobs, updateJob, startJob, cancelJob, queueJob } from '../training-job.js';
import { registerModel } from '../model-registry.js';

const router = Router();

router.post('/jobs', (req, res) => {
  const { name, datasetId, baseModel, config } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!datasetId) return res.status(400).json({ error: 'datasetId is required' });
  const job = createJob({ name, datasetId, baseModel, config });
  res.status(201).json(job);
});

router.get('/jobs', (req, res) => {
  const { baseModel, status, datasetId } = req.query;
  const jobs = getJobs({ baseModel, status, datasetId });
  res.json({ jobs, total: jobs.length });
});

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

router.post('/jobs/:id/start', (req, res) => {
  const job = startJob(req.params.id);
  if (!job) return res.status(400).json({ error: 'cannot start job (not draft/queued or not found)' });
  res.json({ message: 'job started', job });
});

router.post('/jobs/:id/cancel', (req, res) => {
  const job = cancelJob(req.params.id);
  if (!job) return res.status(400).json({ error: 'cannot cancel job (not found or already terminal)' });
  res.json({ message: 'job cancelled', job });
});

router.post('/jobs/:id/queue', (req, res) => {
  const job = queueJob(req.params.id);
  if (!job) return res.status(400).json({ error: 'cannot queue job (not draft or not found)' });
  res.json({ message: 'job queued', job });
});

function watchJobCompletion(jobId) {
  const check = setInterval(() => {
    const jobs = readJson('jobs');
    const job = jobs.find(j => j.id === jobId);
    if (job && (job.status === 'done' || job.status === 'failed')) {
      clearInterval(check);
      if (job.status === 'done') {
        registerModel({
          jobId: job.id,
          name: `Fine-tuned ${job.baseModel}`,
          baseModel: job.baseModel,
          status: 'ready',
          checkpointPath: job.bestCheckpoint
        });
      }
    }
  }, 500);
}

export default router;
