/**
 * GENIE genie-telegram-service - Main Entry Point
 * Telegram bot integration
 * Port: 4712
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/routes.js';

const PORT = 4712;
const SERVICE_NAME = 'genie-telegram-service';
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, timestamp: new Date().toISOString() }));
app.get('/health/live', (_, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (_, res) => res.json({ status: 'ready' }));
app.use('/api', routes);
app.use((_, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }));

app.listen(PORT, () => console.log(`\n╔═══════════════════════════════╗\n║ GENIE genie-telegram-service - RUNNING\n║ Port: ${PORT}\n║ "Telegram bot integration"\n╚═══════════════════════════════╝\n`));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
export default app;
