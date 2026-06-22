/**
 * GENIE genie-drive-connector - Main Entry Point
 * Google Drive connector
 * Port: 4726
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/routes.js';

const PORT = 4726;
const SERVICE_NAME = 'genie-drive-connector';
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, timestamp: new Date().toISOString() }));
app.get('/health/live', (_, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (_, res) => res.json({ status: 'ready' }));
app.use('/api', routes);
app.use((_, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }));

app.listen(PORT, () => console.log(`\n╔═══════════════════════════════╗\n║ GENIE genie-drive-connector - RUNNING\n║ Port: ${PORT}\n║ "Google Drive connector"\n╚═══════════════════════════════╝\n`));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
export default app;
