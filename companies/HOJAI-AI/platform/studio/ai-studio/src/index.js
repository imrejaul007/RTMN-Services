import express from 'express';
import { DATA_DIR } from './store.js';

const PORT = process.env.PORT || 4890;
const APP = express();

APP.use(express.json());

import workflowsRouter from './routes/workflows.js';
import executeRouter from './routes/execute.js';
import validateRouter from './routes/validate.js';
import historyRouter from './routes/history.js';
import exportRouter from './routes/export.js';

APP.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-studio', port: PORT, timestamp: new Date().toISOString() }));
APP.get('/ready', (_req, res) => res.json({ ready: true }));

APP.use('/api', workflowsRouter);
APP.use('/api', executeRouter);
APP.use('/api', validateRouter);
APP.use('/api', historyRouter);
APP.use('/api', exportRouter);

APP.use((_req, res) => res.status(404).json({ error: 'not found' }));
APP.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: err.message }); });

APP.listen(PORT, () => console.log(`ai-studio listening on :${PORT}`));
export { APP };
