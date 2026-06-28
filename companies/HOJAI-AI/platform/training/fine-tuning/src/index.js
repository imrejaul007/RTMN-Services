import express from 'express';
import { config } from './config.js';
import datasetsRouter from './routes/datasets.js';
import jobsRouter from './routes/jobs.js';
import modelsRouter from './routes/models.js';
import metricsRouter from './routes/metrics.js';

const APP = express();
APP.use(express.json());

APP.get('/health', (_, res) => res.json({ status: 'ok', service: 'fine-tuning-platform', port: config.port }));
APP.get('/ready', (_, res) => res.json({ ready: true }));

APP.use('/api', datasetsRouter);
APP.use('/api', jobsRouter);
APP.use('/api', modelsRouter);
APP.use('/api', metricsRouter);

APP.use((_req, res) => res.status(404).json({ error: 'not found' }));
APP.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: err.message }); });

APP.listen(config.port, () => console.log(`fine-tuning-platform listening on :${config.port}`));
export { APP };
